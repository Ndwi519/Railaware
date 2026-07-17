const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const { createTrain } = require('./domain/models/Train.js');
const { createStation } = require('./domain/models/Station.js');
const { createJourney } = require('./domain/models/Journey.js');
const { createProviderSnapshot } = require('./domain/models/ProviderSnapshot.js');
const { estimateTrainAwareness } = require('./awareness-engine/TrainEstimator.js');

async function traceScenarioC() {
  console.log("=== TRACE SCENARIO C START ===");
  
  const config = {
    overpassUrl: 'https://overpass-api.de/api/interpreter',
    railradarKey: 'test_key',
    nodeEnv: 'test'
  };

  const railAwareService = createRailAwareService(config);

  // 1. Mock Provider Output (simulating what getLiveTrainProgress returns)
  const providerOutput = {
    id: '12903', 
    status: 'running', 
    previousStation: 'DPA', 
    nextStation: 'JP', 
    segmentProgress: 0.1, 
    lastUpdatedAt: new Date().toISOString()
  };
  
  console.log("\n1. Provider Output:");
  console.log(JSON.stringify(providerOutput, null, 2));

  // 2. Mock RailAwareService mapping to rawJson (from RailAwareService.js lines 193-203)
  const rawJson = providerOutput ? {
    train: { number: providerOutput.id },
    status: providerOutput.status,
    currentLocation: {
      previousStation: providerOutput.previousStation,
      nextStation: providerOutput.nextStation,
      segmentProgress: providerOutput.segmentProgress
    },
    lastUpdatedAt: providerOutput.lastUpdatedAt
  } : {};
  
  const snapshot = createProviderSnapshot({
    id: `snap-${Date.now()}`,
    rawJson,
    metadata: { httpStatusCode: 200 },
    capturedAt: new Date()
  });

  console.log("\n2. Provider Snapshot (rawJson):");
  console.log(JSON.stringify(snapshot.rawJson, null, 2));

  // 3. Provider Interpreter Output
  let observation = null;
  try {
    observation = railAwareService.interpreter.interpret(snapshot);
  } catch(e) {
    console.error("Interpreter Error:", e);
  }

  console.log("\n3. Observation Object (output of Interpreter):");
  console.log(JSON.stringify(observation, null, 2));

  // 4. Journey and Corridor Objects
  const journey = createJourney({
    id: 'test',
    train: createTrain({ number: '12903', name: 'Test', startDate: '2026' }),
    targetStation: createStation({ code: 'JP', name: 'Jaipur' }),
    userId: 'test'
  });

  const corridor = { 
    resolutionStatus: 'RESOLVED',
    stationResolutionDetails: { confidence: 'HIGH' },
    stations: [
      { feature: { station: { code: 'DPA' } }, alongTrackDistanceMetres: 0 },
      { feature: { station: { code: 'JP' } }, alongTrackDistanceMetres: 10000 }
    ]
  };

  console.log("\n4. Corridor Object:");
  console.log(JSON.stringify(corridor, null, 2));

  // 5. Train Estimator Input and Lookup
  console.log("\n5. Train Estimator Inputs:");
  console.log("- journey.targetStation.code:", journey.targetStation.code);
  
  const hasCurrentSegment = !!observation.currentSegment;
  console.log("- observation.currentSegment exists:", hasCurrentSegment);
  if (hasCurrentSegment) {
      console.log("- observation.currentSegment.previousStation.code:", observation.currentSegment.previousStation.code);
      console.log("- observation.currentSegment.nextStation?.code:", observation.currentSegment.nextStation ? observation.currentSegment.nextStation.code : null);
  }
  
  console.log("\n6. Train Estimator Execution:");
  const estimation = estimateTrainAwareness(journey, observation, corridor);
  console.log(JSON.stringify(estimation, null, 2));

  console.log("=== TRACE SCENARIO C END ===");
}

traceScenarioC().catch(console.error);
