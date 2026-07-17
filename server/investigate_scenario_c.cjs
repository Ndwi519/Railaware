const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const { createTrain } = require('./domain/models/Train.js');
const { createStation } = require('./domain/models/Station.js');
const { createJourney } = require('./domain/models/Journey.js');

async function traceLiveIntegration() {
  console.log("=== STARTING FULL PIPELINE TRACE ===");
  
  const config = {
    overpassUrl: 'https://overpass-api.de/api/interpreter',
    railradarKey: 'test_key',
    nodeEnv: 'test'
  };

  const railAwareService = createRailAwareService(config);

  // Hook into estimateTrainAwareness via require cache manipulation
  // Wait, the module might be dynamically imported.
  // Actually, RailAwareService uses `await import('../../awareness-engine/TrainEstimator.js');`
  // We can't easily hook dynamic import without loaders.
  // Instead, let's wrap `railAwareService.riskEngine.evaluate` because it receives `observation`, `corridor` and `estimation` exactly as they were returned.
  
  let capturedObservation = null;
  let capturedCorridor = null;
  let capturedEstimation = null;
  let capturedJourney = null;

  const originalEvaluate = railAwareService.riskEngine.evaluate;
  railAwareService.riskEngine.evaluate = function(journey, observation, confidence, estimation) {
    capturedObservation = observation;
    capturedCorridor = journey ? journey.targetStation : null; // we don't have corridor here directly, but we can capture it in discovery
    capturedEstimation = estimation;
    capturedJourney = journey;
    return originalEvaluate.call(this, journey, observation, confidence, estimation);
  };
  
  let realCorridor = null;
  
  railAwareService.discoveryService.discoverTrain = async () => {
    realCorridor = { 
        resolutionStatus: 'RESOLVED',
        stationResolutionDetails: { confidence: 'HIGH' },
        stations: [
            { feature: { station: { code: 'DPA' } }, alongTrackDistanceMetres: 0 },
            { feature: { station: { code: 'JP' } }, alongTrackDistanceMetres: 10000 }
        ]
    };
    return { 
        trainTarget: '12903', 
        journey: createJourney({
            id: 'test',
            train: createTrain({ number: '12903', name: 'Test', startDate: '2026' }),
            targetStation: createStation({ code: 'JP', name: 'Jaipur' }),
            userId: 'test'
        }), 
        corridor: realCorridor, 
        discoveredTrains: [{id: '12903'}], 
        providerError: null 
    };
  };

  // INTENTIONAL MISTAKE IN MOCK FROM EARLIER RUN (to reproduce the reported anomaly):
  railAwareService.provider.getLiveTrainProgress = async () => ({
    id: '12903', 
    status: 'running', 
    // This reproduces the exact anomaly: nested object instead of string
    previousStation: { code: 'DPA' }, 
    nextStation: { code: 'JP' }, 
    segmentProgress: 0.1, 
    lastUpdatedAt: new Date().toISOString()
  });

  await railAwareService.evaluateLocation(26.9205, 75.7876);

  console.log("\n1. Complete Runtime Observation Object passed to TrainEstimator:");
  console.log(JSON.stringify(capturedObservation, null, 2));

  console.log("\n2. Complete Runtime Corridor Object passed to TrainEstimator:");
  console.log(JSON.stringify(realCorridor, null, 2));

  console.log("\n3. Exact Runtime Values Being Compared:");
  
  if (capturedObservation && capturedObservation.currentSegment) {
      const prevCodeValue = capturedObservation.currentSegment.previousStation.code;
      console.log(`previousStation.code value:`, JSON.stringify(prevCodeValue));
      console.log(`previousStation.code type:`, typeof prevCodeValue);

      const corridorStationCode = realCorridor.stations[0].feature.station.code;
      console.log(`corridorStation.feature.station.code value:`, JSON.stringify(corridorStationCode));
      console.log(`corridorStation.feature.station.code type:`, typeof corridorStationCode);

      console.log(`\nComparison: (previousStation.code === corridorStation.feature.station.code)`);
      console.log(`${JSON.stringify(prevCodeValue)} === ${JSON.stringify(corridorStationCode)} :`, prevCodeValue === corridorStationCode);
  } else {
      console.log("No currentSegment found on observation.");
  }

  console.log("\n4. Divergence Between User and Train Computation:");
  console.log("userAlongTrackDistanceMetres output:", capturedEstimation.userAlongTrackDistanceMetres);
  console.log("trainAlongTrackDistanceMetres output:", capturedEstimation.trainAlongTrackDistanceMetres);

  console.log("\nTarget Station Code lookup:");
  const targetCodeValue = capturedJourney.targetStation.code;
  console.log(`journey.targetStation.code value:`, JSON.stringify(targetCodeValue));
  const targetCorridorStationCode = realCorridor.stations[1].feature.station.code;
  console.log(`corridorStation.feature.station.code value:`, JSON.stringify(targetCorridorStationCode));
  console.log(`Comparison: ${JSON.stringify(targetCodeValue)} === ${JSON.stringify(targetCorridorStationCode)} :`, targetCodeValue === targetCorridorStationCode);

  console.log("\n=== END TRACE ===");
}

traceLiveIntegration().catch(console.error);
