// Purpose: regression coverage for RailAwareService safety orchestration.
// Responsibility: verify corridor/train discovery states route through domain engines without collapsing uncertainty.
// Dependencies: application service, domain engines, in-memory store, and legacy mapper.
// Public API: Jest test suite only.
const RailAwareService = require('../services/RailAwareService.js');
const { RiskLevel, ConfidenceLevel, TrainStatus } = require('../../domain/types/enums.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');
const RailAwareConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const RailAwareRiskEngine = require('../../risk-engine/RailAwareRiskEngine.js');
const RailAwareRecommendationEngine = require('../../recommendation-engine/RailAwareRecommendationEngine.js');
const LegacyApiMapper = require('../mappers/LegacyApiMapper.js');

class CapturingLegacyApiMapper extends LegacyApiMapper {
  map(applicationResult) {
    this.lastApplicationResult = applicationResult;
    return super.map(applicationResult);
  }
}

describe('RailAwareService Safety Regression', () => {
  let mockDiscoveryService;
  let mockProvider;
  let mockInterpreter;
  let mapper;
  let service;

  const createService = () => {
    mapper = new CapturingLegacyApiMapper();
    return new RailAwareService({
      discoveryService: mockDiscoveryService,
      provider: mockProvider,
      interpreter: mockInterpreter,
      store: new InMemoryObservationStore(10),
      confidenceEngine: new RailAwareConfidenceEngine(),
      riskEngine: new RailAwareRiskEngine(),
      recommendationEngine: new RailAwareRecommendationEngine(),
      mapper,
    });
  };

  const resolvedCorridor = {
    id: 'corridor-1',
    trackPresence: true,
    resolutionStatus: 'RESOLVED',
    stationResolutionDetails: {
      status: 'RESOLVED',
      confidence: ConfidenceLevel.HIGH,
      previousStation: { code: 'STA' },
      nextStation: { code: 'STB' },
    },
  };

  const unresolvedCorridor = {
    id: 'corridor-1',
    trackPresence: true,
    resolutionStatus: 'UNRESOLVED',
    stationResolutionDetails: { status: 'UNRESOLVED', confidence: ConfidenceLevel.UNKNOWN },
  };

  const journeyToTarget = { targetStation: { code: 'TARGET' } };

  const arrangeNoTrainDiscovery = (corridor) => {
    const isResolved = corridor && corridor.stationResolutionDetails?.status === 'RESOLVED';
    mockDiscoveryService.discoverTrain.mockResolvedValue({
      trainTarget: null,
      journey: null,
      corridor,
      discoveredTrains: isResolved ? [] : null,
      providerError: null,
      strategyDiagnostics: [],
    });
  };

  const arrangeProviderConfirmedTrain = ({ status, previousStation, nextStation }) => {
    mockDiscoveryService.discoverTrain.mockResolvedValue({
      trainTarget: 'TRAIN-123',
      journey: journeyToTarget,
      corridor: resolvedCorridor,
      discoveredTrains: [{ id: 'TRAIN-123' }],
      providerError: null,
      strategyDiagnostics: [],
    });

    mockProvider.getLiveTrainProgress.mockResolvedValue({
      id: 'TRAIN-123',
      status,
      previousStation,
      nextStation,
      segmentProgress: 0.5,
      lastUpdatedAt: new Date(),
    });

    mockInterpreter.interpret.mockReturnValue({
      id: 'snap-1',
      train: { number: 'TRAIN-123', name: 'Test Express' },
      status,
      segmentProgress: 0.5,
      currentSegment: {
        previousStation: { code: previousStation },
        nextStation: nextStation ? { code: nextStation } : null,
      },
      delayMinutes: null,
      lastUpdatedAt: new Date(),
      recordedAt: new Date(),
      validationErrors: [],
    });
  };

  beforeEach(() => {
    mockDiscoveryService = { discoverTrain: jest.fn() };
    mockProvider = { getLiveTrainProgress: jest.fn() };
    mockInterpreter = { interpret: jest.fn() };
    service = createService();
  });

  it('1. no corridor -> risk == null', async () => {
    arrangeNoTrainDiscovery(null);

    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result.corridor).toBeNull();
    expect(result.risk).toBeNull();
    expect(result.observation).toBeNull();
    expect(result.trains).toBeNull();
    expect(mapper.lastApplicationResult.confidence).toBeNull();
  });

  it('2. corridor + unresolved topology -> UNKNOWN', async () => {
    arrangeNoTrainDiscovery(unresolvedCorridor);

    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result.corridor).toBeDefined();
    expect(result.risk).not.toBeNull();
    expect(result.risk.level).toBe(RiskLevel.UNKNOWN.toLowerCase());
    expect(mapper.lastApplicationResult.confidence.level).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.risk.explanation).toBe('[Engineering decision] Unable to estimate because no journey context is available.');
    expect(result.trains).toBeNull();
    expect(result.observation).toEqual({
      trainId: 'UNKNOWN',
      status: TrainStatus.UNKNOWN,
      segmentProgress: null,
      previousStation: null,
      nextStation: null,
      delayMinutes: null,
      lastUpdatedAt: null,
      nearbyTrains: null,
    });
  });

  it('3. corridor + resolved topology + zero trains -> UNKNOWN', async () => {
    arrangeNoTrainDiscovery(resolvedCorridor);

    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result.observation).toEqual({
      trainId: 'NONE',
      status: TrainStatus.NOT_STARTED,
      segmentProgress: null,
      previousStation: null,
      nextStation: null,
      delayMinutes: null,
      lastUpdatedAt: null,
      nearbyTrains: [],
    });
    expect(mapper.lastApplicationResult.confidence.level).toBe(ConfidenceLevel.HIGH);
    expect(mapper.lastApplicationResult.confidence.reasons).toEqual([
      expect.stringContaining('zero trains returned'),
    ]);
    expect(result.risk.level).toBe(RiskLevel.UNKNOWN.toLowerCase());
    expect(result.risk.explanation).toBe('[Engineering decision] Track topology verified; provider confirms zero active trains.');
    expect(result.risk.recommendedAction).toBe('Status: NO_TRAINS_FOUND');
  });

  it('4. corridor + provider-confirmed distant train -> SAFE', async () => {
    arrangeProviderConfirmedTrain({
      status: TrainStatus.RUNNING,
      previousStation: 'SRC',
      nextStation: 'MID',
    });

    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result.risk.level).toBe(RiskLevel.SAFE.toLowerCase());
    expect(result.risk.reasons).toContain('[Engineering decision] Train is distant from target station');
    expect(result.risk.explanation).toBe('[Engineering decision] Estimated using topology: train is distant from target station.');
  });

  it('5. cancelled train -> SAFE', async () => {
    arrangeProviderConfirmedTrain({
      status: TrainStatus.CANCELLED,
      previousStation: 'SRC',
      nextStation: 'TARGET',
    });

    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result.observation.status).toBe(TrainStatus.CANCELLED);
    expect(result.risk.level).toBe(RiskLevel.SAFE.toLowerCase());
    expect(result.risk.reasons).toContain('[Engineering decision] Train is cancelled, boarding risk is neutralized');
  });

  it('6. approaching train -> IMMINENT', async () => {
    arrangeProviderConfirmedTrain({
      status: TrainStatus.RUNNING,
      previousStation: 'SRC',
      nextStation: 'TARGET',
    });

    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result.risk.level).toBe(RiskLevel.IMMINENT.toLowerCase());
    expect(result.risk.reasons).toContain('[Engineering decision] Train is approaching target station');
    expect(result.risk.explanation).toBe('[Engineering decision] Estimated using topology: train is approaching target station.');
  });
});
