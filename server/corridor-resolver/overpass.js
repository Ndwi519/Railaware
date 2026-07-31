Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OverpassClient = void 0;
var _index = require("../utils/index.js");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
const fs = require("node:fs");
var _stationHelper = require("./station-helper.js");
var _index2 = require("../calculations/index.js");
var _deepFreeze = require("../utils/deepFreeze.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const log = (0, _index.createLogger)('corridor-resolver:overpass');
/**
 * Maximum number of distinct grid cells held in the corridor cache.
 * At gridSizeDeg = 0.005° each cell ≈ 500 m. 1 000 cells ≈ 500 km of unique
 * travel — well above any realistic session length for a single server process.
 * Entries are evicted in insertion order (oldest first) once the cap is reached.
 */
const MAX_CACHE_SIZE = 1000;

class OverpassClient {
  config;
  cache = new Map();
  inFlightPromises = new Map();
  constructor(config) {
    this.config = config;
  }

  /**
   * Fetches railway infrastructure near the provided GPS location.
   */
  async fetchNearbyRailways(location, radiusMetres) {
    // Step 3 - Corridor Cache
    // Normalize coordinates using approximately 0.005° snapping.
    // This represents an approximately 500 m grid at Indian latitudes and varies slightly with latitude because longitude degrees shrink with cos(latitude).
    const latKey = Math.round(location.lat / this.config.gridSizeDeg) * this.config.gridSizeDeg;
    const lngKey = Math.round(location.lng / this.config.gridSizeDeg) * this.config.gridSizeDeg;
    const cacheKey = `${latKey.toFixed(4)},${lngKey.toFixed(4)},${radiusMetres}`;
    const requestId = _nodeCrypto.default.randomUUID();
    const cached = this.cache.get(cacheKey);
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        if (cached.isFailure) {
          log.info('CACHE FAILURE HIT', {
            requestId,
            cacheKey
          });
          throw new _index.TopologyError('Failed to retrieve nearby railways', {
            cause: cached.error
          });
        }
        log.info('CACHE HIT', {
          requestId,
          cacheKey
        });
        return cached.data;
      } else {
        log.info('CACHE EXPIRED', {
          requestId,
          cacheKey
        });
        this.cache.delete(cacheKey);
      }
    }
    if (this.inFlightPromises.has(cacheKey)) {
      log.info('IN-FLIGHT COALESCING HIT', {
        requestId,
        cacheKey
      });
      return await this.inFlightPromises.get(cacheKey);
    }
    log.info('CACHE MISS', {
      requestId,
      cacheKey
    });
    const executeFetch = async () => {
      const query = `
      [out:json][timeout:${Math.floor(this.config.requestTimeoutMs / 1000)}];
      (
        way["railway"="rail"](around:${radiusMetres},${location.lat},${location.lng});
        node["railway"="station"](around:${radiusMetres},${location.lat},${location.lng});
        node["railway"~"^(crossing|level_crossing)$"](around:${radiusMetres},${location.lat},${location.lng});
      );
      out body;
      >;
      out skel qt;
    `;
      for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('timeout'), this.config.requestTimeoutMs);
        const startTime = Date.now();
        let isTransientFailure = false;
        try {
          const headers = {
            'Content-Type': 'text/plain',
            'User-Agent': 'RailAware/1.0 (Production)'
          };
          const response = await fetch(this.config.url, {
            method: 'POST',
            headers,
            body: query,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const durationMs = Date.now() - startTime;
          const responseBody = await response.text();
          const responseSize = responseBody.length;
          log.info('Overpass API request completed', {
            requestId,
            timestamp: new Date().toISOString(),
            url: this.config.url,
            rawQuery: query,
            attempt,
            durationMs,
            status: response.status,
            responseSize,
            timeoutStatus: false
          });
          if (!response.ok) {
            if ([429, 502, 503, 504].includes(response.status)) {
              isTransientFailure = true;
            }
            throw new _index.TopologyError(`Overpass API responded with status ${response.status}`, {
              cause: {
                status: response.status,
                body: responseBody
              }
            });
          }
          let data;
          try {
            data = JSON.parse(responseBody);
          } catch (e) {
            isTransientFailure = true;
            throw new _index.TopologyError('Failed to parse Overpass response (likely an HTML error page)', {
              cause: e
            });
          }
          const {
            corridors,
            stations
          } = this.parseOverpassData(data);
          const resultData = (0, _deepFreeze.deepFreeze)({
            corridors,
            stations,
            elements: data.elements
          });
          if (data.elements && data.elements.length === 0) {
            this._evictIfFull();
            this.cache.set(cacheKey, {
              isFailure: false,
              data: resultData,
              expiresAt: Date.now() + this.config.cacheTtlNoCorridorMs
            });
          } else {
            this._evictIfFull();
            this.cache.set(cacheKey, {
              isFailure: false,
              data: resultData,
              expiresAt: Date.now() + this.config.cacheTtlSuccessMs
            });
          }
          return resultData;
        } catch (error) {
          clearTimeout(timeoutId);
          const durationMs = Date.now() - startTime;
          const timeoutStatus = controller.signal.aborted;
          const isAbortTimeout = controller.signal.aborted && controller.signal.reason === 'timeout';
          const isNetError = error.cause?.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.cause.code);
          if (isAbortTimeout || isNetError || error.name === 'AbortError' || error.name === 'TimeoutError') {
            isTransientFailure = true;
          }
          log.error('Overpass API request failed', {
            requestId,
            timestamp: new Date().toISOString(),
            url: this.config.url,
            rawQuery: query,
            attempt,
            durationMs,
            status: error.cause?.status || null,
            timeoutStatus,
            message: error.message,
            cause: error.cause || null,
            code: error.code || error.cause?.code || null,
            stack: error.stack,
            isTransientFailure
          });
          if (timeoutStatus) {
            log.error(`AbortController triggered timeout for requestId ${requestId}`);
          }
          if (isTransientFailure && attempt < this.config.maxAttempts) {
            const delay = this.config.retryDelaysMs[attempt] + Math.floor(Math.random() * 100);
            log.info(`Transient failure detected, retrying in ${delay}ms... (Attempt ${attempt + 1}/${this.config.maxAttempts})`, {
              requestId
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (isTransientFailure) {
            log.info('CACHE FAILURE MISS - Caching transient error', {
              requestId,
              cacheKey
            });
            this._evictIfFull();
            this.cache.set(cacheKey, {
              isFailure: true,
              error,
              expiresAt: Date.now() + this.config.cacheTtlTransientFailureMs
            });
          }
          throw new _index.TopologyError('Failed to retrieve nearby railways', {
            cause: error
          });
        }
      }
    };
    const executionPromise = executeFetch();
    this.inFlightPromises.set(cacheKey, executionPromise);
    try {
      return await executionPromise;
    } finally {
      this.inFlightPromises.delete(cacheKey);
    }
  }
  /**
   * Evicts the oldest cache entry when the cache has reached MAX_CACHE_SIZE.
   * Map preserves insertion order, so the first key is always the oldest.
   * @private
   */
  _evictIfFull() {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      // cacheSize here is the count after eviction and before the forthcoming insertion.
      log.info('CACHE EVICTION - oldest entry removed', { oldestKey, cacheSizeAfterEviction: this.cache.size });
    }
  }

  parseOverpassData(data) {
    const {
      nodes,
      ways,
      rawStations
    } = this._extractNodes(data);
    const stations = this._extractStations(rawStations);
    const corridors = this._buildCorridors(ways, nodes);
    return {
      corridors,
      stations
    };
  }
  _extractNodes(data) {
    const nodes = new Map();
    const ways = [];
    const rawStations = [];
    for (const element of data.elements) {
      if (element.type === 'node') {
        nodes.set(element.id, {
          lat: element.lat,
          lng: element.lon
        });
        if (element.tags && element.tags.railway === 'station') {
          rawStations.push(element);
        }
      } else if (element.type === 'way') {
        ways.push(element);
      }
    }
    return {
      nodes,
      ways,
      rawStations
    };
  }
  _extractStations(rawStations) {
    const stations = [];
    for (const raw of rawStations) {
      const extracted = (0, _stationHelper.extractStationFeature)(raw);
      if (extracted) {
        stations.push(extracted);
      }
    }
    return stations;
  }
  _buildCorridors(ways, nodes) {
    const corridors = [];
    for (const way of ways) {
      const points = [];
      let minLat = 90,
        maxLat = -90,
        minLng = 180,
        maxLng = -180;
      const validNodeIds = [];
      for (const nodeId of way.nodes) {
        const node = nodes.get(nodeId);
        if (node) {
          points.push(node);
          validNodeIds.push(nodeId);
          minLat = Math.min(minLat, node.lat);
          maxLat = Math.max(maxLat, node.lat);
          minLng = Math.min(minLng, node.lng);
          maxLng = Math.max(maxLng, node.lng);
        }
      }
      if (points.length > 1) {
        const cumulativeDistances = [];
        let cumulativeDistance = 0;
        for (let i = 0; i < points.length; i++) {
          if (i > 0) {
            cumulativeDistance += (0, _index2.haversineMetres)(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
          }
          cumulativeDistances.push(cumulativeDistance);
        }

        const topology = (0, _deepFreeze.deepFreeze)({
          points,
          cumulativeDistances,
          totalLengthMetres: cumulativeDistance,
          boundingBox: {
            south: minLat,
            north: maxLat,
            west: minLng,
            east: maxLng
          }
        });
        corridors.push({
          id: way.id.toString(),
          name: way.tags?.name || way.tags?.ref || `Way ${way.id}`,
          topology
        });
      }
    }
    return corridors;
  }
}
exports.OverpassClient = OverpassClient;