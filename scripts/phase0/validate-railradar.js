"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
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

const API_KEY = process.env.RAILRADAR_KEY;
if (!API_KEY) {
    console.error("FATAL: RAILRADAR_KEY environment variable is missing.");
    process.exit(1);
}

const CONFIG_PATH = path_1.default.join(__dirname, 'phase0.config.json');
if (!fs_1.default.existsSync(CONFIG_PATH)) {
    console.error("FATAL: phase0.config.json is missing.");
    process.exit(1);
}
const config = JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf8'));

const client = axios_1.default.create();
(0, axios_retry_1.default)(client, {
    retries: 3,
    retryDelay: axios_retry_1.default.exponentialDelay,
    retryCondition: (error) => {
        if (axios_retry_1.default.isNetworkOrIdempotentRequestError(error)) return true;
        const status = error.response?.status;
        if (status) {
            if (status === 429 || (status >= 500 && status <= 504)) return true;
            if (status >= 400 && status < 500 && status !== 429) return false;
        }
        return false;
    }
});

const LOG_DIR = path_1.default.join(__dirname, 'logs');
if (!fs_1.default.existsSync(LOG_DIR)) {
    fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
}

function logResult(filename, data) {
    const filepath = path_1.default.join(LOG_DIR, filename);
    fs_1.default.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function validateEnvelope(res) {
    if (!res || typeof res !== 'object') throw new Error("API response is not an object.");
    if (!('success' in res)) throw new Error("Envelope missing 'success' field.");
    if (!('data' in res)) throw new Error("Envelope missing 'data' field.");
    if (!('meta' in res)) throw new Error("Envelope missing 'meta' field.");
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
        } else if (val && typeof val === 'object') {
            const nestedKeys = Object.keys(val);
            console.log(`  - Object detected: payload.${key} (keys: ${nestedKeys.join(', ')})`);
        }
    }
    console.log(`-------------------------------------`);
}

const LIVE_POSITION_KEYS = ['currentLocation', 'liveLocation', 'position', 'location', 'livePosition'];

function toFiniteNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}

function extractTopologicalDataFromObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const progressVal = 'segmentProgress' in obj ? obj.segmentProgress : undefined;
    if (progressVal === undefined) return null;
    
    const segmentProgress = toFiniteNumber(progressVal);
    if (segmentProgress === null) return null;
    
    const previousStation = obj.previousStation || obj.stationCode || obj.haltCode || 'UNKNOWN';
    const nextStation = obj.nextStation || 'UNKNOWN';
    const lastUpdatedAt = obj.lastUpdatedAt || obj.updatedAt || obj.timestamp || new Date().toISOString();
    
    return { segmentProgress, previousStation, nextStation, lastUpdatedAt };
}

function findLiveTopologicalData(payload) {
    if (!payload || typeof payload !== 'object') {
        return { error: 'Payload is not an object.' };
    }
    const rootData = extractTopologicalDataFromObject(payload);
    if (rootData) return rootData;
    
    const candidates = [];
    for (const key of LIVE_POSITION_KEYS) {
        if (key in payload) {
            const c = extractTopologicalDataFromObject(payload[key]);
            if (c) candidates.push({ key, ...c });
        }
    }
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) return { error: 'Multiple topological objects found.' };
    
    const unknown = [];
    for (const key of Object.keys(payload)) {
        const c = extractTopologicalDataFromObject(payload[key]);
        if (c) unknown.push(key);
    }
    if (unknown.length === 1) return extractTopologicalDataFromObject(payload[unknown[0]]);
    if (unknown.length > 1) return { error: 'Multiple unknown objects with segmentProgress found.' };
    
    return { error: 'No object with segmentProgress found.' };
}

function enumerateArrays(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
    return Object.keys(payload)
        .filter(k => Array.isArray(payload[k]))
        .map(k => {
            const arr = payload[k];
            const sampleType = arr.length > 0 ? typeof arr[0] : 'empty';
            const objectElements = arr.length > 0 && arr[0] !== null && typeof arr[0] === 'object';
            return { key: k, length: arr.length, elementType: sampleType, objectElements };
        });
}

const summary = {
    A1: "NOT TESTED (Topological Fields Present)",
    A2: "NOT TESTED (Candidate Discovery)",
    A3: "NOT TESTED (Topological Cadence)",
    A4: "NOT TESTED (Rate limits)",
    A8: "NOT TESTED (Topological Stability)"
};

