import { jest } from '@jest/globals';
import { InMemoryResolutionCache } from '../../station-resolution-engine/cache.js';

describe('InMemoryResolutionCache', () => {
  let cache;

  beforeEach(() => {
    cache = new InMemoryResolutionCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null for non-existent key', async () => {
    const result = await cache.get('missing');
    expect(result).toBeNull();
  });

  it('should set and get a value', async () => {
    await cache.set('key1', { data: 'test' });
    const result = await cache.get('key1');
    expect(result).toEqual({ data: 'test' });
  });

  it('should return null if expired', async () => {
    await cache.set('key2', { data: 'expired' }, 100);
    
    // Fast-forward time by 200ms
    jest.advanceTimersByTime(200);
    
    const result = await cache.get('key2');
    expect(result).toBeNull();
  });

  it('should respect null ttl as infinite', async () => {
    await cache.set('key3', { data: 'infinite' }, null);
    
    // Fast-forward time by 1 year
    jest.advanceTimersByTime(1000 * 60 * 60 * 24 * 365);
    
    const result = await cache.get('key3');
    expect(result).toEqual({ data: 'infinite' });
  });
});
