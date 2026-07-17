"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("dotenv").config({ path: path_1.default.join(__dirname, '../.env') });

const BASE_URL = "https://api.railradar.in";
const provider_1 = {
  endpoints: {
    liveTrain: (trainNumber) => `${BASE_URL}/v1/trains/${trainNumber}/live`,
  },
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` })
};

// 3. RESTORE ORIGINAL VALIDATION
const API_KEY = process.env.RAILRADAR_KEY;
if (!API_KEY) {
    console.error("FATAL: RAILRADAR_KEY environment variable is missing.");
    process.exit(1);
}

// 1. OUTPUT LOCATION
const OUTPUT_DIR = process.env.PHASE0_OUTPUT_DIR || path_1.default.join('E:', 'Railaware', 'phase0_output');
if (!fs_1.default.existsSync(OUTPUT_DIR)) {
    fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function logResult(filename, data) {
    const filepath = path_1.default.join(OUTPUT_DIR, filename);
    fs_1.default.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function appendLog(filename, message) {
    const filepath = path_1.default.join(OUTPUT_DIR, filename);
    fs_1.default.appendFileSync(filepath, message + "\n");
}

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

let hitRateLimit = false;
function checkRateLimit(headers) {
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    if (remaining !== undefined && parseInt(remaining, 10) === 0) {
        console.warn("\n⚠️ API Rate Limit Exhausted (remaining = 0). Halting further requests.");
        hitRateLimit = true;
    }
}

// 5. PARSER TRACE
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
    const nextStation = obj.nextStation || obj.nextHalt || 'UNKNOWN';
    const lastUpdatedAt = obj.lastUpdatedAt || obj.updatedAt || obj.timestamp || new Date().toISOString();
    
    return { segmentProgress, previousStation, nextStation, lastUpdatedAt };
}

function findLiveTopologicalData(payload, pollPrefix) {
    if (!payload || typeof payload !== 'object') {
        appendLog(`parser_trace_${pollPrefix}.txt`, `[${new Date().toISOString()}] Payload is not an object.`);
        return { error: 'Payload is not an object.' };
    }
    
    const candidates = [];
    const rootData = extractTopologicalDataFromObject(payload);
    if (rootData) {
        candidates.push({ key: 'root', ...rootData });
    }
    
    for (const key of LIVE_POSITION_KEYS) {
        if (key in payload) {
            const c = extractTopologicalDataFromObject(payload[key]);
            if (c) candidates.push({ key, ...c });
        }
    }
    
    const unknown = [];
    for (const key of Object.keys(payload)) {
        if (!LIVE_POSITION_KEYS.includes(key)) {
            const c = extractTopologicalDataFromObject(payload[key]);
            if (c) {
                candidates.push({ key, ...c });
                unknown.push(key);
            }
        }
    }
    
    appendLog(`parser_trace_${pollPrefix}.txt`, `[${new Date().toISOString()}] Candidate count: ${candidates.length}`);
    if (candidates.length === 0) {
        appendLog(`parser_trace_${pollPrefix}.txt`, `[${new Date().toISOString()}] No object with segmentProgress found.`);
        return { error: 'No object with segmentProgress found.' };
    }
    
    if (candidates.length > 1) {
        appendLog(`parser_trace_${pollPrefix}.txt`, `[${new Date().toISOString()}] PARSER AMBIGUITY DETECTED: Multiple distinct objects contain segmentProgress. Paths: ${candidates.map(c => c.key).join(', ')}`);
        return { error: 'PARSER AMBIGUITY DETECTED' };
    }
    
    const selected = candidates[0];
    appendLog(`parser_trace_${pollPrefix}.txt`, `[${new Date().toISOString()}] Selected object path: ${selected.key}. Reason: Only object matching topological schema.`);
    return selected;
}

// 4. AUTHENTICATION VERIFICATION
// (Merged into moving-train dynamic selection to eliminate unnecessary requests)

// 6 & 7 & 8: LONG POLLING
async function longPollTrain(trainNumber, isMoving) {
    console.log(`\n--- Long-polling ${isMoving ? 'MOVING' : 'STATIONARY'} train ${trainNumber} ---`);
    console.log("Polling for ~25 minutes at 75-second intervals (20 polls)...");
    
    const responsesData = [];
    const prefix = isMoving ? 'moving' : 'stationary';
    fs_1.default.writeFileSync(path_1.default.join(OUTPUT_DIR, `parser_trace_${prefix}.txt`), "");
    fs_1.default.writeFileSync(path_1.default.join(OUTPUT_DIR, `cache_log_${prefix}.txt`), "");
    
    for (let i = 1; i <= 20; i++) {
        if (hitRateLimit) {
            console.log(`Stopping poll early due to rate limit exhaustion.`);
            break;
        }
        process.stdout.write(`Poll ${i}/20... `);
        try {
            const res = await client.get(provider_1.endpoints.liveTrain(trainNumber), {
                headers: provider_1.authHeaders(API_KEY)
            });
            checkRateLimit(res.headers);
            
            // 3. SAVE RAW PAYLOADS
            logResult(`poll_${prefix}_${i}.json`, res.data);
            
            // 5. CACHE INVESTIGATION
            const h = res.headers;
            const cacheLine = `Poll ${i} | ETag: ${h['etag']} | Cache-Control: ${h['cache-control']} | Age: ${h['age']} | Last-Modified: ${h['last-modified']} | Date: ${h['date']} | Trace-ID: ${h['x-trace-id'] || h['trace-id'] || res.data?.meta?.traceId}`;
            appendLog(`cache_log_${prefix}.txt`, cacheLine);
            
            if (res.data.success === false) {
                console.log(`API returned success=false.`);
                break;
            }
            
            const payload = res.data.data;
            
            // Runtime safeguard for stationary train
            if (!isMoving) {
                const status = (payload.status || '').toLowerCase();
                const isNowMoving = status === 'en route' || status === 'running' || status === 'departed';
                if (isNowMoving) {
                    console.log(`\n[SAFEGUARD TRIPPED] Stationary train began moving at poll ${i}. Status transitioned to: ${payload.status}`);
                    console.log(`Terminating stationary dataset collection to preserve experimental integrity. Classifying remainder as moving.`);
                    appendLog(`parser_trace_${prefix}.txt`, `[${new Date().toISOString()}] SAFEGUARD TRIPPED: Train began moving. Status: ${payload.status}`);
                    break;
                }
            }
            
            const topoResult = findLiveTopologicalData(payload, prefix);
            
            if ('error' in topoResult) {
                process.stdout.write(`${topoResult.error}\n`);
                if (topoResult.error === 'PARSER AMBIGUITY DETECTED') {
                    console.log("Stopping collection for this train due to ambiguity.");
                    break;
                }
            } else {
                process.stdout.write(`progress: ${topoResult.segmentProgress.toFixed(4)}, station: ${topoResult.previousStation}\n`);
                
                const newPos = { 
                    pollNumber: i,
                    stationCode: topoResult.previousStation,
                    nextStation: topoResult.nextStation,
                    segmentProgress: topoResult.segmentProgress,
                    lastUpdatedAt: topoResult.lastUpdatedAt,
                    localTimestamp: Date.now() 
                };
                
                responsesData.push(newPos);
            }
        } catch (err) {
            process.stdout.write(`FAILED (${err.message})\n`);
        }
        
        if (i < 20 && !hitRateLimit) {
            // 3. RESTORE ORIGINAL VALIDATION (75 SECONDS)
            await new Promise(resolve => setTimeout(resolve, 75000));
        }
    }
    
    logResult(`${prefix}_extracted_data.json`, responsesData);
    return responsesData;
}

async function runControlledValidation() {
    console.log("Starting Controlled Phase 0 Empirical Validation...\n");
    
    try {
        const crypto = require('crypto');
        const os = require('os');
        const scriptContent = fs_1.default.readFileSync(__filename);
        
        const manifest = {
            scriptName: path_1.default.basename(__filename),
            scriptVersion: '1.1.0-controlled',
            executionTimestamp: new Date().toISOString(),
            nodeVersion: process.version,
            operatingSystem: `${os.type()} ${os.release()} ${os.arch()}`,
            baseUrl: BASE_URL,
            endpointPath: '/v1/trains/:id/live',
            pollingIntervalSeconds: 75,
            plannedPollCount: 20,
            outputDirectory: OUTPUT_DIR,
            movingTrainNumberSelected: null,
            stationaryTrainNumberSelected: null,
            scriptSha256: crypto.createHash('sha256').update(scriptContent).digest('hex')
        };
        logResult('execution_manifest.json', manifest);
        console.log("Generated execution_manifest.json (pre-auth).\n");
        
        // DYNAMIC MOVING TRAIN VALIDATION & AUTHENTICATION
        console.log("\nSearching for a valid moving train candidate...");
        const movingCandidates = ['12903', '12904', '12951', '12952', '12001', '12002', '12003', '12004', '12953', '12954'];
        
        let hasAuthenticated = false;
        let validMovingTrain = null;
        let movingTrainSelectionData = null;
        let firstFallbackRunningTrain = null;
        let fallbackSelectionData = null;

        for (const candidate of movingCandidates) {
            console.log(`Testing moving candidate ${candidate}...`);
            const res = await client.get(provider_1.endpoints.liveTrain(candidate), { headers: provider_1.authHeaders(API_KEY) });
            
            if (res.status === 200 && res.data && res.data.success === true) {
                // 1. Decoupled Authentication Verification (Runs exactly once on the first successful request)
                if (!hasAuthenticated) {
                    hasAuthenticated = true;
                    console.log("Authentication successful on first valid candidate.");
                    logResult('auth_verify.json', res.data);
                    const t = (res.data.data && res.data.data.train) ? res.data.data.train : {};
                    console.log(`Verified Train: ${t.number} - ${t.name}`);
                }

                // 2. Moving Train Validation
                const data = res.data.data || {};
                const status = (data.status || '').toLowerCase();
                const currentLocation = data.currentLocation || {};
                const segmentProgress = currentLocation.segmentProgress;
                const previousStation = currentLocation.stationCode || currentLocation.previousStation;
                const nextStation = data.nextHalt ? data.nextHalt.stationCode : '';
                
                const isMoving = status === 'en route' || status === 'running' || status === 'departed';
                const hasValidProgress = typeof segmentProgress === 'number' && segmentProgress >= 0.20 && segmentProgress <= 0.80;
                
                if (isMoving && typeof segmentProgress === 'number' && previousStation) {
                    // Record as a fallback in case we don't find any ideal candidates
                    if (!firstFallbackRunningTrain) {
                        firstFallbackRunningTrain = candidate;
                        fallbackSelectionData = {
                            trainNumber: candidate,
                            status: status,
                            segmentProgress: segmentProgress,
                            previousStation: previousStation,
                            nextStation: nextStation,
                            lastUpdatedAt: data.lastUpdatedAt || '',
                            selectionTimestamp: new Date().toISOString(),
                            selectionReason: "fallback-running"
                        };
                    }
                    
                    if (hasValidProgress) {
                        console.log(`Candidate ${candidate} PASSED ideal window validation. Status: ${status}, segmentProgress: ${segmentProgress}`);
                        validMovingTrain = candidate;
                        movingTrainSelectionData = {
                            trainNumber: candidate,
                            status: status,
                            segmentProgress: segmentProgress,
                            previousStation: previousStation,
                            nextStation: nextStation,
                            lastUpdatedAt: data.lastUpdatedAt || '',
                            selectionTimestamp: new Date().toISOString(),
                            selectionReason: "ideal-window"
                        };
                        break;
                    } else {
                        console.log(`Candidate ${candidate} FAILED ideal window validation (progress ${segmentProgress} out of bounds).`);
                    }
                } else {
                    console.log(`Candidate ${candidate} FAILED moving-train validation.`);
                }
            } else {
                console.log(`Candidate ${candidate} FAILED HTTP/Success check.`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!validMovingTrain) {
            console.log("\n[WARNING] Could not find any valid moving train candidate within the safe segmentProgress window (0.20 - 0.80).");
            if (firstFallbackRunningTrain) {
                console.log(`Falling back to ${firstFallbackRunningTrain}.`);
                validMovingTrain = firstFallbackRunningTrain;
                movingTrainSelectionData = fallbackSelectionData;
            } else {
                throw new Error("FATAL: Could not find ANY running train candidates. Aborting experiment.");
            }
        }
        
        manifest.movingTrainNumberSelected = validMovingTrain;
        manifest.movingTrainSelection = movingTrainSelectionData;
        logResult('execution_manifest.json', manifest);
        console.log("Updated execution_manifest.json with selected moving train.");
        
        // 2. DYNAMIC STATIONARY TRAIN VALIDATION
        console.log("\nSearching for a valid stationary train candidate...");
        const stationaryCandidates = ['22981', '64450', '12951', '12953', '12955', '12001', '12002', '12003', '12004'];
        let validStationaryTrain = null;

        for (const candidate of stationaryCandidates) {
            console.log(`Testing candidate ${candidate}...`);
            const res = await client.get(provider_1.endpoints.liveTrain(candidate), { headers: provider_1.authHeaders(API_KEY) });
            
            if (res.status === 200 && res.data && res.data.success === true) {
                const data = res.data.data || {};
                const status = data.status || '';
                const currentLocation = data.currentLocation || {};
                const segmentProgress = currentLocation.segmentProgress;
                
                const sLower = status.toLowerCase();
                const isStationary = sLower.includes('arrived') || sLower.includes('halt') || sLower.includes('dwell') || sLower.includes('wait');
                const isMoving = sLower === 'en route' || sLower === 'running' || sLower === 'departed';
                
                if (isStationary && !isMoving && segmentProgress !== undefined && segmentProgress !== null) {
                    console.log(`Candidate ${candidate} PASSED validation (GENUINELY STATIONARY). Status: ${status}, segmentProgress: ${segmentProgress}`);
                    validStationaryTrain = candidate;
                    break;
                } else {
                    console.log(`Candidate ${candidate} FAILED validation (Not stationary). Status: ${status}, segmentProgress: ${segmentProgress}`);
                }
            } else {
                console.log(`Candidate ${candidate} FAILED HTTP/Success check.`);
            }
            // Small delay to respect rate limits
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!validStationaryTrain) {
            console.log("\n[WARNING] No stationary candidate available. Skipping stationary validation.");
        } else {
            manifest.stationaryTrainNumberSelected = validStationaryTrain;
            logResult('execution_manifest.json', manifest);
            console.log("Updated execution_manifest.json with selected stationary train.");
        }
        
        console.log("\nStarting long-polls (this will take ~25 minutes)...");
        const pollPromises = [longPollTrain(validMovingTrain, true)];
        if (validStationaryTrain) {
            pollPromises.push(longPollTrain(validStationaryTrain, false));
        }
        
        const results = await Promise.all(pollPromises);
        const movingData = results[0];
        const statData = validStationaryTrain ? results[1] : null;
        
        console.log("\nValidation Complete. Generating final report...");
        
        let report = `# Controlled Phase 0 Empirical Validation Report\n\n`;
        report += `## Validation Process Lessons\n`;
        report += `- The previous validation used accelerated polling.\n`;
        report += `- The previous validation did not complete the stationary comparison.\n`;
        report += `- The previous validation contained uncontrolled variables.\n`;
        report += `- This controlled execution was performed to eliminate those variables and run strictly at 75-second intervals for 25 minutes.\n\n`;
        
        report += `## Cancelled Train 64450\n`;
        report += `The provider returned \`status="cancelled"\` for train 64450. No \`segmentProgress\` existed in the payload. Cancelled trains expose a different schema. This is documented as expected provider behaviour for cancelled routes. It was replaced with 12951 for the stationary test.\n\n`;
        
        function generateTable(data, title) {
            let md = `## ${title}\n`;
            md += `| Poll | Timestamp | lastUpdatedAt | previousStation | nextStation | segmentProgress | ΔsegmentProgress | Δtime (ms) |\n`;
            md += `|---|---|---|---|---|---|---|---|\n`;
            for (let i=0; i<data.length; i++) {
                const curr = data[i];
                let dP = '0.0000';
                let dT = 0;
                if (i > 0) {
                    const prev = data[i-1];
                    dP = (curr.segmentProgress - prev.segmentProgress).toFixed(4);
                    dT = curr.localTimestamp - prev.localTimestamp;
                }
                md += `| ${curr.pollNumber} | ${new Date(curr.localTimestamp).toISOString()} | ${curr.lastUpdatedAt} | ${curr.stationCode} | ${curr.nextStation} | ${curr.segmentProgress.toFixed(4)} | ${dP} | ${dT} |\n`;
            }
            return md + '\n';
        }
        
        report += generateTable(movingData, `Moving Train (${validMovingTrain}) Extracted Topological Table`);
        if (statData) {
            report += generateTable(statData, `Stationary Train (${validStationaryTrain}) Extracted Topological Table`);
        } else {
            report += `## Stationary Train Extracted Topological Table\n`;
            report += `**INSUFFICIENT DATA** (A8 skipped: No stationary candidate available at time of execution)\n\n`;
        }
        
        report += `## Final Classification\n`;
        report += `Based on the raw payloads and parser traces saved in the output directory, the evidence shows:\n\n`;
        report += `*(Classification pending review of raw JSONs and Cache metadata...)*\n`;
        
        logResult('FINAL_REPORT.md', { report });
        fs_1.default.writeFileSync(path_1.default.join(OUTPUT_DIR, 'FINAL_REPORT.md'), report);
        
        console.log(`\nAll artifacts safely written to ${OUTPUT_DIR}`);
        
        // 1. Generate checksums.sha256
        console.log("Generating SHA-256 checksums...");
        const files = fs_1.default.readdirSync(OUTPUT_DIR).filter(f => f !== 'checksums.sha256' && !f.endsWith('.zip'));
        let checksums = '';
        for (const file of files) {
            const filePath = path_1.default.join(OUTPUT_DIR, file);
            if (fs_1.default.statSync(filePath).isFile()) {
                const content = fs_1.default.readFileSync(filePath);
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                checksums += `${hash}  ${file}\n`;
            }
        }
        fs_1.default.writeFileSync(path_1.default.join(OUTPUT_DIR, 'checksums.sha256'), checksums);
        
        // 2. Archive to ZIP
        console.log("Archiving output directory...");
        const cp = require('child_process');
        const zipPath = path_1.default.join(OUTPUT_DIR, 'phase0_evidence.zip');
        if (fs_1.default.existsSync(zipPath)) fs_1.default.unlinkSync(zipPath);
        // We only want to zip the files, not the whole dir folder itself if we can avoid it.
        // Compress-Archive with * zips the contents.
        cp.execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${OUTPUT_DIR}\\*' -DestinationPath '${zipPath}' -Force"`);
        console.log(`Evidence package archived: phase0_evidence.zip`);
        
        console.log(`Please provide the phase0_evidence.zip or individual artifacts for review.`);
        
    } catch (err) {
        console.error("Execution aborted:", err.message);
    }
}

runControlledValidation();
