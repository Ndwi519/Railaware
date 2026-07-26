const TrainDiscoveryService = require('../../services/TrainDiscoveryService.js');
const RequestCache = require('../../utils/RequestCache.js');

describe('TrainDiscoveryService', () => {
  let mockCorridorResolver;
  let mockStationResolver;
  let mockStrategyManager;
  let mockMapper;
  let mockDirectionalInference;
  let mockBranchEvidenceBuilder;
  let mockRouteSelection;
  let mockRouteContextBuilder;

  let discoveryContext;

  beforeEach(() => {
    mockCorridorResolver = { resolveNearest: jest.fn() };
    mockStationResolver = { resolve: jest.fn() };
    mockStrategyManager = { discover: jest.fn().mockResolvedValue({ providerErrors: [], diagnostics: [], finalResult: null }) };
    mockMapper = { map: jest.fn() };

    mockDirectionalInference = { inferDirection: jest.fn() };
    mockBranchEvidenceBuilder = { buildEvidence: jest.fn() };
    mockRouteSelection = { evaluate: jest.fn() };
    mockRouteContextBuilder = { buildContext: jest.fn() };

    discoveryContext = {
      observation: { latitude: 10, longitude: 20 },
      sessionTrajectory: {}
    };
  });

  const createService = (mappers = {}) => new TrainDiscoveryService({
    corridorResolver: mockCorridorResolver,
    stationResolver: mockStationResolver,
    strategyManager: mockStrategyManager,
    discoveryMappers: mappers,
    directionalInference: mockDirectionalInference,
    branchEvidenceBuilder: mockBranchEvidenceBuilder,
    routeSelection: mockRouteSelection,
    routeContextBuilder: mockRouteContextBuilder
  });

  it('should initialize DiscoveryContext properly and invert dependencies', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      executionState: { status: 'SUCCESS', provider: 'Mock', trainTarget: '123' },
      providerErrors: [],
      diagnostics: []
    });
    mockMapper.map.mockReturnValue({ trainTarget: '123', journey: {} });

    const service = createService({ 'Mock': mockMapper });

    await service.discoverTrain(discoveryContext);

    // Verify corridor resolved
    expect(mockCorridorResolver.resolveNearest).toHaveBeenCalledWith({ lat: 10, lng: 20 }, 1500);

    // Verify context passed to StrategyManager
    expect(mockStrategyManager.discover).toHaveBeenCalledTimes(1);
    const context = mockStrategyManager.discover.mock.calls[0][0];

    // Verify Context Contract
    expect(context).toHaveProperty('requestId');
    expect(context).toHaveProperty('location');
    expect(context).toHaveProperty('corridor');
    expect(context).toHaveProperty('services');
    expect(context).toHaveProperty('cache');
    expect(context.cache).toBeInstanceOf(RequestCache);
    expect(context.services.stationResolver).toBe(mockStationResolver);

    // Verify the context and its nested services are deeply frozen
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.services)).toBe(true);
    expect(Object.isFrozen(context.location)).toBe(true);

    // Verify Station Resolver was NEVER CALLED by the Service itself!
    expect(mockStationResolver.resolve).not.toHaveBeenCalled();
  });

  it('should fallback securely if nearest corridor is null', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue(null);

    const service = createService();

    const result = await service.discoverTrain(discoveryContext);

    expect(result.corridor).toBeNull();
    // Fallback creates a context and evaluates strategies anyway (e.g. for GPS provider that doesn't need a corridor)
    expect(mockStrategyManager.discover).toHaveBeenCalledTimes(1);
  });

  it('trains is null, not [], when provider was never queried — see documented semantic contract', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      winningStrategy: null,
      winningStrategyId: null,
      executedStrategies: [],
      skippedStrategies: ['railradar'],
      providerErrors: [],
      diagnostics: [],
      finalResult: null,
      providerQueried: false
    });

    const service = createService();
    const result = await service.discoverTrain(discoveryContext);

    expect(result.discoveredTrains).toBeNull();
  });

  it('trains is [], not null, when provider was successfully queried and returned zero trains — see documented semantic contract', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      winningStrategy: null,
      winningStrategyId: null,
      executedStrategies: ['railradar'],
      skippedStrategies: [],
      providerErrors: [],
      diagnostics: [],
      finalResult: null,
      providerQueried: true
    });

    const service = createService();
    const result = await service.discoverTrain(discoveryContext);

    expect(result.discoveredTrains).toEqual([]);
  });

  it('trains is populated array when provider was successfully queried and found trains — see documented semantic contract', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      winningStrategy: 'Mock Strategy',
      winningStrategyId: 'mock-strategy',
      executedStrategies: ['mock-strategy'],
      skippedStrategies: [],
      providerErrors: [],
      diagnostics: [],
      finalResult: {
        status: 'SUCCESS',
        discoveredTrains: [{ id: 'TRAIN-123' }]
      },
      providerQueried: true
    });
    mockMapper.map.mockReturnValue({ trainTarget: 'TRAIN-123', journey: {} });

    const service = createService({ 'mock-strategy': mockMapper });
    const result = await service.discoverTrain(discoveryContext);

    expect(result.discoveredTrains).toEqual([{ id: 'TRAIN-123' }]);
    expect(mockMapper.map).toHaveBeenCalledTimes(1);
    expect(mockMapper.map).toHaveBeenCalledWith({
      status: 'SUCCESS',
      discoveredTrains: [{ id: 'TRAIN-123' }]
    }, expect.any(Object));
  });

  it('trains is null when provider failure throws or yields error — see documented semantic contract', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      winningStrategy: null,
      winningStrategyId: null,
      executedStrategies: ['railradar'],
      skippedStrategies: [],
      providerErrors: ['Rate Limit Exceeded'],
      diagnostics: [],
      finalResult: null,
      providerQueried: true
    });

    const service = createService();
    const result = await service.discoverTrain(discoveryContext);

    expect(result.discoveredTrains).toBeNull();
    expect(result.providerError).toBe('Rate Limit Exceeded');
  });

  it('should fall back gracefully if winningStrategyId has no registered mapper', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      winningStrategy: 'Mock Strategy',
      winningStrategyId: 'unknown-strategy',
      executedStrategies: ['unknown-strategy'],
      skippedStrategies: [],
      providerErrors: [],
      diagnostics: [],
      finalResult: {
        status: 'SUCCESS',
        discoveredTrains: [{ id: 'TRAIN-123' }]
      },
      providerQueried: true
    });

    const service = createService();

    let result;
    await expect((async () => {
      result = await service.discoverTrain(discoveryContext);
    })()).resolves.not.toThrow();

    expect(result.trainTarget).toBeNull();
    expect(result.journey).toBeNull();
    expect(result.discoveredTrains).toEqual([{ id: 'TRAIN-123' }]);
  });

  it('should not expose Route Selection or internal compatibility fields in public API response (Priority 2 Regression)', async () => {
    // Setup a mock corridor that looks like what resolver returns
    mockCorridorResolver.resolveNearest.mockResolvedValue({
      nearestCorridor: { id: 'corridor-1' },
      assembledCorridor: { getTraversableSegments: () => [], getBranchId: () => 'branch_1' },
      projectionResult: { corridorSegmentIndex: 0, alongTrackDistanceMetres: 10 },
      stationsOutput: []
    });

    mockDirectionalInference.inferDirection.mockReturnValue({});
    mockBranchEvidenceBuilder.buildEvidence.mockReturnValue({});
    mockRouteSelection.evaluate.mockReturnValue({ status: 'UNKNOWN' });

    const service = createService();
    const result = await service.discoverTrain(discoveryContext);

    expect(result.corridor).not.toBeNull();
    // Public API payload should not contain these fields
    expect(result.corridor.routeSelection).toBeUndefined();
    expect(result.corridor._routeSelection).toBeUndefined();
    expect(result.corridor.assembledCorridor).toBeUndefined();
    expect(result.corridor.projectionResult).toBeUndefined();
    expect(result.corridor.stationsOutput).toBeUndefined();
  });
});
