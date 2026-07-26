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
   * @param {Object} options
   * @param {Object} options.corridorResolver
   * @param {Object} options.stationResolver
   * @param {Object} options.strategyManager
   * @param {Record<string, Object>} options.discoveryMappers
   * @param {Object} options.directionalInference
   * @param {Object} options.branchEvidenceBuilder
   * @param {Object} options.routeSelection
   * @param {Object} options.routeContextBuilder
   */
  constructor({
    corridorResolver,
    stationResolver,
    strategyManager,
    discoveryMappers,
    directionalInference,
    branchEvidenceBuilder,
    routeSelection,
    routeContextBuilder
  }) {
    this.corridorResolver = corridorResolver;
    this.stationResolver = stationResolver;
    this.strategyManager = strategyManager;
    this.discoveryMappers = discoveryMappers;
    this.directionalInference = directionalInference;
    this.branchEvidenceBuilder = branchEvidenceBuilder;
    this.routeSelection = routeSelection;
    this.routeContextBuilder = routeContextBuilder;
  }

  /**
   * Orchestrates the routing pipeline and resolves train state.
   * @param {Object} discoveryContext
   * @returns {Promise<Object>} containing the RoutingPipelineResult and train data
   */
  async discoverTrain(discoveryContext) {
    // 1. Resolve Nearest Corridor (Projection)
    const { latitude, longitude } = discoveryContext.observation;
    const location = deepFreeze({ lat: latitude, lng: longitude });
    const resolutionResult = await this.corridorResolver.resolveNearest(location, 1500);
    const nearestCorridor = resolutionResult ? deepFreeze({ ...resolutionResult.nearestCorridor }) : null;
    const corridor = nearestCorridor ? deepFreeze({ ...nearestCorridor }) : null;

    // Build the context for Strategy Manager
    const cache = new RequestCache();
    const strategyContext = deepFreeze({
      requestId: crypto.randomUUID(),
      location,
      corridor,
      services: { stationResolver: this.stationResolver },
      cache,
    });

    // Strategy Manager execution
    const executionState = await this.strategyManager.discover(strategyContext);

    let mappedDomain = { trainTarget: null, journey: null };

    if (executionState.finalResult && executionState.finalResult.status === DiscoveryStatus.SUCCESS) {
      const mapper = this.discoveryMappers[executionState.winningStrategyId];
      if (mapper) {
        mappedDomain = mapper.map(executionState.finalResult, strategyContext);
      }
    }

    // Execute Routing Pipeline
    let projectionResult = null;
    let directionInferenceResult = null;
    let routeSelectionDecision = null;
    let routeContext = null;

    let legacyCorridor = null;

    if (nearestCorridor) {
      legacyCorridor = { ...nearestCorridor };

      if (resolutionResult.assembledCorridor) {
        try {
          projectionResult = resolutionResult.projectionResult;

          directionInferenceResult = this.directionalInference.inferDirection(
            discoveryContext,
            projectionResult
          );

          const evidence = this.branchEvidenceBuilder.buildEvidence(
            projectionResult,
            directionInferenceResult,
            resolutionResult.assembledCorridor,
            discoveryContext.routingState
          );

          routeSelectionDecision = this.routeSelection.evaluate(evidence);

          if (routeSelectionDecision.status === 'SELECTED') {
            routeContext = this.routeContextBuilder.buildContext(
              routeSelectionDecision,
              resolutionResult.assembledCorridor,
              projectionResult.corridorSegmentIndex,
              projectionResult.alongTrackDistanceMetres,
              resolutionResult.stationsOutput
            );
          }
        } catch (e) {
          const logger = require('../utils/logger.js');
          logger.error('Routing Pipeline Error', e);
        }
      }

      // ==========================================
      // SHADOW MODE INTENTIONAL
      // ==========================================
      // RouteSelection thresholds have not yet been validated against real routing fixtures.
      // The new trajectory ownership implementation has not yet been validated under realistic multi-session traffic.
      // Production cutover requires a separate validation milestone.
      // Legacy routing remains authoritative.
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

    const { RoutingPipelineResult } = require('../models/RoutingPipelineResult.js');
    const routingResult = new RoutingPipelineResult({
      discoveryContext,
      nearestCorridor,
      projectionResult,
      directionInferenceResult,
      routeSelectionDecision,
      routeContext
    });

    return {
      trainTarget: mappedDomain.trainTarget,
      journey: mappedDomain.journey,
      corridor: legacyCorridor,
      discoveredTrains: executionState.finalResult
        ? (executionState.finalResult.discoveredTrains || [])
        : (executionState.providerErrors.length > 0
          ? null
          : (executionState.providerQueried ? [] : null)),
      providerError: executionState.providerErrors.length > 0 ? executionState.providerErrors[0] : null,
      strategyDiagnostics: executionState.diagnostics,
      routingResult
    };
  }
}

module.exports = TrainDiscoveryService;
