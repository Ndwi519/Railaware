const LRUCache = require('lru-cache');
const { DEFAULT_THRESHOLDS } = require('../../config/thresholds.js');

class InMemoryCorridorCache {
  constructor() {
    this.cache = new LRUCache({
      max: 1000,
      ttl: DEFAULT_THRESHOLDS.corridorCacheTtlMs || 5 * 60 * 1000
    });
  }

  /**
   * Merges newly fetched Overpass elements into the session's cumulative spatial cache.
   * This guarantees that as a train moves, previously traversed tracks (like the seed way)
   * are not dropped from the active graph even if they fall outside the current query radius.
   *
   * @param {string} sessionId
   * @param {Array<Object>} newElements - Raw elements from Overpass API
   * @returns {Array<Object>} The merged cumulative elements array
   */
  mergeAndGetElements(sessionId, newElements) {
    if (!sessionId) {
      return newElements;
    }

    let sessionCache = this.cache.get(sessionId);
    if (!sessionCache) {
      sessionCache = new Map();
      this.cache.set(sessionId, sessionCache);
    }

    // Merge new elements into the session cache
    for (const el of newElements) {
      if (el && el.id && el.type) {
        sessionCache.set(`${el.type}:${el.id}`, el);
      }
    }

    // Convert map back to array for downstream processing
    return Array.from(sessionCache.values());
  }
}

module.exports = {
  InMemoryCorridorCache,
  // Singleton instance for the application
  corridorCache: new InMemoryCorridorCache()
};
