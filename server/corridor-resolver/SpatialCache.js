const { createLogger } = require('../utils/logger.js');
const haversineModule = require('../calculations/haversine.js');

const log = createLogger('corridor-resolver:spatial-cache');

const EARTH_RADIUS_M = 6378137;

function calculateBoundingBox(lat, lng, maxRadiusM) {
    const latDelta = (maxRadiusM / EARTH_RADIUS_M) * (180 / Math.PI);
    const lngDelta = (maxRadiusM / (EARTH_RADIUS_M * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);

    return {
        south: lat - latDelta,
        north: lat + latDelta,
        west: lng - lngDelta,
        east: lng + lngDelta
    };
}

class SpatialCache {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.maxEntries = config.overpass.cacheMaxEntries !== undefined ? config.overpass.cacheMaxEntries : 1000;
        this.ttlMs = config.overpass.cacheTtlSuccessMs !== undefined ? config.overpass.cacheTtlSuccessMs : 1800000;
        this.maxAgeMs = config.overpass.cacheMaxAgeMs !== undefined ? config.overpass.cacheMaxAgeMs : 86400000;
    }

    /**
     * Finds a valid cache entry that completely covers the requested area.
     */
    get(location, radii, schemaVersion = 'v1') {
        const reqMaxRadius = Math.max(radii.track, radii.station, radii.crossing);
        const reqBox = calculateBoundingBox(location.lat, location.lng, reqMaxRadius);

        for (const [key, entry] of this.cache.entries()) {
            if (entry.schemaVersion !== schemaVersion) continue;

            // Check Bounding Box Containment
            const coversBox =
                entry.coverage.south <= reqBox.south &&
                entry.coverage.north >= reqBox.north &&
                entry.coverage.west <= reqBox.west &&
                entry.coverage.east >= reqBox.east;

            if (!coversBox) continue;

            // Check Strict Circular Containment (since Overpass uses around:radius)
            const d = haversineModule.haversineMetres(location.lat, location.lng, entry.query.lat, entry.query.lng);

            const coversTrack = d + radii.track <= entry.query.trackRadius;
            const coversStation = d + radii.station <= entry.query.stationRadius;
            const coversCrossing = d + radii.crossing <= entry.query.crossingRadius;

            if (coversTrack && coversStation && coversCrossing) {
                const now = Date.now();
                const ageMs = now - entry.fetchedAt;

                if (ageMs > this.maxAgeMs) {
                    this.cache.delete(key);
                    log.info('CACHE EXPIRED (removed)', { key, ageSeconds: ageMs / 1000 });
                    continue;
                }

                const freshness = ageMs <= this.ttlMs ? 'FRESH' : 'STALE';

                // TRUE LRU: delete and re-insert to move to the end of the Map (most recently used)
                this.cache.delete(key);
                this.cache.set(key, entry);

                log.info(`CACHE HIT [${freshness}]`, { key, ageSeconds: ageMs / 1000 });
                return { ...entry, freshness, cacheAgeSeconds: Math.floor(ageMs / 1000) };
            }
        }

        return null;
    }

    set(location, radii, data, schemaVersion = 'v1') {
        const reqMaxRadius = Math.max(radii.track, radii.station, radii.crossing);
        const coverage = calculateBoundingBox(location.lat, location.lng, reqMaxRadius);

        const latKey = Math.round(location.lat / this.config.overpass.gridSizeDeg) * this.config.overpass.gridSizeDeg;
        const lngKey = Math.round(location.lng / this.config.overpass.gridSizeDeg) * this.config.overpass.gridSizeDeg;

        // Include precise coordinates in key to avoid collisions on exact same grid cell but different actual fetch locations
        const key = `${latKey.toFixed(4)},${lngKey.toFixed(4)}_${location.lat.toFixed(5)},${location.lng.toFixed(5)}_T${radii.track}_S${radii.station}_C${radii.crossing}_${schemaVersion}`;

        // Only evict if this is a genuinely new key being added
        if (!this.cache.has(key)) {
            this._evictIfFull();
        }

        const entry = {
            fetchedAt: Date.now(),
            schemaVersion,
            coverage,
            query: {
                lat: location.lat,
                lng: location.lng,
                trackRadius: radii.track,
                stationRadius: radii.station,
                crossingRadius: radii.crossing
            },
            data
        };

        this.cache.set(key, entry);
        log.info('CACHE SET', { key });
        return key;
    }

    _evictIfFull() {
        if (this.cache.size >= this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            log.info('CACHE EVICTION', { oldestKey, size: this.cache.size });
        }
    }
}

module.exports = { SpatialCache, calculateBoundingBox };
