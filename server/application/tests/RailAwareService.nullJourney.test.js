/**
 * @file RailAwareService.nullJourney.test.js
 * @responsibility Regression test for null-journey guard in RailAwareService.evaluateLocation.
 *
 * When a train is discovered but no Journey can be constructed (because the provider
 * does not supply sufficient topology for station-based routing), RailAwareService
 * must return UNKNOWN awareness instead of throwing.
 */
const RailAwareService = require('../services/RailAwareService.js');
const { TrainStatus } = require('../../domain/types/enums.js');
const { createTrainObservation } = require('../../domain/models/TrainObservation.js');
const { createTrain } = require('../../domain/models/Train.js');
const RailAwareAwarenessEngine = require('../../awareness-engine/RailAwareAwarenessEngine.js');
const RailAwareConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const RailAwareAssistanceEngine = require('../../assistance-engine/RailAwareAssistanceEngine.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');

describe('RailAwareService — null journey path', () => {
  function buildService({ discoveryResult }) {
    const mockDiscoveryService = {
      discoverTrain: jest.fn().mockResolvedValue(discoveryResult),
    };

    const mockProvider = {
      getTrainObservation: jest.fn().mockResolvedValue(
        createTrainObservation({
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
  }

  it('returns UNKNOWN awareness without throwing when trainTarget is set but journey is null', async () => {
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
    const result = await service.evaluateLocation('test-session', 28.6, 77.2);

    expect(result).toBeDefined();
    expect(result.awareness).toBeDefined();
    expect(result.awareness.status).toBe('UNKNOWN');
    expect(result.awareness.explanation).toContain('Unable to estimate because no journey context is available');
  });
});
