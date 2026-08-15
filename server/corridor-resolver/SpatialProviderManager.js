const { createLogger } = require('../utils/logger.js');
const { SpatialCache } = require('./SpatialCache.js');
const { OverpassProvider } = require('./OverpassProvider.js');
const { TopologyError } = require('../utils/errors.js');

const log = createLogger('corridor-resolver:spatial-provider-manager');

class SpatialProviderManager {
    constructor(config) {
        this.config = config;
        this.cache = new SpatialCache(config);
        this.primary = new OverpassProvider('Primary', config.overpass.primaryUrl, config);

        if (config.overpass.secondaryUrl) {
            this.secondary = new OverpassProvider('Secondary', config.overpass.secondaryUrl, config);
        }

        this.inFlightPromises = new Map();
    }

    /**
     * Resolves the single-flight key to coalesce identical concurrent geospatial queries.
     */
    _getSingleFlightKey(location, radii, schemaVersion = 'v1') {
        // Coordinates are normalized to five decimal places (~1.1m resolution).
        // This intentionally coalesces micro-movements into the exact same spatial request.
        const latKey = Number(location.lat).toFixed(5);
        const lngKey = Number(location.lng).toFixed(5);
        return `${latKey}_${lngKey}_T${radii.track}_S${radii.station}_C${radii.crossing}_${schemaVersion}`;
    }

    async fetchNearbyRailways(location, optionsOrRadius, schemaVersion = 'v1') {
        const radii = {
            track: typeof optionsOrRadius === 'object' ? optionsOrRadius.track : optionsOrRadius,
            station: typeof optionsOrRadius === 'object' ? optionsOrRadius.station : optionsOrRadius,
            crossing: typeof optionsOrRadius === 'object' ? optionsOrRadius.crossing : optionsOrRadius
        };

        const flightKey = this._getSingleFlightKey(location, radii, schemaVersion);

        // Stampede protection: coalesce identical normalized-coordinate/radius/schema requests.
        if (this.inFlightPromises.has(flightKey)) {
            log.info('COALESCED request into existing flight', { flightKey });
            return this.inFlightPromises.get(flightKey);
        }

        const executeFetch = async () => {
            // 1. Check valid fresh cache that fully contains the request
            const freshEntry = this.cache.get(location, radii, schemaVersion);
            if (freshEntry && freshEntry.freshness === 'FRESH') {
                log.info('ProviderManager: FRESH CACHE HIT');
                return { ...freshEntry.data, _isCached: true, _freshness: 'fresh', _cacheAgeSeconds: freshEntry.cacheAgeSeconds };
            }

            let lastError = null;

            // 2. Primary Provider
            if (this.primary.isHealthy()) {
                try {
                    const data = await this.primary.fetch(location, radii);
                    this.cache.set(location, radii, data, schemaVersion);
                    return { ...data, _isCached: false, _freshness: 'live' };
                } catch (err) {
                    lastError = err;
                    log.warn('ProviderManager: Primary provider failed', { error: err.message });
                }
            } else {
                log.warn('ProviderManager: Primary provider in cooldown');
            }

            // 3. Secondary Provider
            if (this.secondary && this.secondary.isHealthy()) {
                try {
                    const data = await this.secondary.fetch(location, radii);
                    this.cache.set(location, radii, data, schemaVersion);
                    log.info('ProviderManager: Secondary provider success');
                    return { ...data, _isCached: false, _freshness: 'live' };
                } catch (err) {
                    lastError = err;
                    log.warn('ProviderManager: Secondary provider failed', { error: err.message });
                }
            } else if (this.secondary) {
                log.warn('ProviderManager: Secondary provider in cooldown');
            }

            // 4. Check valid cache again that fully contains the request (Fallback after providers fail)
            const fallbackEntry = this.cache.get(location, radii, schemaVersion);
            if (fallbackEntry && (fallbackEntry.freshness === 'STALE' || fallbackEntry.freshness === 'FRESH')) {
                const freshness = fallbackEntry.freshness === 'FRESH' ? 'fresh' : 'stale';
                log.warn(`ProviderManager: ALL PROVIDERS FAILED. FALLING BACK TO CACHE [${freshness.toUpperCase()}]`, { cacheAgeSeconds: fallbackEntry.cacheAgeSeconds });
                return { ...fallbackEntry.data, _isCached: true, _freshness: freshness, _cacheAgeSeconds: fallbackEntry.cacheAgeSeconds };
            }

            // 5. Degraded State (Throw if no valid data exists)
            log.error('ProviderManager: No providers available and no valid cache. Failing request.');
            throw new TopologyError('Failed to retrieve nearby railways. All providers unavailable.', { cause: lastError });
        };

        const promise = executeFetch().finally(() => {
            this.inFlightPromises.delete(flightKey);
        });

        this.inFlightPromises.set(flightKey, promise);
        return promise;
    }
}

module.exports = { SpatialProviderManager };
