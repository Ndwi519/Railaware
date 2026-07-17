const RailRadarStrategy = require('../../services/strategies/RailRadarStrategy.js');
const RequestCache = require('../../utils/RequestCache.js');
const { DiscoveryStatus } = require('../../../domain/types/enums.js');

describe('RailRadarStrategy', () => {
  let mockStationResolver;

  beforeEach(() => {
    mockProvider = {
      discoverNearbyTrains: jest.fn()
    };
    mockStationResolver = {
      resolve: jest.fn()
    };
  });

  it('supports() should return false if no corridor exists without calling resolution', () => {
    const strategy = new RailRadarStrategy(mockProvider);
    const result = strategy.supports({ corridor: null });
    
    expect(result.supported).toBe(false);
    expect(mockStationResolver.resolve).not.toHaveBeenCalled();
  });

  it('supports() should return true if corridor exists', () => {
    const strategy = new RailRadarStrategy(mockProvider);
    const result = strategy.supports({ corridor: {} });
    expect(result.supported).toBe(true);
  });

  it('discover() should lazily call station resolution exactly once via RequestCache', async () => {
    mockProvider.discoverNearbyTrains.mockResolvedValue([]);
    mockStationResolver.resolve.mockResolvedValue({ status: 'RESOLVED', previousStation: { code: 'A' }, nextStation: { code: 'B' } });
    
    const strategy = new RailRadarStrategy(mockProvider);
    const cache = new RequestCache();
    const context = {
      location: {},
      corridor: {},
      services: { stationResolver: mockStationResolver },
      cache
    };
    
    // First strategy runs
    await strategy.discover(context);
    
    expect(mockStationResolver.resolve).toHaveBeenCalledTimes(1);

    // If we were to call it again through cache, it shouldn't hit resolver
    await cache.getOrCreate('stationResolution', () => mockStationResolver.resolve());
    expect(mockStationResolver.resolve).toHaveBeenCalledTimes(1);
  });

  it('should return ERROR if called with unresolved station codes (manager contract violation)', async () => {
    mockStationResolver.resolve.mockResolvedValue({ status: 'UNRESOLVED' });
    
    const strategy = new RailRadarStrategy(mockProvider);
    const context = {
      location: {},
      corridor: {},
      services: { stationResolver: mockStationResolver },
      cache: new RequestCache()
    };

    const result = await strategy.discover(context);
    expect(result.status).toBe(DiscoveryStatus.ERROR);
    expect(result.reason).toContain('Station resolution was unavailable or inconsistent with provider admission.');
    expect(mockProvider.discoverNearbyTrains).not.toHaveBeenCalled();
  });

  it('should return SUCCESS with DTOs if trains are discovered', async () => {
    mockStationResolver.resolve.mockResolvedValue({ status: 'RESOLVED', previousStation: { code: 'A' }, nextStation: { code: 'B' } });
    mockProvider.discoverNearbyTrains.mockResolvedValue([{ id: '123' }]);

    const strategy = new RailRadarStrategy(mockProvider);
    const context = {
      location: {},
      corridor: {},
      services: { stationResolver: mockStationResolver },
      cache: new RequestCache()
    };

    const result = await strategy.discover(context);
    
    expect(result.status).toBe(DiscoveryStatus.SUCCESS);
    expect(result.trainTarget).toBe('123');
    expect(result.discoveredTrains).toHaveLength(1);
    expect(result.providerRequests).toHaveLength(1);
  });
});