let hitRateLimit = false;
function checkRateLimit(headers) {
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    if (remaining !== undefined && parseInt(remaining, 10) === 0) {
        console.warn("\n⚠️ API Rate Limit Exhausted (remaining = 0). Halting further requests.");
        hitRateLimit = true;
    }
}

async function runValidation() {
    console.log("Starting RailAware Phase 0 Validation...\n");
    try {
        console.log("--- Validating A2: Candidate Discovery & Budgeting ---");
        let discoverySuccessCount = 0;
        for (const loc of config["discovery-locations"]) {
            console.log(`\nTesting location type: ${loc.type} (${loc.from} -> ${loc.to})`);
            if (hitRateLimit) break;
            const startTime = Date.now();
            try {
                const res = await client.get(provider_1.endpoints.trainsBetween(loc.from, loc.to), {
                    headers: provider_1.authHeaders(API_KEY)
                });
                checkRateLimit(res.headers);
                const latency = Date.now() - startTime;
                validateEnvelope(res.data);
                const envelope = res.data;
                const payload = envelope.data;
                console.log(`Success! HTTP Status: ${res.status}`);
                if (envelope.success === false) {
                    console.log(`API returned success=false.`);
                    break;
                }
                if (discoverySuccessCount === 0) {
                    inspectSchema(payload, `Discovery Payload (${loc.type})`);
                }
                let candidateCount = 0;
                let arrays;
                if (Array.isArray(payload)) {
                    candidateCount = payload.length;
                    console.log(`Payload is directly an array of ${candidateCount} items.`);
                } else {
                    arrays = enumerateArrays(payload);
                    const objectArrays = arrays.filter(a => a.objectElements);
                    if (objectArrays.length === 1) {
                        const chosen = objectArrays[0];
                        console.log(`Selected array: payload.${chosen.key}`);
                        candidateCount = chosen.length;
                    } else {
                        console.log(`Multiple or zero candidate arrays. Ambiguous schema.`);
                        summary.A2 = "UNKNOWN";
                        continue;
                    }
                }
                const budget = 1 + candidateCount;
                console.log(`Latency: ${latency}ms. Candidates found: ${candidateCount}. Estimated refresh budget: ${budget} calls.`);
                logResult(`A2_discovery_${loc.type}.json`, envelope);
                discoverySuccessCount++;
            } catch (err) {
                console.log(`Discovery failed for ${loc.type}: ${err.message}`);
            }
        }
        summary.A2 = discoverySuccessCount === 3 ? "PASS" : (discoverySuccessCount > 0 ? "PARTIAL" : "FAIL");

        async function longPollTrain(trainNumber, isMoving) {
            console.log(`\n--- Long-polling ${isMoving ? 'MOVING' : 'STATIONARY'} train ${trainNumber} ---`);
            console.log("Polling for ~25 minutes at 75-second intervals (20 polls)...");
            const responsesData = [];
            let updatesObserved = 0;
            let validFieldsFound = false;
            
            for (let i = 0; i < 20; i++) {
                if (hitRateLimit) {
                    console.log(`Stopping poll early due to rate limit exhaustion.`);
                    break;
                }
                process.stdout.write(`Poll ${i + 1}/20... `);
                try {
                    const res = await client.get(provider_1.endpoints.liveTrain(trainNumber), {
                        headers: provider_1.authHeaders(API_KEY)
                    });
                    checkRateLimit(res.headers);
                    validateEnvelope(res.data);
                    const envelope = res.data;
                    process.stdout.write(`HTTP: ${res.status} | `);
                    
                    if (envelope.success === false) {
                        console.log(`API returned success=false.`);
                        break;
                    }
                    
                    const payload = envelope.data;
                    const topoResult = findLiveTopologicalData(payload);
                    
                    if ('error' in topoResult) {
                        process.stdout.write(`No topological data — ${topoResult.error}\n`);
                        if (i === 0) break;
                    } else {
                        validFieldsFound = true;
                        process.stdout.write(`progress: ${topoResult.segmentProgress.toFixed(3)}, station: ${topoResult.previousStation}\n`);
                        
                        const newPos = { 
                            ...topoResult, 
                            localTimestamp: Date.now() 
                        };
                        
                        if (responsesData.length > 0) {
                            const last = responsesData[responsesData.length - 1];
                            if (newPos.segmentProgress !== last.segmentProgress || newPos.previousStation !== last.previousStation) {
                                updatesObserved++;
                            }
                        }
                        responsesData.push(newPos);
                    }
                    logResult(`poll_${isMoving ? 'moving' : 'stationary'}_${i + 1}.json`, envelope);
                } catch (err) {
                    process.stdout.write(`FAILED (${err.message})\n`);
                }
                
                if (i < 19 && !hitRateLimit) {
                    await new Promise(resolve => setTimeout(resolve, 75000));
                }
            }
            return { responsesData, validFieldsFound, updatesObserved };
        }

        console.log("\nStarting long-polls...");
        const [movingData, statData] = await Promise.all([
            longPollTrain(config["moving-train-number"], true),
            longPollTrain(config["stationary-train-number"], false)
        ]);

        if (movingData.validFieldsFound && statData.validFieldsFound) summary.A1 = "PASS";
        else if (movingData.validFieldsFound || statData.validFieldsFound) summary.A1 = "PARTIAL";
        else summary.A1 = "FAIL";

        if (movingData.updatesObserved > 2) summary.A3 = "PASS";
        else if (movingData.updatesObserved > 0) summary.A3 = "PARTIAL";
        else summary.A3 = "FAIL";

        summary.A4 = hitRateLimit ? "FAIL (Rate limit hit)" : "PASS";

        console.log(`\n--- Validating A8: segmentProgress Topological Stability ---`);
        let a8PassMoving = true;
        
        if (movingData.responsesData.length > 1) {
            console.log(`Moving Train Topological checks:`);
            for (let i = 1; i < movingData.responsesData.length; i++) {
                const prev = movingData.responsesData[i-1];
                const curr = movingData.responsesData[i];
                const deltaProgress = curr.segmentProgress - prev.segmentProgress;
                const deltaTime = curr.localTimestamp - prev.localTimestamp;
                
                console.log(`  Poll ${i}: station=${curr.previousStation}, prog=${curr.segmentProgress.toFixed(4)}, dP=${deltaProgress.toFixed(4)}, dT=${deltaTime}ms`);
                
                if (prev.previousStation === curr.previousStation) {
                    if (curr.segmentProgress < prev.segmentProgress && curr.segmentProgress !== 0) {
                        const regression = prev.segmentProgress - curr.segmentProgress;
                        if (regression > 0.01) {
                            a8PassMoving = false;
                            console.warn(`    FAIL: segmentProgress moved backwards beyond 1% tolerance (regression: ${regression.toFixed(4)})`);
                        } else {
                            console.log(`    WARN: Minor backward jitter (regression: ${regression.toFixed(4)}) - acceptable.`);
                        }
                    }
                }
            }
        } else {
            a8PassMoving = false;
        }
        
        let a8PassStat = true;
        if (statData.responsesData.length > 1) {
            console.log(`Stationary Train Topological checks:`);
            for (let i = 1; i < statData.responsesData.length; i++) {
                const prev = statData.responsesData[i-1];
                const curr = statData.responsesData[i];
                const deltaProgress = Math.abs(curr.segmentProgress - prev.segmentProgress);
                console.log(`  Poll ${i}: station=${curr.previousStation}, prog=${curr.segmentProgress.toFixed(4)}, dP=${deltaProgress.toFixed(4)}`);
                
                if (prev.previousStation === curr.previousStation) {
                    if (deltaProgress > 0.01) {
                        a8PassStat = false;
                        console.warn(`    FAIL: Stationary train segmentProgress jitter exceeded 1% tolerance (${deltaProgress.toFixed(4)})`);
                    }
                }
            }
        } else {
            a8PassStat = false;
        }
        
        if (movingData.responsesData.length < 2 && statData.responsesData.length < 2) {
             summary.A8 = "INSUFFICIENT DATA";
        } else {
             summary.A8 = (a8PassMoving && a8PassStat) ? "PASS" : "FAIL";
        }

        console.log(`\n=============================================================`);
        console.log(`             PHASE 0 VALIDATION SUMMARY REPORT               `);
        console.log(`=============================================================`);
        for (const [assumption, result] of Object.entries(summary)) {
            console.log(`${assumption}: ${result}`);
        }
        console.log(`=============================================================`);
        
        // Output raw data for the final report
        fs_1.default.writeFileSync(path_1.default.join(LOG_DIR, 'moving_data.json'), JSON.stringify(movingData.responsesData, null, 2));
        fs_1.default.writeFileSync(path_1.default.join(LOG_DIR, 'stationary_data.json'), JSON.stringify(statData.responsesData, null, 2));

    } catch (error) {
        console.error("Unexpected error during validation:", error);
    }
}

runValidation();
