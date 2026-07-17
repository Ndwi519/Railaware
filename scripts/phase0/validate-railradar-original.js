"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const turf = __importStar(require("@turf/turf"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BASE_URL = "https://api.railradar.in";
const provider_1 = {
  endpoints: {
    liveTrain: (trainNumber) => `${BASE_URL}/v1/trains/${trainNumber}/live`,
    trainsBetween: (fromStationCode, toStationCode) => `${BASE_URL}/v1/trains/between/${fromStationCode}/${toStationCode}`,
  },
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` })
};
// Ensure the API key is passed via environment variables (Security Rule)
const API_KEY = process.env.RAILRADAR_KEY;
if (!API_KEY) {
    console.error("FATAL: RAILRADAR_KEY environment variable is missing.");
    console.error("Please set your sandbox or production key as an environment variable before running this script.");
    process.exit(1);
}
// Load config
const CONFIG_PATH = path_1.default.join(__dirname, 'phase0.config.json');
if (!fs_1.default.existsSync(CONFIG_PATH)) {
    console.error("FATAL: phase0.config.json is missing.");
    process.exit(1);
}
const config = JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf8'));
// -----------------------------------------------------------------------------
// Selective Retry Logic (Implementation of User Request #4)
// -----------------------------------------------------------------------------
const client = axios_1.default.create();
(0, axios_retry_1.default)(client, {
    retries: 3,
    retryDelay: axios_retry_1.default.exponentialDelay,
    retryCondition: (error) => {
        if (axios_retry_1.default.isNetworkOrIdempotentRequestError(error)) {
            return true;
        }
        const status = error.response?.status;
        if (status) {
            if (status === 429 || (status >= 500 && status <= 504)) {
                return true;
            }
            if (status >= 400 && status < 500 && status !== 429) {
                return false;
            }
        }
        return false;
    }
});
const LOG_DIR = path_1.default.join(__dirname, 'phase0', 'logs');
if (!fs_1.default.existsSync(LOG_DIR)) {
    fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
}
function logResult(filename, data) {
    const filepath = path_1.default.join(LOG_DIR, filename);
    fs_1.default.writeFileSync(filepath, JSON.stringify(data, null, 2));
}
function validateEnvelope(res) {
    if (!res || typeof res !== 'object')
        throw new Error("API response is not an object.");
    if (!('success' in res))
        throw new Error("Envelope missing 'success' field.");
    if (!('data' in res))
        throw new Error("Envelope missing 'data' field.");
    if (!('meta' in res))
        throw new Error("Envelope missing 'meta' field.");
}
function inspectSchema(payload, context) {
    console.log(`\n--- Schema Inspection: ${context} ---`);
    if (!payload || typeof payload !== 'object') {
        console.log(`Payload is not an object. Type: ${typeof payload}`);
        return;
    }
    const keys = Object.keys(payload);
    console.log(`Top-level keys: ${keys.join(', ')}`);
    for (const key of keys) {
        const val = payload[key];
        if (Array.isArray(val)) {
            console.log(`  - Array detected: payload.${key} (length: ${val.length})`);
        }
        else if (val && typeof val === 'object') {
            const nestedKeys = Object.keys(val);
            console.log(`  - Object detected: payload.${key} (keys: ${nestedKeys.join(', ')})`);
            for (const nKey of nestedKeys) {
                const nVal = val[nKey];
                if (Array.isArray(nVal)) {
                    console.log(`      -> Array: payload.${key}.${nKey} (length: ${nVal.length})`);
                }
                else if (nVal && typeof nVal === 'object') {
                    console.log(`      -> Object: payload.${key}.${nKey} (keys: ${Object.keys(nVal).join(', ')})`);
                }
            }
        }
    }
    console.log(`-------------------------------------`);
}
// Known keys that represent the live train object in RailRadar responses.
// This list is built solely from observed API responses — never invent entries.
const LIVE_POSITION_KEYS = ['currentLocation', 'liveLocation', 'position', 'location', 'livePosition'];
// Extract a numeric value from a string or number, rejecting NaN.
function toFiniteNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}
// Extract coordinates from a SINGLE flat object — no recursion.
// Only accepts objects that have both a lat-like and a lng-like key.
function extractCoordsFromObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj))
        return null;
    const latVal = 'lat' in obj ? obj.lat : ('latitude' in obj ? obj.latitude : undefined);
    const lngVal = 'lng' in obj ? obj.lng : ('longitude' in obj ? obj.longitude : undefined);
    if (latVal === undefined || lngVal === undefined)
        return null;
    const lat = toFiniteNumber(latVal);
    const lng = toFiniteNumber(lngVal);
    if (lat === null || lng === null)
        return null;
    return { lat, lng, path: 'obj' };
}
// Find coordinates ONLY inside the live-train sub-object of the payload.
// Returns null and explains why if the live-train object cannot be uniquely identified.
function findLiveCoords(payload) {
    if (!payload || typeof payload !== 'object') {
        return { error: 'Payload is not an object.' };
    }
    // Step 1: check if coordinates sit at the payload root itself
    const rootCoords = extractCoordsFromObject(payload);
    if (rootCoords) {
        console.log(`  Coordinates found at payload root.`);
        return { lat: rootCoords.lat, lng: rootCoords.lng };
    }
    // Step 2: look for a well-known live-position sub-object
    const candidates = [];
    for (const key of LIVE_POSITION_KEYS) {
        if (key in payload) {
            const c = extractCoordsFromObject(payload[key]);
            if (c) {
                console.log(`  Candidate coordinate object: payload.${key} -> lat=${c.lat}, lng=${c.lng}`);
                candidates.push({ key, lat: c.lat, lng: c.lng });
            }
        }
    }
    if (candidates.length === 1) {
        console.log(`  Selected coordinate source: payload.${candidates[0].key} (only candidate).`);
        return { lat: candidates[0].lat, lng: candidates[0].lng };
    }
    if (candidates.length > 1) {
        const names = candidates.map(c => c.key).join(', ');
        return { error: `Multiple coordinate objects found (${names}). Cannot determine which is the live train position without more data.` };
    }
    // Step 3: no known key worked — report all top-level object keys that contain lat/lng
    const unknown = [];
    for (const key of Object.keys(payload)) {
        const c = extractCoordsFromObject(payload[key]);
        if (c)
            unknown.push(`payload.${key} (lat=${c.lat}, lng=${c.lng})`);
    }
    if (unknown.length === 1) {
        const key = Object.keys(payload).find(k => extractCoordsFromObject(payload[k]));
        const c = extractCoordsFromObject(payload[key]);
        console.log(`  Coordinate source: payload.${key} (sole object with lat/lng — not a known live-position key; verify manually).`);
        return { lat: c.lat, lng: c.lng };
    }
    if (unknown.length > 1) {
        return { error: `Multiple objects with lat/lng found (${unknown.join(', ')}). Cannot determine which represents the live train position.` };
    }
    return { error: `No object with lat/lng fields found anywhere in the payload top-level. Available keys: ${Object.keys(payload).join(', ')}` };
}
function enumerateArrays(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        return [];
    return Object.keys(payload)
        .filter(k => Array.isArray(payload[k]))
        .map(k => {
        const arr = payload[k];
        const sampleType = arr.length > 0 ? typeof arr[0] : 'empty';
        const objectElements = arr.length > 0 && arr[0] !== null && typeof arr[0] === 'object';
        return { key: k, length: arr.length, elementType: sampleType, objectElements };
    });
}
// Summary Tracker
const summary = {
    A1: "NOT TESTED",
    A2: "NOT TESTED",
    A3: "NOT TESTED",
    A4: "NOT TESTED",
    A5: "NOT TESTED (Manual field testing required)",
    A6: "NOT TESTED (Corridor Resolver mapping logic)",
    A7: "NOT TESTED",
    A8: "NOT TESTED (Topological interpolation requirement)"
};
// Rate Limit Tracking
let hitRateLimit = false;
function checkRateLimit(headers) {
    // Check common rate limit headers. Adjust if RailRadar uses a specific one.
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    if (remaining !== undefined && parseInt(remaining, 10) === 0) {
        console.warn("\n⚠️ API Rate Limit Exhausted (remaining = 0). Halting further requests.");
        hitRateLimit = true;
    }
}
async function runValidation() {
    console.log("Starting RailAware Phase 0 Validation...\n");
    try {
        // -------------------------------------------------------------------------
        // Validate A2: Candidate train discovery across 3 location types
        // -------------------------------------------------------------------------
        console.log("--- Validating A2: Candidate Discovery & Budgeting ---");
        let discoverySuccessCount = 0;
        for (const loc of config["discovery-locations"]) {
            console.log(`\nTesting location type: ${loc.type} (${loc.from} -> ${loc.to})`);
            if (hitRateLimit)
                break;
            const startTime = Date.now();
            try {
                const res = await client.get(provider_1.endpoints.trainsBetween(loc.from, loc.to), {
                    headers: (0, provider_1.authHeaders)(API_KEY)
                });
                checkRateLimit(res.headers);
                const latency = Date.now() - startTime;
                validateEnvelope(res.data);
                const envelope = res.data;
                const payload = envelope.data;
                console.log(`Success! HTTP Status: ${res.status}`);
                console.log(`Envelope success: ${envelope.success}`);
                console.log(`Envelope meta: ${JSON.stringify(envelope.meta)}`);
                if (envelope.success === false) {
                    console.log(`API returned success=false. Payload: ${JSON.stringify(envelope, null, 2)}`);
                    break; // Fail fast for discovery
                }
                if (discoverySuccessCount === 0) {
                    inspectSchema(payload, `Discovery Payload (${loc.type})`);
                }
                let candidateCount = 0;
                // Evidence-driven array discovery — never silently pick the first array.
                let arrays;
                if (Array.isArray(payload)) {
                    // Entire payload is the list
                    candidateCount = payload.length;
                    console.log(`Payload is directly an array of ${candidateCount} items.`);
                }
                else {
                    arrays = enumerateArrays(payload);
                    console.log(`\nArrays found in discovery payload:`);
                    if (arrays.length === 0) {
                        console.log(`  None.`);
                        console.log(`FAILED to locate any array in discovery payload. Dumping to logs.`);
                        logResult(`${loc.type}_failed_schema.json`, envelope);
                        summary.A2 = "UNKNOWN — schema not yet determined";
                        break;
                    }
                    for (const a of arrays) {
                        console.log(`  - payload.${a.key}: length=${a.length}, elementType=${a.elementType}, objectElements=${a.objectElements}`);
                    }
                    const objectArrays = arrays.filter(a => a.objectElements);
                    if (objectArrays.length === 0) {
                        console.log(`No arrays with object elements found. Cannot identify train list. Dumping to logs.`);
                        logResult(`${loc.type}_failed_schema.json`, envelope);
                        summary.A2 = "UNKNOWN — no object-element array found";
                        break;
                    }
                    if (objectArrays.length > 1) {
                        const names = objectArrays.map(a => `payload.${a.key} (len=${a.length})`).join(', ');
                        console.log(`Multiple candidate arrays: ${names}. Cannot determine train array. Marking A2 UNKNOWN.`);
                        summary.A2 = "UNKNOWN — multiple candidate arrays: " + names;
                        logResult(`${loc.type}_ambiguous_arrays.json`, envelope);
                        discoverySuccessCount++; // endpoint responded but schema ambiguous
                        continue;
                    }
                    // Exactly one object-element array — use it with explanation
                    const chosen = objectArrays[0];
                    console.log(`Selected array: payload.${chosen.key} (sole object-element array).`);
                    candidateCount = chosen.length;
                }
                const budget = 1 + candidateCount; // 1 discovery + N status calls
                console.log(`Latency: ${latency}ms. Candidates found: ${candidateCount}. Estimated refresh budget: ${budget} calls.`);
                logResult(`A2_discovery_${loc.type}.json`, envelope);
                discoverySuccessCount++;
            }
            catch (err) {
                console.log(`Discovery failed for ${loc.type}: ${err.message}`);
            }
        }
        summary.A2 = discoverySuccessCount === 3 ? "PASS" : (discoverySuccessCount > 0 ? "PARTIAL" : "FAIL");
        // -------------------------------------------------------------------------
        // Validate A1, A3, A4, A7: Long-poll Live Train Position Helper
        // -------------------------------------------------------------------------
        async function longPollTrain(trainNumber, isMoving) {
            console.log(`\n--- Long-polling ${isMoving ? 'MOVING' : 'STATIONARY'} train ${trainNumber} ---`);
            console.log("Polling for ~25 minutes at 75-second intervals (20 polls)...");
            const positions = [];
            let updatesObserved = 0;
            let validCoordsFound = false;
            for (let i = 0; i < 20; i++) {
                if (hitRateLimit) {
                    console.log(`Stopping poll early due to rate limit exhaustion.`);
                    break;
                }
                process.stdout.write(`Poll ${i + 1}/20... `);
                try {
                    const res = await client.get(provider_1.endpoints.liveTrain(trainNumber), {
                        headers: (0, provider_1.authHeaders)(API_KEY)
                    });
                    checkRateLimit(res.headers);
                    validateEnvelope(res.data);
                    const envelope = res.data;
                    process.stdout.write(`HTTP: ${res.status} | success: ${envelope.success} | `);
                    if (envelope.success === false) {
                        console.log(`\nAPI returned success=false. Error Payload: ${JSON.stringify(envelope, null, 2)}`);
                        console.log(`Failing fast on this train to save quota.`);
                        break;
                    }
                    const payload = envelope.data;
                    if (i === 0) {
                        inspectSchema(payload, `Live Train Polling (${isMoving ? 'Moving' : 'Stationary'})`);
                    }
                    const coordResult = findLiveCoords(payload);
                    if ('error' in coordResult) {
                        process.stdout.write(`No coords — ${coordResult.error}\n`);
                        if (i === 0) {
                            console.log(`Failing fast: coordinate schema unknown after first response. Saving payload to logs.`);
                            logResult(`poll_${isMoving ? 'moving' : 'stationary'}_schema_failure.json`, envelope);
                            break;
                        }
                    }
                    else {
                        validCoordsFound = true;
                        const { lat, lng } = coordResult;
                        process.stdout.write(`Coords: [${lat}, ${lng}]\n`);
                        const newPos = { lat, lng, timestamp: Date.now() };
                        // Check cadence/updates using haversine distance
                        if (positions.length > 0) {
                            const last = positions[positions.length - 1];
                            const p1 = turf.point([last.lng, last.lat]);
                            const p2 = turf.point([lng, lat]);
                            const distance = turf.distance(p1, p2, { units: 'meters' });
                            if (distance > config["noise-threshold-meters"]) {
                                updatesObserved++;
                            }
                        }
                        positions.push(newPos);
                    }
                    logResult(`poll_${isMoving ? 'moving' : 'stationary'}_${i + 1}.json`, envelope);
                }
                catch (err) {
                    process.stdout.write(`FAILED (${err.message})\n`);
                }
                if (i < 19 && !hitRateLimit) {
                    await new Promise(resolve => setTimeout(resolve, 75000));
                }
            }
            return { positions, validCoordsFound, updatesObserved };
        }
        // Run long-polls concurrently to stay within 50 req limit (3 + 20 + 20 = 43 calls)
        console.log("\nStarting both long-polls concurrently to save time and fit within API limits...");
        const [movingData, statData] = await Promise.all([
            longPollTrain(config["moving-train-number"], true),
            longPollTrain(config["stationary-train-number"], false)
        ]);
        // Evaluate A1 (Coordinates)
        if (movingData.validCoordsFound && statData.validCoordsFound)
            summary.A1 = "PASS";
        else if (movingData.validCoordsFound || statData.validCoordsFound)
            summary.A1 = "PARTIAL";
        else
            summary.A1 = "FAIL";
        // Evaluate A3 (Cadence)
        if (movingData.updatesObserved > 2)
            summary.A3 = "PASS"; // Meaningful updates over 25m
        else if (movingData.updatesObserved > 0)
            summary.A3 = "PARTIAL";
        else
            summary.A3 = "FAIL";
        // Evaluate A4 (Rate limits)
        summary.A4 = hitRateLimit ? "FAIL (Rate limit hit during test)" : "PASS";
        // Evaluate A7 (Bearing Variance & Noise)
        console.log(`\n--- Validating A7: Bearing Variance & GPS Noise ---`);
        let a7Pass = true;
        let validBearingCount = 0;
        // Check moving train variance
        if (movingData.positions.length >= 2) {
            let maxVariance = 0;
            let lastBearing = null;
            console.log(`Moving Train Bearing checks:`);
            for (let i = 1; i < movingData.positions.length; i++) {
                const p1 = turf.point([movingData.positions[i - 1].lng, movingData.positions[i - 1].lat]);
                const p2 = turf.point([movingData.positions[i].lng, movingData.positions[i].lat]);
                const distance = turf.distance(p1, p2, { units: 'meters' });
                if (distance <= config["noise-threshold-meters"]) {
                    console.log(`  P${i - 1}->P${i}: Skipped (distance ${distance.toFixed(2)}m <= noise threshold)`);
                    continue; // Skip bearing calculation for jitter
                }
                const bearing = turf.bearing(p1, p2);
                validBearingCount++;
                console.log(`  P${i - 1}->P${i}: Dist=${distance.toFixed(2)}m, Bearing=${bearing.toFixed(2)}°`);
                if (lastBearing !== null) {
                    const variance = Math.abs(bearing - lastBearing);
                    // Normalize variance (e.g. 350 and 10 is a variance of 20)
                    const normVariance = variance > 180 ? 360 - variance : variance;
                    if (normVariance > maxVariance)
                        maxVariance = normVariance;
                }
                lastBearing = bearing;
            }
            if (maxVariance > config["bearing-variance-fail-threshold-degrees"]) {
                a7Pass = false;
                console.warn(`  FAIL: Moving train bearing variance (${maxVariance.toFixed(1)}°) exceeded threshold.`);
            }
        }
        else {
            a7Pass = false;
        }
        // Check stationary train noise
        if (statData.positions.length >= 2) {
            let maxDistance = 0;
            console.log(`Stationary Train Noise checks:`);
            for (let i = 1; i < statData.positions.length; i++) {
                const p1 = turf.point([statData.positions[i - 1].lng, statData.positions[i - 1].lat]);
                const p2 = turf.point([statData.positions[i].lng, statData.positions[i].lat]);
                const distance = turf.distance(p1, p2, { units: 'meters' });
                if (distance > maxDistance)
                    maxDistance = distance;
            }
            console.log(`  Max jitter distance: ${maxDistance.toFixed(2)}m`);
            if (maxDistance > config["noise-threshold-meters"]) {
                a7Pass = false;
                console.warn(`  FAIL: Stationary train jitter (${maxDistance.toFixed(1)}m) exceeded threshold.`);
            }
        }
        else {
            a7Pass = false;
        }
        if (validBearingCount === 0) {
            summary.A7 = "INSUFFICIENT DATA (no real movement observed — train may have been delayed/stationary)";
        }
        else {
            summary.A7 = a7Pass ? "PASS" : "FAIL";
        }
        // Evaluate A8 (Topological segmentProgress monotonic and stable)
        console.log(`\n--- Validating A8: segmentProgress Interpolation ---`);
        if (responses.length > 1) {
            let monotonic = true;
            for (let i = 1; i < responses.length; i++) {
                const prev = responses[i-1].currentLocation;
                const curr = responses[i].currentLocation;
                if (prev && curr && prev.stationCode === curr.stationCode) {
                    if (curr.segmentProgress < prev.segmentProgress && curr.segmentProgress !== 0) {
                        monotonic = false;
                        console.warn(`  FAIL: segmentProgress moved backwards from ${prev.segmentProgress} to ${curr.segmentProgress}`);
                    }
                }
            }
            if (monotonic) {
                console.log(`  PASS: segmentProgress is monotonic for station segments`);
                summary.A8 = "PASS";
            } else {
                summary.A8 = "FAIL";
            }
        } else {
             summary.A8 = "INSUFFICIENT DATA (Requires multiple samples)";
        }
        
        // -------------------------------------------------------------------------
        // Final Summary Report
        // -------------------------------------------------------------------------
        console.log(`\n=============================================================`);
        console.log(`             PHASE 0 VALIDATION SUMMARY REPORT               `);
        console.log(`=============================================================`);
        for (const [assumption, result] of Object.entries(summary)) {
            console.log(`${assumption}: ${result}`);
        }
        console.log(`=============================================================`);
        console.log(`Raw logs saved to: ${LOG_DIR}`);
    }
    catch (error) {
        console.error("Unexpected error during validation:", error);
    }
}
// Execute
runValidation();
