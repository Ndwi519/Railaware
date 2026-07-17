/**
 * @file RailAwareService.nullJourney.test.js
 * @responsibility Regression test for null-journey guard in RailAwareService.evaluateLocation.
 *
 * When a train is discovered but no Journey can be constructed (because the provider
 * does not supply sufficient topology for station-based routing), RailAwareService
 * must return UNKNOWN risk instead of throwing.
 */
const RailAwareService = require('../services/RailAwareService.js');
const { RiskLevel, TrainStatus, DiscoveryStatus } = require('../../domain/types/enums.js');
const { createObservation } = require('../../domain/models/Observation.js');
const { createTrain } = require('../../domain/models/Train.js');
const LegacyApiMapper = require('../mappers/LegacyApiMapper.js');
const RailAwareRiskEngine = require('../../risk-engine/RailAwareRiskEngine.js');
const RailAwareConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const RailAwareRecommendationEngine = require('../../recommendation-engine/RailAwareRecommendationEngine.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');

describe('RailAwareService — null journey path', () => {
  function buildService({ discoveryResult }) {
    const mockDiscoveryService = {
      discoverTrain: jest.fn().mockResolvedValue(discoveryResult),
    };

    const liveData = {
      id: 'TRAIN-1',
      status: TrainStatus.RUNNING,
      previousStation: null,
      nextStation: null,
      segmentProgress: null,
      lastUpdatedAt: new Date().toISOString(),
      isLive: true,
    };

    const mockProvider = {
      getLiveTrainProgress: jest.fn().mockResolvedValue(liveData),
    };

    const mockInterpreter = {
      interpret: jest.fn().mockReturnValue(
        createObservation({
          id: 'snap-1',
          train: createTrain({ number: 'TRAIN-1', name: 'Test', startDate: '2026' }),
          status: TrainStatus.RUNNING,
          recordedAt: new Date(),
        })
      ),
    };

    return new RailAwareService({
      discoveryService: mockDiscoveryService,
      provider: mockProvider,
      interpreter: mockInterpreter,
      store: new InMemoryObservationStore(10),
      confidenceEngine: new RailAwareConfidenceEngine(),
      riskEngine: new RailAwareRiskEngine(),
      recommendationEngine: new RailAwareRecommendationEngine(),
      mapper: new LegacyApiMapper(),
    });
  }

  it('returns UNKNOWN risk without throwing when trainTarget is set but journey is null', async () => {
    const service = buildService({
      discoveryResult: {
        trainTarget: 'TRAIN-1',
        journey: null,                  // <-- This is the scenario: mapper always returns null
        corridor: { corridorGeometry: [], resolutionStatus: 'UNRESOLVED', stationResolutionDetails: null },
        discoveredTrains: [{ id: 'TRAIN-1' }],
        providerError: null,
        strategyDiagnostics: [],
      },
    });

    // Must not throw
    const result = await service.evaluateLocation(28.6, 77.2);

    expect(result).toBeDefined();
    expect(result.risk).toBeDefined();
    expect(result.risk.level).toBe(RiskLevel.UNKNOWN.toLowerCase());
    expect(result.risk.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('No journey context available')])
    );
  });
});
