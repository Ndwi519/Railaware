const TrainDiscoveryService = require('../../services/TrainDiscoveryService.js');
const RequestCache = require('../../utils/RequestCache.js');

describe('TrainDiscoveryService', () => {
  let mockCorridorResolver;
  let mockStationResolver;
  let mockStrategyManager;
  let mockMapper;

  beforeEach(() => {
    mockCorridorResolver = { resolveNearest: jest.fn() };
    mockStationResolver = { resolve: jest.fn() };
    mockStrategyManager = { discover: jest.fn().mockResolvedValue({ providerErrors: [], diagnostics: [], finalResult: null }) };
    mockMapper = { map: jest.fn() };
  });

  it('should initialize DiscoveryContext properly and invert dependencies', async () => {
    mockCorridorResolver.resolveNearest.mockResolvedValue({ id: 'corridor-1' });
    mockStrategyManager.discover.mockResolvedValue({
      executionState: { status: 'SUCCESS', provider: 'Mock', trainTarget: '123' },
      providerErrors: [],
      diagnostics: []
    });
    mockMapper.map.mockReturnValue({ trainTarget: '123', journey: {} });

    const service = new TrainDiscoveryService(mockCorridorResolver, mockStationResolver, mockStrategyManager, {
      'Mock': mockMapper
    });

    await service.discoverTrain(10, 20);

    // Verify corridor resolved
    expect(mockCorridorResolver.resolveNearest).toHaveBeenCalledWith({ lat: 10, lng: 20 }, 500);

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

    const service = new TrainDiscoveryService(mockCorridorResolver, mockStationResolver, mockStrategyManager, {});
    
    const result = await service.discoverTrain(10, 20);
    
    expect(result.corridor).toBeNull();
    // Fallback creates a context and evaluates strategies anyway (e.g. for GPS provider that doesn't need a corridor)
    expect(mockStrategyManager.discover).toHaveBeenCalledTimes(1);
  });
});
