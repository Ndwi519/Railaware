/**
 * @implements {import('./types.js').StationResolutionCache}
 */
export class InMemoryResolutionCache {
  constructor() {
    this.cache = new Map();
  }

  async get(cacheKey) {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }

  async set(cacheKey, result, ttlMs = 3600000) { // Default 1 hour TTL
    this.cache.set(cacheKey, {
      result,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
  }
}
