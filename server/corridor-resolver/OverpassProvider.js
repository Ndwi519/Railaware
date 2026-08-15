const { createLogger } = require('../utils/logger.js');
const { extractStationFeature } = require('./station-helper.js');
const { haversineMetres } = require('../calculations/index.js');
const { deepFreeze } = require('../utils/deepFreeze.js');
const { TopologyError } = require('../utils/errors.js');

const log = createLogger('corridor-resolver:overpass-provider');

class OverpassProvider {
    constructor(name, url, config) {
        this.name = name;
        this.url = url;
        this.config = config;

        this.health = {
            consecutiveFailures: 0,
            lastFailure: null,
            lastSuccess: null,
            cooldownUntil: 0
        };
    }

    isHealthy() {
        if (this.health.cooldownUntil > Date.now()) {
            return false;
        }
        return true;
    }

    _recordSuccess() {
        this.health.consecutiveFailures = 0;
        this.health.lastSuccess = Date.now();
        this.health.cooldownUntil = 0;
    }

    _recordFailure(category) {
        this.health.consecutiveFailures += 1;
        this.health.lastFailure = Date.now();

        // Cooldown if not a logic error but a capacity/network/malformed issue
        if (category === 'HTTP_429' || category === 'HTTP_5XX' || category === 'TIMEOUT' || category === 'NETWORK_FAILURE' || category === 'MALFORMED_RESPONSE') {
            const cooldownMs = this.config.overpass.providerCooldownMs !== undefined ? this.config.overpass.providerCooldownMs : 60000;
            let backoffMs;

            if (category === 'HTTP_429') {
                // Retain existing immediate/exponential cooldown for 429
                backoffMs = cooldownMs * Math.min(Math.pow(2, this.health.consecutiveFailures - 1), 5);
            } else if (this.health.consecutiveFailures === 1) {
                // First transient failure: short 5-second cooldown
                backoffMs = Math.min(5000, cooldownMs);
            } else {
                // Second and subsequent consecutive transient failures: exponential cooldown
                backoffMs = cooldownMs * Math.min(Math.pow(2, this.health.consecutiveFailures - 2), 5);
            }

            this.health.cooldownUntil = Date.now() + backoffMs;
            log.warn(`Provider [${this.name}] entered cooldown for ${backoffMs}ms due to ${category}`);
        }
    }

    async fetch(location, radii) {
        if (!this.isHealthy()) {
            throw new TopologyError(`Provider [${this.name}] is in cooldown.`);
        }

        const query = `
      [out:json][timeout:${Math.floor(this.config.overpass.requestTimeoutMs / 1000)}];
      (
        way["railway"="rail"](around:${radii.track},${location.lat},${location.lng});
        node["railway"="station"](around:${radii.station},${location.lat},${location.lng});
        node["railway"~"^(crossing|level_crossing)$"](around:${radii.crossing},${location.lat},${location.lng});
      );
      out body;
      >;
      out skel qt;
    `;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('timeout'), this.config.overpass.requestTimeoutMs);
        const startTime = Date.now();

        try {
            const headers = {
                'Content-Type': 'text/plain',
                'User-Agent': 'RailAware/1.0 (Production)'
            };

            const response = await fetch(this.url, {
                method: 'POST',
                headers,
                body: query,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const durationMs = Date.now() - startTime;

            if (!response.ok) {
                const responseBody = await response.text().catch(() => '');
                let category = 'HTTP_ERROR';
                if (response.status === 429) category = 'HTTP_429';
                else if (response.status >= 500) category = 'HTTP_5XX';

                throw new TopologyError(`Provider [${this.name}] returned ${response.status}`, {
                    cause: { status: response.status, body: responseBody, category }
                });
            }

            const responseBody = await response.text();
            let data;
            try {
                data = JSON.parse(responseBody);
            } catch (e) {
                throw new TopologyError(`Provider [${this.name}] returned malformed JSON`, { cause: { category: 'MALFORMED_RESPONSE', error: e } });
            }

            if (!data.elements) {
                throw new TopologyError(`Provider [${this.name}] returned missing elements array`, { cause: { category: 'MALFORMED_RESPONSE' } });
            }

            this._recordSuccess();

            log.info(`Provider [${this.name}] success`, { durationMs, responseSize: responseBody.length });

            const parsed = this.parseOverpassData(data);
            return deepFreeze(parsed);

        } catch (error) {
            clearTimeout(timeoutId);
            log.warn(`Provider [${this.name}] failure details`, {
                url: this.url,
                timeoutMs: this.config.overpass.requestTimeoutMs,
                errorName: error.name,
                errorMessage: error.message,
                errorCause: error.cause
            });
            let category = 'NETWORK_FAILURE';
            if (controller.signal.aborted && controller.signal.reason === 'timeout') {
                category = 'TIMEOUT';
            } else if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                category = 'TIMEOUT';
            } else if (error.cause && error.cause.category) {
                category = error.cause.category;
            } else if (error.context && error.context.cause && error.context.cause.category) {
                category = error.context.cause.category;
            }

            // Record exactly once
            this._recordFailure(category);

            throw new TopologyError(`Provider [${this.name}] fetch failed: ${category}`, { cause: error, category });
        }
    }

    parseOverpassData(data) {
        const { nodes, ways, rawStations } = this._extractNodes(data);
        const stations = this._extractStations(rawStations);
        const corridors = this._buildCorridors(ways, nodes);
        return { corridors, stations, elements: data.elements };
    }

    _extractNodes(data) {
        const nodes = new Map();
        const ways = [];
        const rawStations = [];
        for (const element of data.elements) {
            if (element.type === 'node') {
                nodes.set(element.id, { lat: element.lat, lng: element.lon });
                if (element.tags && element.tags.railway === 'station') {
                    rawStations.push(element);
                }
            } else if (element.type === 'way') {
                ways.push(element);
            }
        }
        return { nodes, ways, rawStations };
    }

    _extractStations(rawStations) {
        const stations = [];
        for (const raw of rawStations) {
            const extracted = extractStationFeature(raw);
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
            let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
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
                        cumulativeDistance += haversineMetres(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
                    }
                    cumulativeDistances.push(cumulativeDistance);
                }

                const topology = deepFreeze({
                    points,
                    cumulativeDistances,
                    totalLengthMetres: cumulativeDistance,
                    boundingBox: { south: minLat, north: maxLat, west: minLng, east: maxLng }
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

module.exports = { OverpassProvider };
