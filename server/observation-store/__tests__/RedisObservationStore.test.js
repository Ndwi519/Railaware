const mockConnect = jest.fn().mockResolvedValue();
const mockLRange = jest.fn().mockResolvedValue([]);
const mockRPop = jest.fn().mockResolvedValue();
const mockRPush = jest.fn().mockResolvedValue();
const mockLTrim = jest.fn().mockResolvedValue();
const mockExpire = jest.fn().mockResolvedValue();
const mockFlushDb = jest.fn().mockResolvedValue();
const mockOn = jest.fn();

jest.mock('redis', () => {
  return {
    createClient: jest.fn(() => ({
      connect: mockConnect,
      lRange: mockLRange,
      rPop: mockRPop,
      rPush: mockRPush,
      lTrim: mockLTrim,
      expire: mockExpire,
      flushDb: mockFlushDb,
      on: mockOn
    }))
  };
}, { virtual: true });

const RedisObservationStore = require('../RedisObservationStore');

describe('RedisObservationStore', () => {
  let store;

  beforeEach(() => {
    store = new RedisObservationStore('redis://localhost', 10);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid observations', async () => {
    await expect(store.save(null)).rejects.toThrow('Invalid observation');
    await expect(store.save({ train: {} })).rejects.toThrow('Invalid observation');
  });

  it('saves a valid observation', async () => {
    const obs = { train: { number: '123' }, lastUpdatedAt: new Date().toISOString() };
    mockLRange.mockResolvedValueOnce([]);

    await store.save(obs);

    expect(mockRPush).toHaveBeenCalledWith('train_history:123', JSON.stringify(obs));
    expect(mockLTrim).toHaveBeenCalledWith('train_history:123', -10, -1);
    expect(mockExpire).toHaveBeenCalledWith('train_history:123', 86400);
  });

  it('rejects older observations out of order', async () => {
    const newObs = { train: { number: '123' }, lastUpdatedAt: new Date(1000).toISOString() };
    const latestObs = { train: { number: '123' }, lastUpdatedAt: new Date(2000).toISOString() };
    mockLRange.mockResolvedValueOnce([JSON.stringify(latestObs)]);

    await store.save(newObs);

    expect(mockRPush).not.toHaveBeenCalled();
  });

  it('replaces observations with identical timestamps', async () => {
    const newObs = { train: { number: '123' }, lastUpdatedAt: new Date(1000).toISOString(), extra: 1 };
    const latestObs = { train: { number: '123' }, lastUpdatedAt: new Date(1000).toISOString(), extra: 0 };
    mockLRange.mockResolvedValueOnce([JSON.stringify(latestObs)]);

    await store.save(newObs);

    expect(mockRPop).toHaveBeenCalledWith('train_history:123');
    expect(mockRPush).toHaveBeenCalledWith('train_history:123', JSON.stringify(newObs));
  });

  it('gets latest observation', async () => {
    const obs = { train: { number: '123' } };
    mockLRange.mockResolvedValueOnce([JSON.stringify(obs)]);

    const result = await store.latest('123');
    expect(result).toEqual(obs);
  });

  it('returns null if no latest observation', async () => {
    mockLRange.mockResolvedValueOnce([]);
    const result = await store.latest('123');
    expect(result).toBeNull();
  });
});
