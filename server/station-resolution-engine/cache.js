Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InMemoryResolutionCache = void 0;
/**
 * @implements {import('./types.js').StationResolutionCache}
 */
class InMemoryResolutionCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
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
  async set(cacheKey, result, ttlMs = 3600000) {
    // Evict oldest entry (FIFO) if cache is at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    // Default 1 hour TTL
    this.cache.set(cacheKey, {
      result,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
  }
}
exports.InMemoryResolutionCache = InMemoryResolutionCache;