import { ConfidenceLevel, TrainStatus, ResolutionStatus } from './domain/types/enums.js';
import { createObservation } from './domain/models/Observation.js';
import { createTrain } from './domain/models/Train.js';
import { createConfidenceAssessment } from './domain/models/ConfidenceAssessment.js';
import RailAwareService from './application/services/RailAwareService.js';
import RailAwareRiskEngine from './risk-engine/RailAwareRiskEngine.js';

// Mock dependencies
const mockInterpreter = {
  interpret: (snapshot) => createObservation({
    id: 'test',
    train: createTrain({ number: '12345', name: 'Test', startDate: '2026-07-08' }),
    status: TrainStatus.RUNNING,
    recordedAt: new Date(),
    segmentProgress: 0.5,
    currentSegment: {
      previousStation: { code: 'A' },
      nextStation: { code: 'C' }
    }
  })
};

const mockStore = {
  save: async () => {},
  history: async () => []
};

const mockConfidenceEngine = {
  evaluate: () => createConfidenceAssessment({
    level: ConfidenceLevel.HIGH,
    reasons: [],
    assessedAt: new Date()
  })
};

const riskEngine = new RailAwareRiskEngine();

const mockRecommendationEngine = {
  evaluate: (awareness) => ({ text: 'Mock Rec' })
};

const mockMapper = {
  map: (input) => input
};

const service = new RailAwareService({
  discoveryService: {},
  provider: { getLiveTrainProgress: async () => ({ id: '12345', status: 'running' }) },
  interpreter: mockInterpreter,
  store: mockStore,
  confidenceEngine: mockConfidenceEngine,
  riskEngine,
  recommendationEngine: mockRecommendationEngine,
  mapper: mockMapper
});

const runCase = async (name, setupMocks) => {
  console.log('=========================================================');
  console.log(`VALIDATING: ${name}`);
  setupMocks();
  
  // We mock evaluateLocation to bypass discovery
  // We'll override the mock discoveryService to return our desired context
  const result = await service.evaluateLocation(28.0, 77.0);
  
  console.log(`topologyConfidence:    ${result.confidence.topologyConfidence || 'N/A'}`);
  console.log(`observationConfidence: ${result.confidence.observationConfidence || 'N/A'}`);
  console.log(`overallConfidence:     ${result.confidence.overallConfidence || result.confidence.level}`);
  console.log('');
  console.log('Awareness Result:');
  console.log(JSON.stringify(result.risk.awareness, null, 2));
  console.log('=========================================================\n');
};

(async () => {
  // Case A: Unresolved topology (corridor found, but not resolved)
  await runCase('Case A: unresolved topology', () => {
    service.discoveryService.discoverTrain = async () => ({
      trainTarget: '12345',
      journey: { targetStation: { code: 'B' } },
      corridor: {
        stationResolutionDetails: { status: ResolutionStatus.UNRESOLVED, confidence: ConfidenceLevel.UNKNOWN },
        stations: []
      }
    });
  });

  // Case B: Verified topology, zero trains (trainTarget = null, isResolved = true)
  await runCase('Case B: verified topology, zero trains', () => {
    service.discoveryService.discoverTrain = async () => ({
      trainTarget: null, // Zero trains
      journey: null,
      corridor: {
        stationResolutionDetails: { status: ResolutionStatus.RESOLVED, confidence: ConfidenceLevel.HIGH },
        stations: [
            { feature: { station: { code: 'A' } }, alongTrackDistanceMetres: 0 },
            { feature: { station: { code: 'B' } }, alongTrackDistanceMetres: 1000 },
        ]
      }
    });
  });

  // Case C: Verified topology, active train (trainTarget valid, isResolved = true)
  await runCase('Case C: verified topology, active train', () => {
    service.discoveryService.discoverTrain = async () => ({
      trainTarget: '12345',
      journey: { targetStation: { code: 'B' } },
      corridor: {
        stationResolutionDetails: { status: ResolutionStatus.RESOLVED, confidence: ConfidenceLevel.HIGH },
        stations: [
            { feature: { station: { code: 'A' } }, alongTrackDistanceMetres: 0 },
            { feature: { station: { code: 'B' } }, alongTrackDistanceMetres: 1000 },
            { feature: { station: { code: 'C' } }, alongTrackDistanceMetres: 2000 }
        ]
      }
    });
    // We override confidence engine here to return MEDIUM to see how it combines with HIGH topology
    service.confidenceEngine.evaluate = () => createConfidenceAssessment({
      level: ConfidenceLevel.MEDIUM,
      reasons: [],
      assessedAt: new Date()
    });
  });

})();
