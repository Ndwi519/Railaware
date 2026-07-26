// Purpose: regression coverage for RailAwareService awareness orchestration.
// Responsibility: verify corridor/train discovery states route through domain engines without collapsing uncertainty.
// Dependencies: application service, domain engines, in-memory store, and legacy mapper.
// Public API: Jest test suite only.
const RailAwareService = require('../services/RailAwareService.js');
const { ConfidenceLevel, TrainStatus } = require('../../domain/types/enums.js');
const { createTrainObservation } = require('../../domain/models/TrainObservation.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');
const RailAwareConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const RailAwareAwarenessEngine = require('../../awareness-engine/RailAwareAwarenessEngine.js');
const RailAwareAssistanceEngine = require('../../assistance-engine/RailAwareAssistanceEngine.js');

describe('RailAwareService Awareness Regression', () => {
  let mockDiscoveryService;
  let mockProvider;
  let mockInterpreter;
  const createService = () => {
    return new RailAwareService({
      discoveryService: mockDiscoveryService,
      provider: mockProvider,
      store: new InMemoryObservationStore(10),
      confidenceEngine: new RailAwareConfidenceEngine(),
      awarenessEngine: new RailAwareAwarenessEngine(),
      assistanceEngine: new RailAwareAssistanceEngine({ emergencyPhoneNumber: '112' }),
      trajectoryManager: {
        recordObservation: jest.fn().mockReturnValue({ observation: { latitude: 28.6, longitude: 77.2 }, sessionTrajectory: { observations: [] } }),
        getRoutingState: jest.fn().mockReturnValue({}),
        saveRoutingState: jest.fn()
      }
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

    mockProvider.getTrainObservation.mockResolvedValue(createTrainObservation({
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
    }));
  };

  beforeEach(() => {
    mockDiscoveryService = { discoverTrain: jest.fn() };
    mockProvider = { getTrainObservation: jest.fn() };
    service = createService();
  });

  it('1. no corridor -> awareness == null', async () => {
    arrangeNoTrainDiscovery(null);

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.discoveryContext.corridor).toBeNull();
    expect(result.awareness).toBeNull();
    expect(result.observation).toBeNull();
    expect(result.discoveryContext.discoveredTrains).toBeNull();
    expect(result.confidence).toBeNull();
  });

  it('2. corridor + unresolved topology -> UNKNOWN awareness', async () => {
    arrangeNoTrainDiscovery(unresolvedCorridor);

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.discoveryContext.corridor).toBeDefined();
    expect(result.awareness).not.toBeNull();
    expect(result.awareness.status).toBe('UNKNOWN');
    expect(result.confidence.level).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.awareness.explanation).toBe('[Engineering decision] Unable to estimate because no journey context is available.');
    expect(result.discoveryContext.discoveredTrains).toBeNull();
    expect(result.observation.train.number).toBe('UNKNOWN');
    expect(result.observation.status).toBe(TrainStatus.UNKNOWN);
  });

  it('3. corridor + resolved topology + zero trains -> NO_TRAINS_FOUND', async () => {
    arrangeNoTrainDiscovery(resolvedCorridor);

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.observation.train.number).toBe('NONE');
    expect(result.observation.status).toBe(TrainStatus.NOT_STARTED);
    expect(result.discoveryContext.discoveredTrains).toEqual([]);
    expect(result.confidence.level).toBe(ConfidenceLevel.HIGH);
    expect(result.confidence.reasons).toEqual([
      expect.stringContaining('empty result set returned'),
    ]);
    expect(result.awareness.status).toBe('NO_TRAINS_FOUND');
    expect(result.awareness.explanation).toBe('[Implementation policy] Track topology resolved; provider returned empty result set.');
  });

  it('4. corridor + provider-confirmed distant train -> DISTANT', async () => {
    arrangeProviderConfirmedTrain({
      status: TrainStatus.RUNNING,
      previousStation: 'SRC',
      nextStation: 'MID',
    });

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.awareness.status).toBe('DISTANT');
    expect(result.awareness.explanation).toBe('[Engineering decision] Estimated using topology: train is distant from target station.');
    expect(result.awareness.requiresProminentDisplay).toBe(false);
  });

  it('5. cancelled train -> CANCELLED', async () => {
    arrangeProviderConfirmedTrain({
      status: TrainStatus.CANCELLED,
      previousStation: 'SRC',
      nextStation: 'TARGET',
    });

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.observation.status).toBe(TrainStatus.CANCELLED);
    expect(result.awareness.status).toBe('CANCELLED');
    expect(result.awareness.requiresProminentDisplay).toBe(false);
  });

  it('6. approaching train -> APPROACHING_STATION', async () => {
    arrangeProviderConfirmedTrain({
      status: TrainStatus.RUNNING,
      previousStation: 'SRC',
      nextStation: 'TARGET',
    });

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.awareness.status).toBe('APPROACHING_STATION');
    expect(result.awareness.explanation).toBe('[Engineering decision] Estimated using topology: train is approaching target station.');
    expect(result.awareness.requiresProminentDisplay).toBe(true);
  });

  it('7. provider error during discovery -> structured discoveryContext with nulls', async () => {
    mockDiscoveryService.discoverTrain.mockRejectedValue(new Error('Rate limit exceeded'));

    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result.discoveryContext).toBeDefined();
    expect(result.discoveryContext.providerError).toBe('Rate limit exceeded');

    // Explicitly assert that the property exists and is null, not omitted
    expect(Object.prototype.hasOwnProperty.call(result.discoveryContext, 'discoveredTrains')).toBe(true);
    expect(result.discoveryContext.discoveredTrains).toBeNull();

    expect(result.discoveryContext.trainTarget).toBeNull();
    expect(result.discoveryContext.journey).toBeNull();
    expect(result.discoveryContext.corridor).toBeNull();
    expect(result.discoveryContext.strategyDiagnostics).toEqual([]);
    expect(result.discoveryContext.trace).toBeDefined();

    expect(result.awareness.status).toBe('UNKNOWN');
    expect(result.confidence.level).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.confidence.topologyConfidence).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.confidence.observationConfidence).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.confidence.providerReliability).toBe(ConfidenceLevel.UNASSESSED);
  });
});
