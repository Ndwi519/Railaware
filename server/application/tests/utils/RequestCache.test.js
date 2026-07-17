const RequestCache = require('../../utils/RequestCache.js');

describe('RequestCache', () => {
  it('should execute factory only once for the same key', async () => {
    const cache = new RequestCache();
    const mockFactory = jest.fn().mockResolvedValue('computed_result');

    const promise1 = cache.getOrCreate('test_key', mockFactory);
    const promise2 = cache.getOrCreate('test_key', mockFactory);

    expect(promise1).toBe(promise2);
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    expect(result1).toBe('computed_result');
    expect(result2).toBe('computed_result');
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });

  it('should support synchronous factory returns', async () => {
    const cache = new RequestCache();
    const result = await cache.getOrCreate('sync_key', () => 'sync_result');
    expect(result).toBe('sync_result');
  });

  it('should isolate keys', async () => {
    const cache = new RequestCache();
    const mockFactory1 = jest.fn().mockResolvedValue('result1');
    const mockFactory2 = jest.fn().mockResolvedValue('result2');

    const res1 = await cache.getOrCreate('key1', mockFactory1);
    const res2 = await cache.getOrCreate('key2', mockFactory2);

    expect(res1).toBe('result1');
    expect(res2).toBe('result2');
    expect(mockFactory1).toHaveBeenCalledTimes(1);
    expect(mockFactory2).toHaveBeenCalledTimes(1);
  });

  it('should remove rejected promises from cache to allow retries', async () => {
    const cache = new RequestCache();
    let callCount = 0;
    const mockFactory = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('Failed on first attempt'));
      return Promise.resolve('Success on second attempt');
    });

    // First attempt should fail
    await expect(cache.getOrCreate('retry_key', mockFactory)).rejects.toThrow('Failed on first attempt');
    
    // Second attempt should execute again and succeed
    const result = await cache.getOrCreate('retry_key', mockFactory);
    expect(result).toBe('Success on second attempt');
    expect(mockFactory).toHaveBeenCalledTimes(2);
  });

  it('should execute factory exactly once under 50 simultaneous callers', async () => {
    const cache = new RequestCache();
    const mockFactory = jest.fn().mockResolvedValue('shared_result');

    // Fire 50 concurrent calls for the same key
    const promises = Array.from({ length: 50 }, () =>
      cache.getOrCreate('concurrent_key', mockFactory)
    );

    const results = await Promise.all(promises);

    // Factory must have been called exactly once
    expect(mockFactory).toHaveBeenCalledTimes(1);
    // Every caller must receive the same resolved value
    expect(results).toHaveLength(50);
    results.forEach(r => expect(r).toBe('shared_result'));
  });

  it('should handle 50 concurrent callers waiting on a single unresolved promise', async () => {
    const cache = new RequestCache();
    
    let resolveFactoryPromise;
    const unresolvedPromise = new Promise(resolve => {
      resolveFactoryPromise = resolve;
    });
    
    const mockFactory = jest.fn().mockReturnValue(unresolvedPromise);

    // 50 callers request the same key before the promise resolves
    const promises = Array.from({ length: 50 }, () =>
      cache.getOrCreate('delayed_concurrent_key', mockFactory)
    );
    
    expect(mockFactory).toHaveBeenCalledTimes(1);
    
    // Resolve the single shared promise
    resolveFactoryPromise('delayed_shared_result');
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(50);
    results.forEach(r => expect(r).toBe('delayed_shared_result'));
  });
});
