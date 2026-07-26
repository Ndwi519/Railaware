"use strict";

const { TrajectoryManager } = require('../../services/TrajectoryManager.js');
const TrainDiscoveryService = require('../../services/TrainDiscoveryService.js');
const { DiscoveryContext } = require('../../models/DiscoveryContext.js');
const { RoutingPipelineResult } = require('../../models/RoutingPipelineResult.js');

const { MovementState } = require('../../../directional-inference/MovementState.js');


describe('End-to-End Routing Pipeline Integration', () => {
  let discoveryService;
  let corridorResolver;
  let strategyManager;
  let directionalInference;
  let branchEvidenceBuilder;
  let routeSelection;
  let routeContextBuilder;
  let trajectoryManager;

  beforeEach(() => {
    trajectoryManager = new TrajectoryManager();

    // Mock Projection / Corridor Resolver
    corridorResolver = {
      resolveNearest: jest.fn()
    };

    // Mock Strategy Manager
    strategyManager = {
      discover: jest.fn().mockResolvedValue({
        finalResult: null,
        providerErrors: [],
        providerQueried: false
      })
    };

    // Mock Pipeline Stages (we mock them to verify the contract flow strictly)
    directionalInference = {
      inferDirection: jest.fn()
    };
    branchEvidenceBuilder = {
      buildEvidence: jest.fn()
    };
    routeSelection = {
      evaluate: jest.fn()
    };
    routeContextBuilder = {
      buildContext: jest.fn()
    };

    discoveryService = new TrainDiscoveryService({
      corridorResolver,
      stationResolver: {},
      strategyManager,
      discoveryMappers: {},
      directionalInference,
      branchEvidenceBuilder,
      routeSelection,
      routeContextBuilder
    });
  });

  const runPipeline = async (lat, lng) => {
    const { observation, sessionTrajectory } = trajectoryManager.recordObservation('test-session', lat, lng);
    const context = new DiscoveryContext({ observation, sessionTrajectory });
    return await discoveryService.discoverTrain(context);
  };

  test('Scenario 1: Steady movement (SELECTED -> RouteContext created)', async () => {
    const projectionResult = { corridorSegmentIndex: 0, alongTrackDistanceMetres: 100 };
    const assembledCorridor = { segments: [] };
    const stationsOutput = [];

    corridorResolver.resolveNearest.mockResolvedValue({
      assembledCorridor: assembledCorridor,
      projectionResult: projectionResult,
      stationsOutput: stationsOutput,
      nearestCorridor: {}
    });

    const directionInferenceResult = { movementState: MovementState.MOVING };
    directionalInference.inferDirection.mockReturnValue(directionInferenceResult);

    const evidence = { type: 'EVIDENCE' };
    branchEvidenceBuilder.buildEvidence.mockReturnValue(evidence);

    const routeSelectionDecision = { status: 'SELECTED', branchId: 'B1' };
    routeSelection.evaluate.mockReturnValue(routeSelectionDecision);

    const routeContext = { valid: true };
    routeContextBuilder.buildContext.mockReturnValue(routeContext);

    // Act
    await runPipeline(28.6139, 77.2090); // Obs 1
    const response = await runPipeline(28.6140, 77.2091); // Obs 2 (Moving)

    // Assert Pipeline Contract
    const routingResult = response.routingResult;
    expect(routingResult).toBeInstanceOf(RoutingPipelineResult);
    expect(routingResult.discoveryContext).toBeInstanceOf(DiscoveryContext);
    expect(routingResult.projectionResult).toBe(projectionResult);
    expect(routingResult.directionInferenceResult).toBe(directionInferenceResult);
    expect(routingResult.routeSelectionDecision).toBe(routeSelectionDecision);
    expect(routingResult.routeContext).toBe(routeContext);

    // Verify Stage Independence & Flow
    expect(directionalInference.inferDirection).toHaveBeenCalledWith(
      routingResult.discoveryContext,
      projectionResult
    );
    expect(branchEvidenceBuilder.buildEvidence).toHaveBeenCalledWith(
      projectionResult,
      directionInferenceResult,
      assembledCorridor,
      {}
    );
    expect(routeSelection.evaluate).toHaveBeenCalledWith(evidence);
    expect(routeContextBuilder.buildContext).toHaveBeenCalledWith(
      routeSelectionDecision,
      assembledCorridor,
      0,
      100,
      stationsOutput
    );
  });

  test('Scenario 2: Stationary (UNKNOWN direction -> No RouteContext)', async () => {
    const projectionResult = { corridorSegmentIndex: 0, alongTrackDistanceMetres: 100 };
    const assembledCorridor = { segments: [] };

    corridorResolver.resolveNearest.mockResolvedValue({
      assembledCorridor: assembledCorridor,
      projectionResult: projectionResult,
      stationsOutput: [],
      nearestCorridor: {}
    });

    const directionInferenceResult = { movementState: MovementState.STATIONARY };
    directionalInference.inferDirection.mockReturnValue(directionInferenceResult);

    const evidence = { type: 'EVIDENCE' };
    branchEvidenceBuilder.buildEvidence.mockReturnValue(evidence);

    const routeSelectionDecision = { status: 'UNKNOWN' };
    routeSelection.evaluate.mockReturnValue(routeSelectionDecision);

    // Act
    await runPipeline(28.6139, 77.2090);
    const response = await runPipeline(28.6139, 77.2090);

    // Assert
    const routingResult = response.routingResult;
    expect(routingResult.directionInferenceResult.movementState).toBe(MovementState.STATIONARY);
    expect(routingResult.routeSelectionDecision.status).toBe('UNKNOWN');
    expect(routingResult.routeContext).toBeNull(); // Should not build context
    expect(routeContextBuilder.buildContext).not.toHaveBeenCalled();
  });

  test('Scenario 3: Junction traversal (Correct branch selected)', async () => {
    const projectionResult = { corridorSegmentIndex: 2, alongTrackDistanceMetres: 200 };
    const assembledCorridor = { segments: [] };

    corridorResolver.resolveNearest.mockResolvedValue({
      assembledCorridor: assembledCorridor,
      projectionResult: projectionResult,
      stationsOutput: [],
      nearestCorridor: {}
    });

    const directionInferenceResult = { movementState: MovementState.MOVING };
    directionalInference.inferDirection.mockReturnValue(directionInferenceResult);

    branchEvidenceBuilder.buildEvidence.mockReturnValue({});

    // Simulating correct branch selection
    const routeSelectionDecision = { status: 'SELECTED', branchId: 'Junction_Right' };
    routeSelection.evaluate.mockReturnValue(routeSelectionDecision);

    const routeContext = { activeBranch: 'Junction_Right' };
    routeContextBuilder.buildContext.mockReturnValue(routeContext);

    // Act
    const response = await runPipeline(28.6139, 77.2090);

    // Assert
    expect(response.routingResult.routeSelectionDecision.status).toBe('SELECTED');
    expect(response.routingResult.routeContext).toBe(routeContext);
  });

  test('Scenario 4: Parallel tracks (Stable Corridor Identity)', async () => {
    const projectionResult = { corridorSegmentIndex: 0, alongTrackDistanceMetres: 100 };
    const assembledCorridor = { segments: [] };

    corridorResolver.resolveNearest.mockResolvedValue({
      assembledCorridor: assembledCorridor,
      projectionResult: projectionResult,
      stationsOutput: [],
      nearestCorridor: {}
    });

    // Simulating stable identity
    directionalInference.inferDirection.mockReturnValue({ movementState: MovementState.MOVING });
    branchEvidenceBuilder.buildEvidence.mockReturnValue({});
    routeSelection.evaluate.mockReturnValue({ status: 'SELECTED', branchId: 'Parallel_Track_1' });
    routeContextBuilder.buildContext.mockReturnValue({ activeBranch: 'Parallel_Track_1' });

    // Act
    const response = await runPipeline(28.6139, 77.2090);

    // Assert
    expect(response.routingResult.routeSelectionDecision.status).toBe('SELECTED');
    expect(response.routingResult.routeContext).not.toBeNull();
  });

  test('Scenario 5: GPS noise (Jitter filters to STATIONARY)', async () => {
    const projectionResult = { corridorSegmentIndex: 0, alongTrackDistanceMetres: 100 };

    corridorResolver.resolveNearest.mockResolvedValue({
      assembledCorridor: {},
      projectionResult: projectionResult,
      stationsOutput: [],
      nearestCorridor: {}
    });

    // Simulating jitter
    directionalInference.inferDirection.mockReturnValue({ movementState: MovementState.STATIONARY });
    branchEvidenceBuilder.buildEvidence.mockReturnValue({});
    routeSelection.evaluate.mockReturnValue({ status: 'UNKNOWN' });

    // Act
    const response = await runPipeline(28.6139, 77.2090);

    // Assert
    expect(response.routingResult.directionInferenceResult.movementState).toBe(MovementState.STATIONARY);
    expect(response.routingResult.routeSelectionDecision.status).toBe('UNKNOWN');
  });

  describe('End-to-End Routing Pipeline Integration (Real Routing Components)', () => {
    let realDiscoveryService;
    let realTrajectoryManager;
    let mockedCorridorResolver;
    let mockedStrategyManager;
    let mockedDirectionalInference;

    beforeEach(() => {
      const { BranchEvidenceBuilder } = require('../../../route-selection/BranchEvidenceBuilder.js');
      const { RouteSelection } = require('../../../route-selection/RouteSelection.js');
      const { RouteContextBuilder } = require('../../../route-selection/RouteContextBuilder.js');

      realTrajectoryManager = new TrajectoryManager();
      mockedCorridorResolver = { resolveNearest: jest.fn() };
      mockedStrategyManager = { discover: jest.fn().mockResolvedValue({ finalResult: null, providerErrors: [], providerQueried: false }) };
      mockedDirectionalInference = { inferDirection: jest.fn() };

      realDiscoveryService = new TrainDiscoveryService({
        corridorResolver: mockedCorridorResolver,
        stationResolver: {},
        strategyManager: mockedStrategyManager,
        discoveryMappers: {},
        directionalInference: mockedDirectionalInference,
        branchEvidenceBuilder: new BranchEvidenceBuilder(),
        routeSelection: new RouteSelection(),
        routeContextBuilder: new RouteContextBuilder()
      });
    });

    const runRealPipeline = async (lat, lng) => {
      const { observation, sessionTrajectory } = realTrajectoryManager.recordObservation('real-session', lat, lng);
      const { DiscoveryContext } = require('../../models/DiscoveryContext.js');
      const routingState = realTrajectoryManager.getRoutingState('real-session');
      const context = new DiscoveryContext({ observation, sessionTrajectory, routingState });
      const discoveryContext = await realDiscoveryService.discoverTrain(context);

      if (discoveryContext.routingResult && discoveryContext.routingResult.projectionResult) {
        realTrajectoryManager.saveRoutingState('real-session', {
          lastProjectedSegmentIndex: discoveryContext.routingResult.projectionResult.corridorSegmentIndex
        });
      }
      return discoveryContext;
    };

    const setupMocksForRealTest = (corridorIndex, headingDegrees, isForward) => {
      // Mock AssembledCorridor
      const assembledCorridor = {
        getTraversableSegments: () => [
          [{lat: 0, lng: 0}, {lat: 0, lng: 1}], // Seg 0 (heading 90)
          [{lat: 0, lng: 1}, {lat: 0, lng: 2}]  // Seg 1 (heading 90)
        ],
        getSegmentIndex: (id) => parseInt(id, 10),
        getBranchId: (i) => String(i),
        getConnectedSegments: (index, isEnd) => {
          if (index === 0 && isEnd) return [{ segmentIndex: 1, branchId: "1", isForward: true }];
          if (index === 1 && !isEnd) return [{ segmentIndex: 0, branchId: "0", isForward: true }];
          return [];
        }
      };

      const stationsOutput = [
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 10, name: 'A' },
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 50, name: 'B' },
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 90, name: 'C' }
      ];

      mockedCorridorResolver.resolveNearest.mockResolvedValue({
        assembledCorridor: assembledCorridor,
        projectionResult: { corridorSegmentIndex: corridorIndex, alongTrackDistanceMetres: 50 },
        stationsOutput: stationsOutput,
        nearestCorridor: {}
      });

      mockedDirectionalInference.inferDirection.mockReturnValue({
        movementState: MovementState.MOVING,
        headingDegrees: headingDegrees
      });
    };

    test('Scenario 6: End-to-End Routing Decision (FORWARD)', async () => {
      // Heading 90 on a 90 degree segment -> FORWARD
      setupMocksForRealTest(0, 90, true);

      // Act
      await runRealPipeline(28.6139, 77.2090); // Obs 1
      const response = await runRealPipeline(28.6140, 77.2091); // Obs 2

      const routingResult = response.routingResult;
      expect(routingResult.routeSelectionDecision.status).toBe('SELECTED');
      expect(routingResult.routeSelectionDecision.travelDirection).toBe('FORWARD');
      expect(routingResult.routeContext).not.toBeNull();

      // Selected branch is "1" because it's downstream of segment 0.
      expect(routingResult.routeContext.branchId).toBe('1');

      // User is at distance 50 on Seg 0 moving FORWARD into Seg 1.
      // previousStation should be the last station on Seg 0 that is <= 50 (which is B).
      // nextStation should be the first station on Seg 1 (None exist in our mock, so it stays null).
      expect(routingResult.routeContext.previousStation.name).toBe('B');
      expect(routingResult.routeContext.nextStation).toBeNull();
    });

    test('Scenario 7: End-to-End Routing Decision (BACKWARD)', async () => {
      // Heading 270 on a 90 degree segment -> BACKWARD
      setupMocksForRealTest(1, 270, false);

      // Act
      await runRealPipeline(28.6139, 77.2090); // Obs 1
      const response = await runRealPipeline(28.6140, 77.2091); // Obs 2

      const routingResult = response.routingResult;
      expect(routingResult.routeSelectionDecision.status).toBe('SELECTED');
      expect(routingResult.routeSelectionDecision.travelDirection).toBe('BACKWARD');
      expect(routingResult.routeContext).not.toBeNull();

      // Selected branch is "0" because it's downstream (backwards) of segment 1.
      expect(routingResult.routeContext.branchId).toBe('0');

      // User is at distance 50 on Seg 1 moving BACKWARD into Seg 0.
      // previousStation should be the station on Seg 1 that is >= 50 (None exist).
      // nextStation should be the last station on Seg 0 (which is C at 90).
      expect(routingResult.routeContext.previousStation).toBeNull();
      expect(routingResult.routeContext.nextStation.name).toBe('C');
    });
  });
});
