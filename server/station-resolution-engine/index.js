Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StationResolutionEngine = void 0;
var _cache = require("./cache.js");
var _enums = require("../domain/types/enums.js");
require("./types.js");
var _deepFreeze2 = require("../utils/deepFreeze.js");
class StationResolutionEngine {
  /**
   * @param {import('./types.js').ResolutionStrategy[]} strategies
   * @param {import('./types.js').StationResolutionCache} cache
   */
  constructor(strategies, cache = new _cache.InMemoryResolutionCache()) {
    this.strategies = strategies;
    this.cache = cache;
  }

  /**
   * @param {Object} gps { lat, lng }
   * @param {Object} snappedGeometry Result from CorridorResolver
   * @returns {Promise<import('./types.js').ResolutionResult>}
   */
  async resolve(gps, snappedGeometry) {
    if (!snappedGeometry || !snappedGeometry.corridorGeometry || snappedGeometry.corridorGeometry.length === 0) {
      return this._buildUnresolved('No snapped geometry provided');
    }

    // Use the first coordinate of the snapped geometry as a cache key to avoid jitter
    // We could hash the corridorGeometry array too, but this is a simple string key
    const cacheKey = `resolution_${snappedGeometry.corridorGeometry[0].lat}_${snappedGeometry.corridorGeometry[0].lng}`;
    const cachedResult = await this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    const attempts = [];
    for (const strategy of this.strategies) {
      const startTime = Date.now();
      try {
        const result = await strategy.resolve(gps, snappedGeometry);
        const durationMs = Date.now() - startTime;
        const hasStations = result.previousStation && result.nextStation;
        const hasProvenance = result.method && result.confidence && result.evidenceSources && result.evidenceSources.length > 0;
        if (result.success && hasStations && hasProvenance) {
          attempts.push({
            strategy: strategy.name,
            success: true,
            reason: result.reason || 'Resolved successfully',
            durationMs
          });
          const finalResult = (0, _deepFreeze2.deepFreeze)({
            status: _enums.ResolutionStatus.RESOLVED,
            previousStation: result.previousStation,
            nextStation: result.nextStation,
            method: result.method,
            confidence: result.confidence,
            confidenceReasons: result.confidenceReasons || [],
            evidenceSources: result.evidenceSources,
            attempts
          });
          await this.cache.set(cacheKey, finalResult);
          return finalResult;
        } else if (result.success) {
          attempts.push({
            strategy: strategy.name,
            success: false,
            reason: 'Strategy returned success but failed to provide complete provenance (stations, method, confidence, evidenceSources)',
            durationMs
          });
        } else {
          attempts.push({
            strategy: strategy.name,
            success: false,
            reason: result.reason || 'Strategy returned unsuccessful',
            durationMs
          });
        }
      } catch (error) {
        attempts.push({
          strategy: strategy.name,
          success: false,
          reason: `Exception: ${error.message}`,
          durationMs: Date.now() - startTime
        });
      }
    }
    const finalResult = (0, _deepFreeze2.deepFreeze)({
      status: _enums.ResolutionStatus.UNRESOLVED,
      previousStation: null,
      nextStation: null,
      method: null,
      confidence: null,
      confidenceReasons: [],
      evidenceSources: [],
      attempts
    });

    // Cache UNRESOLVED state for a short time to prevent spamming APIs (1 minute)
    await this.cache.set(cacheKey, finalResult, 60000);
    return finalResult;
  }
  _buildUnresolved(reason) {
    return (0, _deepFreeze2.deepFreeze)({
      status: _enums.ResolutionStatus.UNRESOLVED,
      previousStation: null,
      nextStation: null,
      method: null,
      confidence: null,
      confidenceReasons: [],
      evidenceSources: [],
      attempts: [{
        strategy: 'Pre-flight check',
        success: false,
        reason,
        durationMs: 0
      }]
    });
  }
}
exports.StationResolutionEngine = StationResolutionEngine;