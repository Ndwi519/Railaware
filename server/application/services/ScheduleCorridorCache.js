const { createLogger } = require('../../utils/index.js');
const log = createLogger('schedule-corridor-cache');

const MAX_CACHE_SIZE = 1000;
const TTL_MS = 15 * 60 * 1000; // 15 minutes

class ScheduleCorridorCache {
  constructor() {
    this.cache = new Map();
  }

  _evictIfFull() {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      log.info('CACHE EVICTION - oldest entry removed', { oldestKey, cacheSizeAfterEviction: this.cache.size });
    }
  }

  set(corridorId, stations) {
    this._evictIfFull();
    this.cache.set(corridorId, {
      data: stations,
      expiresAt: Date.now() + TTL_MS
    });
  }

  get(corridorId) {
    const entry = this.cache.get(corridorId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(corridorId);
      return null;
    }
    return entry.data;
  }
}

module.exports = new ScheduleCorridorCache();
