const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { loadEnv } = require('./config/env.js');

const config = loadEnv();

const service = createRailAwareService(config);

const locations = {
  NDLS: { lat: 28.6429, lng: 77.2191 },
  DLI: { lat: 28.6616, lng: 77.2272 },
  NZM: { lat: 28.5886, lng: 77.2533 },
  ANVT: { lat: 28.6275, lng: 77.3188 },
  CNB: { lat: 26.4542, lng: 80.3421 },
  BCT: { lat: 18.9696, lng: 72.8193 },
  MMCT: { lat: 18.9697, lng: 72.8194 },
  CSMT: { lat: 18.9398, lng: 72.8354 }
};

async function verify() {
  console.log("==========================================");
  console.log("RAILAWARE REAL-WORLD VERIFICATION UTILITY");
  console.log("==========================================\n");

  for (const [name, coords] of Object.entries(locations)) {
    console.log(`Testing Location: ${name} [${coords.lat}, ${coords.lng}]`);
    const startTime = Date.now();
    
    try {
      const result = await service.evaluateLocation(coords.lat, coords.lng);
      const executionTime = Date.now() - startTime;
      
      const trace = result.metadata?.executionTrace;
      const diagnostics = result.metadata?.diagnostics;
      
      const trackFound = trace?.stages.some(s => s.stage === 'Corridor Resolution' && s.status === 'SUCCESS') || false;
      const corridorId = result.corridor?.name || null;
      const stationStatus = diagnostics?.stationResolution?.status || 'UNRESOLVED';
      const trainsFound = result.trains?.length || 0;
      const riskLevel = result.risk?.level || 'UNKNOWN';
      const finalStage = trace?.stages[trace.stages.length - 1];

      console.log(`- Track Found: ${trackFound}`);
      console.log(`- Corridor Found: ${corridorId}`);
      console.log(`- Station Resolution Result: ${stationStatus}`);
      if (diagnostics?.stationResolution?.attempts) {
        diagnostics.stationResolution.attempts.forEach(a => {
          console.log(`  > Strategy Attempt: ${a.strategy} => ${a.success ? 'SUCCESS' : 'FAILED'} (${a.reason})`);
        });
      }
      
      console.log(`- Provider Requests: ${diagnostics?.providerRequests?.length || 0}`);
      if (diagnostics?.providerRequests) {
        diagnostics.providerRequests.forEach(req => {
          console.log(`  > ${req.endpoint} => ${req.status} (${req.responseSummary})`);
        });
      }
      
      console.log(`- Train Discovery Result: Found ${trainsFound} trains`);
      console.log(`- Risk Result: ${riskLevel}`);
      console.log(`- Execution Time: ${executionTime}ms`);
      
      if (finalStage) {
        console.log(`- Final Stage: ${finalStage.stage} (${finalStage.status}) => ${finalStage.reason}`);
      }
      
      console.log("\n------------------------------------------\n");
    } catch (e) {
      console.log(`ERROR testing ${name}: ${e.message}\n`);
    }
  }
}

verify().catch(console.error);
