const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { loadEnv } = require('./config/env.js');
const { createLogger } = require('./utils/logger.js');
const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const path = require('path');
const dotenv = require('dotenv');
const { createSpatialAwarenessService } = require('./application/services/createSpatialAwarenessService.js');
const { SpatialProviderManager } = require('./corridor-resolver/SpatialProviderManager.js');
const { DEFAULT_THRESHOLDS } = require('./config/thresholds.js');
const scheduleCache = require('./application/services/ScheduleCorridorCache.js');
const { RailRadarProvider } = require('./provider/railradar.js');

// Resolve the root .env file located one directory up
dotenv.config({ path: path.join(__dirname, '../.env') });

const log = createLogger('api:server');

async function startServer() {
  try {
    const config = loadEnv();
    const app = express();

    app.set('trust proxy', 1);

    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: [
            "'self'",
            "https://railradar.in",
            "https://overpass-api.de"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https://tile.openstreetmap.org"
          ],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        }
      }
    }));

    app.use(cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json({ limit: '10kb' }));
    app.use(morgan('combined'));

    const healthLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const observationLimiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const devLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: config.nodeEnv === 'production' ? 0 : 50,
      message: 'Developer endpoints disabled in production',
    });

    app.get('/', (req, res) => {
      res.json({
        message: 'RailAware API Server is running.',
        frontendUrl: 'http://localhost:5173'
      });
    });

    app.get('/api/v1/health', healthLimiter, (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Initialize shared SpatialProviderManager
    const sharedProviderManager = config.overpassClient || new SpatialProviderManager(config);
    config.overpassClient = sharedProviderManager;

    // Instantiate the singleton application service
    const railAwareService = createRailAwareService(config);
    const spatialAwarenessService = createSpatialAwarenessService({
      overpassClient: sharedProviderManager,
      thresholds: { DEFAULT_THRESHOLDS }
    });
    const ApplicationMapper = require('./application/mappers/ApplicationMapper.js');

    /**
     * PROTOTYPE SESSION STORAGE
     * - Sessions exist only in memory
     * - Sessions disappear after process restart
     * - Sessions are not shared across server instances
     * - Bounded LRU eviction removes inactive sessions when limit (default 1000) is reached
     * - This is prototype infrastructure only
     */
    app.post('/api/v1/observation', observationLimiter, async (req, res) => {
      let sessionId = req.headers['x-session-id'] || req.body.sessionId;
      if (!sessionId) {
        sessionId = crypto.randomUUID();
      }
      res.setHeader('x-session-id', sessionId);

      const { lat, lng } = req.body;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: 'Invalid location parameters' });
      }

      const location = { lat, lng, sessionId };
      log.info('Incoming observation request delegated to RailAwareService', { location });

      try {
        const response = await railAwareService.evaluateLocation(sessionId, lat, lng);
        const mappedResponse = ApplicationMapper.toObservationResponse(response);
        res.json(mappedResponse);
      } catch (error) {
        log.error('Observation pipeline failed', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    app.post('/api/v1/awareness', observationLimiter, async (req, res) => {
      const { lat, lng } = req.body;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: 'Invalid location parameters' });
      }

      try {
        const result = await spatialAwarenessService.getNearbyAwareness({ lat, lng });
        res.json(result);
      } catch (error) {
        log.error('Awareness pipeline failed', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    const scheduleLimiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const scheduleProvider = new RailRadarProvider(config);

    const scheduleResponseCache = new Map();
    const SCHEDULE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
    const MAX_SCHEDULE_CACHE_SIZE = 500;

    function _evictScheduleCacheIfFull() {
      if (scheduleResponseCache.size >= MAX_SCHEDULE_CACHE_SIZE) {
        const oldestKey = scheduleResponseCache.keys().next().value;
        scheduleResponseCache.delete(oldestKey);
        log.info('SCHEDULE CACHE EVICTION - oldest entry removed', { oldestKey, cacheSizeAfterEviction: scheduleResponseCache.size });
      }
    }

    app.get('/api/v1/schedule/corridor/:corridorId', scheduleLimiter, async (req, res) => {
      const { corridorId } = req.params;

      const now = Date.now();
      const cachedResponse = scheduleResponseCache.get(corridorId);
      if (cachedResponse && (now - cachedResponse.timestamp) < SCHEDULE_CACHE_TTL_MS) {
         const response = { ...cachedResponse.data };
         if (config.nodeEnv !== 'production') {
            response.cacheInfo = {
               hit: true,
               ttlRemainingSeconds: Math.round((SCHEDULE_CACHE_TTL_MS - (now - cachedResponse.timestamp)) / 1000)
            };
         }
         return res.json(response);
      }

      const stations = scheduleCache.get(corridorId);
      if (!stations) {
        return res.json({
          scheduledServices: [],
          status: "no_scheduled_services",
          reason: "corridor_not_found_or_unbounded"
        });
      }

      try {
        const trains = await scheduleProvider.discoverNearbyTrains(stations.from, stations.to);

        const scheduledServices = trains.map(t => ({
          trainNumber: t.id,
          trainName: t.name || 'UNKNOWN',
          scheduledDeparture: {
            station: stations.from,
            time: t.departure || 'UNKNOWN'
          },
          scheduledArrival: {
            station: stations.to,
            time: t.arrival || 'UNKNOWN'
          },
          source: {
            type: "published_timetable",
            live: false
          }
        }));

        const response = {
          corridorId,
          retrievedAt: new Date().toISOString(),
          scheduledServices,
          status: scheduledServices.length > 0 ? "success" : "no_scheduled_services"
        };

        _evictScheduleCacheIfFull();
        scheduleResponseCache.set(corridorId, { timestamp: Date.now(), data: response });

        if (config.nodeEnv !== 'production') {
          response.cacheInfo = { hit: false, ttlRemainingSeconds: SCHEDULE_CACHE_TTL_MS / 1000 };
        }

        res.json(response);
      } catch (error) {
        log.error('Schedule pipeline failed', error);
        res.json({
          scheduledServices: [],
          status: "unavailable",
          reason: "provider_error"
        });
      }
    });
    // ==========================================
    // PHASE 4 EVALUATION FRAMEWORK ROUTES
    // ==========================================
    if (config.nodeEnv !== 'production') {
      const evaluationRouter = require('./evaluation-framework/api/evaluationRouter.js');
      app.use('/api/v1/evaluation', evaluationRouter);
      log.info('Evaluation Router mounted for Development/CI.');
    } else {
      log.info('Evaluation Router disabled in production.');
    }

    // ==========================================
    // PHASE 0 DEVELOPER DIAGNOSTICS: PROBE ENDPOINTS
    // ==========================================
    const fs = require('fs').promises;
    const path = require('path');

    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        log.warn('Failed to create logs directory', err);
      }
    }

    const probeRailRadar = async (url, res, filename) => {
      const startTime = Date.now();
      try {
        log.info('Probing RailRadar', { url });

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.railradarKey}`,
            'Accept': 'application/json'
          }
        });

        const durationMs = Date.now() - startTime;

        let body;
        const text = await response.text();
        try {
          body = JSON.parse(text);
        } catch (e) {
          body = text; // fallback to text if not json
        }

        const probeData = {
          url,
          status: response.status,
          durationMs,
          headers: Object.fromEntries(response.headers.entries()),
          body
        };

        log.info('Probe completed', { status: response.status, durationMs });

        // Save to file
        await fs.writeFile(path.join(logsDir, filename), JSON.stringify(probeData, null, 2));

        res.status(response.status >= 200 && response.status < 300 ? 200 : response.status).json(probeData);
      } catch (error) {
        log.error('Probe failed', error);
        res.status(500).json({ error: error.message });
      }
    };

    app.post('/api/v1/dev/probe/live-train', devLimiter, async (req, res) => {
      const { trainNumber } = req.body;
      if (!trainNumber || typeof trainNumber !== 'string') return res.status(400).json({ error: 'trainNumber required and must be a string' });
      await probeRailRadar(`https://api.railradar.in/v1/trains/${trainNumber}/live`, res, 'railradar-live-response.json');
    });

    app.post('/api/v1/dev/probe/train-details', devLimiter, async (req, res) => {
      const { trainNumber } = req.body;
      if (!trainNumber || typeof trainNumber !== 'string') return res.status(400).json({ error: 'trainNumber required and must be a string' });
      await probeRailRadar(`https://api.railradar.in/v1/trains/${trainNumber}`, res, 'train-details.json');
    });

    app.post('/api/v1/dev/probe/train-route', devLimiter, async (req, res) => {
      const { trainNumber } = req.body;
      if (!trainNumber || typeof trainNumber !== 'string') return res.status(400).json({ error: 'trainNumber required and must be a string' });
      await probeRailRadar(`https://api.railradar.in/v1/trains/${trainNumber}/route`, res, 'train-route.json');
    });


    const server = app.listen(config.port, () => {
      log.info(`RailAware API Server running on port ${config.port}`, { env: config.nodeEnv });
    });

    const shutdown = () => {
      log.info('Received shutdown signal. Closing HTTP server...');
      server.close(() => {
        log.info('HTTP server closed. Process exiting.');
        process.exit(0);
      });
      // Force exit after 10 seconds if connections are still hanging
      setTimeout(() => {
        log.error('Forcing shutdown due to pending connections');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    log.error('Failed to start API server', error);
    process.exit(1);
  }
}

startServer();
