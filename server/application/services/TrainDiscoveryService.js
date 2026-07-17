/**
 * @module application/services/TrainDiscoveryService
 * @responsibility Resolve the nearest corridor, build the immutable DiscoveryContext,
 * delegate to the StrategyManager, and assemble the final discovery result.
 *
 * The DiscoveryContext is deeply frozen (plain-object/array values) so strategies
 * cannot accidentally mutate shared request-scoped state.
 * RequestCache is not frozen — it intentionally maintains mutable state.
 *
 * Dependencies: CorridorResolver, StationResolver, StrategyManager, discoveryMappers,
 *               deepFreeze, RequestCache, DiscoveryStatus, ResolutionStatus.
 * Public API: discoverTrain(lat, lng)
 */
const crypto = require('crypto');
const RequestCache = require('../utils/RequestCache.js');
const { deepFreeze } = require('../utils/deepFreeze.js');
const { DiscoveryStatus, ResolutionStatus } = require('../../domain/types/enums.js');

class TrainDiscoveryService {
  /**
   * @param {Object} corridorResolver
   * @param {Object} stationResolver
   * @param {Object} strategyManager
   * @param {Record<string, Object>} discoveryMappers  Keyed by strategy id.
   */
  constructor(corridorResolver, stationResolver, strategyManager, discoveryMappers) {
    this.corridorResolver = corridorResolver;
    this.stationResolver = stationResolver;
    this.strategyManager = strategyManager;
    this.discoveryMappers = discoveryMappers;
  }

  /**
   * Resolves the nearest corridor, creates the immutable DiscoveryContext,
   * and delegates to the StrategyManager.
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<Object>}
   */
  async discoverTrain(lat, lng) {
    const location = deepFreeze({ lat, lng });

    // 1. Resolve Nearest Corridor
    const nearestCorridor = await this.corridorResolver.resolveNearest(location, 500);
    const corridor = nearestCorridor ? deepFreeze({ ...nearestCorridor }) : null;

    // 2. Create Immutable DiscoveryContext
    // RequestCache is intentionally not frozen — it manages mutable per-request state.
    const cache = new RequestCache();
    const context = deepFreeze({
      requestId: crypto.randomUUID(),
      location,
      corridor,
      services: { stationResolver: this.stationResolver },
      cache,
    });

    // 3. Delegate to Strategy Manager
    const executionState = await this.strategyManager.discover(context);

    let mappedDomain = { trainTarget: null, journey: null };

    // 4. Transform provider DTOs to domain models if a strategy succeeded
    if (executionState.finalResult && executionState.finalResult.status === DiscoveryStatus.SUCCESS) {
      const mapper = this.discoveryMappers[executionState.winningStrategyId];
      if (mapper) {
        mappedDomain = mapper.map(executionState.finalResult, context);
      }
    }

    // 5. Assemble legacy corridor shape for backward-compatible API response
    let legacyCorridor = null;
    if (nearestCorridor) {
      legacyCorridor = { ...nearestCorridor };
      const stationResolution = await cache.getOrCreate(
        'stationResolution',
        () => Promise.resolve({ status: ResolutionStatus.UNRESOLVED })
      );
      legacyCorridor.resolutionStatus = stationResolution.status;
      legacyCorridor.nearestBoundingStations =
        stationResolution.status === ResolutionStatus.RESOLVED
          ? {
              from: stationResolution.previousStation?.code,
              to: stationResolution.nextStation?.code,
            }
          : null;
      legacyCorridor.stationResolutionDetails = stationResolution;
    }

    return {
      trainTarget: mappedDomain.trainTarget,
      journey: mappedDomain.journey,
      corridor: legacyCorridor,
      discoveredTrains: executionState.finalResult?.discoveredTrains || [],
      providerError: executionState.providerErrors.length > 0 ? executionState.providerErrors[0] : null,
      strategyDiagnostics: executionState.diagnostics,
    };
  }
}

module.exports = TrainDiscoveryService;
