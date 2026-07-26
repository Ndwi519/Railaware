var _railradar = require("../../provider/railradar.js");
var _index = require("../../utils/index.js");
var _globals = require("@jest/globals");
describe('RailRadar Provider', () => {
  let provider;
  beforeEach(() => {
    provider = new _railradar.RailRadarProvider({
      railradarKey: 'test-key'
    });
    global.fetch = _globals.jest.fn();
  });
  afterEach(() => {
    _globals.jest.restoreAllMocks();
  });
  test('discoverNearbyTrains returns trains successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        trains: [{
          train: {
            number: '123',
            name: 'Test Express'
          },
          from: {
            departure: '10:00'
          },
          to: {
            arrival: '12:00'
          }
        }]
      }
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });
    const result = await provider.discoverNearbyTrains('STN1', 'STN2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('123');
  });
  test('discoverNearbyTrains throws ProviderError on malformed provider payload', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          trains: [{
            train: {
              number: 123
            }
          }] // Missing name, which is fine, but to make it malformed let's break structure:
        }
      })
    });

    // Let's explicitly return something that fails Zod:
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: "not-a-boolean"
      })
    });
    await expect(provider.discoverNearbyTrains('STN1', 'STN2')).rejects.toThrow('Malformed provider payload');
  });
  test('discoverNearbyTrains throws ProviderError on non-200 status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500
    });
    await expect(provider.discoverNearbyTrains('STN1', 'STN2')).rejects.toThrow(_index.ProviderError);
  });
  test('getLiveTrainProgress returns topological progress successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        trainNumber: '123',
        status: 'running',
        isLive: true,
        lastUpdatedAt: '2026-07-09T00:00:00Z',
        previousHalt: {
          stationCode: 'STN1'
        },
        nextHalt: {
          stationCode: 'STN2'
        },
        currentLocation: {
          segmentProgress: 0.75
        }
      }
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });
    const result = await provider.getLiveTrainProgress('123');
    expect(result.id).toBe('123');
    expect(result.segmentProgress).toBe(0.75);
    expect(result.previousStation).toBe('STN1');
    expect(result.nextStation).toBe('STN2');
  });
  test('getLiveTrainProgress throws ProviderError on non-200 status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401
    });
    await expect(provider.getLiveTrainProgress('123')).rejects.toThrow(_index.ProviderError);
  });
  test('getLiveTrainProgress throws ProviderError on malformed provider payload (Zod)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: 'not-a-boolean'
      }) // fails schema
    });
    await expect(provider.getLiveTrainProgress('123')).rejects.toThrow('Malformed provider payload');
  });
  test('retries on 500 error and throws after max attempts', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500
    });
    await expect(provider.getLiveTrainProgress('123')).rejects.toThrow('Provider request failed after 3 attempts');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
  test('timeout causes AbortError and retries', async () => {
    global.fetch.mockImplementation(() => {
      const err = new Error('Abort');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    await expect(provider.discoverNearbyTrains('STN1', 'STN2')).rejects.toThrow('Provider request failed after 3 attempts: Abort');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});