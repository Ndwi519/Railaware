const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const { RailRadarProvider } = require('./provider/railradar.js');
const { ProviderError } = require('./utils/index.js');
const assert = require('assert');

// Mock Configuration
const config = { overpassUrl: 'http://localhost', railradarKey: 'test' };
const service = createRailAwareService(config);

// Override discovery to avoid Overpass/OSM real calls for this test
service.discoveryService.discoverTrain = async (lat, lng) => {
  const { createTrain } = require('./domain/models/Train.js');
  const { createStation } = require('./domain/models/Station.js');
  const { createJourney } = require('./domain/models/Journey.js');

  const targetStation = createStation({ code: 'TARGET', name: 'Target' });
  const journey = createJourney({
    id: 'j-1',
    train: createTrain({ number: '12345', name: 'Test', startDate: '2026' }),
    targetStation,
    userId: 'test'
  });

  return {
    trainTarget: '12345',
    journey,
    corridor: { resolutionStatus: 'RESOLVED', nearestBoundingStations: { from: 'SRC', to: 'TARGET' } },
    discoveredTrains: [{ id: '12345', name: 'Test' }],
    providerError: null
  };
};

async function runTests() {
  let defects = [];

  const runScenario = async (name, setupMock, expectedChecks) => {
    console.log(`Running scenario: ${name}`);

    // Clear history between tests to avoid state leakage
    await service.store.clear();

    setupMock();

    try {
      const result = await service.evaluateLocation(0, 0);
      expectedChecks(result);
      console.log(`[PASS] ${name}`);
    } catch (e) {
      console.error(`[FAIL] ${name}: ${e.message}`);
      defects.push({ scenario: name, error: e.message });
    }
  };

  const originalGetLive = service.provider.getLiveTrainProgress.bind(service.provider);

  // 1. Running Train
  await runScenario('Running Train', () => {
    service.provider.getLiveTrainProgress = async () => ({
      id: '12345', status: 'running', previousStation: 'SRC', nextStation: 'TARGET', segmentProgress: 0.5, lastUpdatedAt: new Date().toISOString()
    });
  }, (res) => {
    assert(res.observation.status === 'running');
    assert(res.risk.level === 'imminent'); // Next station is target
  });

  // 2. Cancelled Train
  await runScenario('Cancelled Train', () => {
    service.provider.getLiveTrainProgress = async () => ({
      id: '12345', status: 'cancelled', previousStation: 'SRC', nextStation: 'TARGET', segmentProgress: 0.5, lastUpdatedAt: new Date().toISOString()
    });
  }, (res) => {
    assert(res.observation.status === 'cancelled');
    assert(res.risk.level === 'safe');
  });

  // 3. Missing segmentProgress
  await runScenario('Missing segmentProgress', () => {
    service.provider.getLiveTrainProgress = async () => ({
      id: '12345', status: 'running', previousStation: 'SRC', nextStation: 'TARGET', segmentProgress: null, lastUpdatedAt: new Date().toISOString()
    });
  }, (res) => {
    assert(res.observation.segmentProgress === null);
    // Missing segment progress drops confidence to MEDIUM.
    // High/Medium with train approaching target remains IMMINENT.
    assert(res.risk.level === 'imminent');
  });

  // 4. Missing previousStation (Topology missing)
  await runScenario('Missing previousStation', () => {
    service.provider.getLiveTrainProgress = async () => ({
      id: '12345', status: 'running', previousStation: null, nextStation: null, segmentProgress: null, lastUpdatedAt: new Date().toISOString()
    });
  }, (res) => {
    assert(res.observation.previousStation === null);
    // Execution path:
    //   previousStation: null -> interpreter produces currentSegment: null
    //   service saves the current observation before reading history
    //   ConfidenceEngine sees missing topology and returns MEDIUM
    //   RiskEngine reaches currentSegment == null and returns UNKNOWN
    assert(res.risk.level === 'unknown');
  });

  // 5. Unknown provider status
  await runScenario('Unknown provider status', () => {
    service.provider.getLiveTrainProgress = async () => ({
      id: '12345', status: 'derailed', previousStation: 'SRC', nextStation: 'TARGET', segmentProgress: 0.5, lastUpdatedAt: new Date().toISOString()
    });
  }, (res) => {
    assert(res.observation.status === 'unknown');
    assert(res.risk.level === 'unknown'); // Unknown status -> Unknown confidence -> Unknown risk
  });

  // 6. Malformed provider payload
  await runScenario('Malformed provider payload', () => {
    service.provider.getLiveTrainProgress = async () => {
      throw new ProviderError('Malformed payload');
    };
  }, (res) => {
    // Should fallback gracefully via validationErrors
    assert(res.observation.status === 'unknown');
    assert(res.risk.level === 'unknown');
  });

  // 7. Provider timeout
  await runScenario('Provider timeout', () => {
    service.provider.getLiveTrainProgress = async () => {
      const err = new ProviderError('Provider request failed after 3 attempts');
      err.status = 504;
      throw err;
    };
  }, (res) => {
    assert(res.observation.status === 'unknown');
    assert(res.risk.level === 'unknown');
  });

  // 8. Provider HTTP 401
  await runScenario('Provider HTTP 401', () => {
    service.provider.getLiveTrainProgress = async () => {
      const err = new ProviderError('Unauthorized');
      err.status = 401;
      throw err;
    };
  }, (res) => {
    assert(res.observation.status === 'unknown');
    assert(res.risk.level === 'unknown');
  });

  // 9. Provider HTTP 429
  await runScenario('Provider HTTP 429', () => {
    service.provider.getLiveTrainProgress = async () => {
      const err = new ProviderError('Rate Limited');
      err.status = 429;
      throw err;
    };
  }, (res) => {
    assert(res.observation.status === 'unknown');
    assert(res.risk.level === 'unknown');
  });

  // Revert mock
  service.provider.getLiveTrainProgress = originalGetLive;

  if (defects.length > 0) {
    console.log('Defects found:');
    console.log(defects);
    process.exit(1);
  } else {
    console.log('All E2E Verification Scenarios Passed.');
  }
}

runTests();
