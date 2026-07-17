/**
 * @module application/services/TrainDiscoveryStrategyManager
 * @responsibility Orchestrate registered discovery strategies in priority order.
 *
 * Internally all tracking uses strategy.id() (stable identifier).
 * strategy.name() is stored in winningStrategy only as a presentation aid.
 *
 * Execution flow:
 *  1. Evaluate supports() — skip and record if false.
 *  2. Execute discover() — catch any unexpected throws.
 *  3. Bubble provider requests as diagnostic entries.
 *  4. Short-circuit on first SUCCESS; continue on FAILED / ERROR / SKIPPED.
 *  5. After all strategies: append a UNSUPPORTED diagnostic if none succeeded.
 *
 * Dependencies: DiscoveryStatus enum.
 * Public API: register(strategy, priority), discover(context)
 */
const { DiscoveryStatus, ResolutionMethod } = require('../../domain/types/enums.js');

const EVIDENCE_HIERARCHY = {
  [ResolutionMethod.VERIFIED_TOPOLOGY]: 4,
  [ResolutionMethod.OFFLINE_GRAPH]: 3,
  [ResolutionMethod.PROVIDER_GRAPH]: 2,
  [ResolutionMethod.GEOMETRIC_PROJECTION]: 1
};

class TrainDiscoveryStrategyManager {
  constructor() {
    this.strategies = [];
  }

  /**
   * Register a strategy with an explicit priority order.
   * Lower priority numbers execute first.
   * @param {TrainDiscoveryStrategy} strategy
   * @param {number} priority
   */
  register(strategy, priority) {
    this.strategies.push({ strategy, priority });
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Orchestrates discovery through registered strategies in priority order.
   * @param {Object} context - Immutable DiscoveryContext
   * @returns {Promise<Object>} Canonical ExecutionState
   */
  async discover(context) {
    const executionState = {
      winningStrategy: null,       // display name — for presentation only
      winningStrategyId: null,     // stable id — used for mapper lookup and internal tracking
      executionOrder: this.strategies.map(s => s.strategy.id()),
      executedStrategies: [],      // ids of strategies that were executed
      skippedStrategies: [],       // ids of strategies that were skipped
      providerErrors: [],
      diagnostics: [],
      finalResult: null,
    };

    const addDiagnostic = (strategyId, stage, status, durationMs, reason, providerRequest = null) => {
      executionState.diagnostics.push({
        timestamp: new Date().toISOString(),
        strategy: strategyId,
        stage,
        status,
        durationMs,
        reason,
        providerRequest,
      });
    };

    let discoverySuccess = false;

    for (const { strategy } of this.strategies) {
      // Provider Capability Admissibility Check (ADR-011)
      const requiredStrength = strategy.minimumEvidenceStrength;
      if (requiredStrength) {
        // Evaluate station resolution if not already cached
        const stationResolution = await context.cache.getOrCreate(
          'stationResolution',
          () => context.services.stationResolver.resolve(context.location, context.corridor)
        );

        const obtainedMethod = stationResolution.method;
        const requiredScore = EVIDENCE_HIERARCHY[requiredStrength] || 0;
        const obtainedScore = EVIDENCE_HIERARCHY[obtainedMethod] || 0;

        if (obtainedScore < requiredScore) {
          executionState.skippedStrategies.push(strategy.id());
          addDiagnostic(strategy.id(), 'Provider Admissibility', DiscoveryStatus.PREREQUISITE_UNAVAILABLE, 0, `Provider requires evidence strength ${requiredStrength} but only ${obtainedMethod || 'NONE'} was available.`);
          continue;
        }
      }

      const supportResult = strategy.supports(context);
      if (!supportResult.supported) {
        executionState.skippedStrategies.push(strategy.id());
        addDiagnostic(strategy.id(), 'Discovery Evaluation', DiscoveryStatus.SKIPPED, 0, supportResult.reason);
        continue;
      }

      executionState.executedStrategies.push(strategy.id());

      let stratResult;
      const startTime = Date.now();
      try {
        stratResult = await strategy.discover(context);
      } catch (err) {
        // Safe fallback when a strategy violates the no-throw contract
        const elapsedTimeMs = Date.now() - startTime;
        stratResult = {
          status: DiscoveryStatus.ERROR,
          provider: strategy.name(),
          confidence: null,
          trainTarget: null,
          discoveredTrains: [],
          providerRequests: [],
          diagnostics: [],
          elapsedTimeMs,
          error: err.message,
          reason: null,
          providerData: null,
        };
      }

      if (stratResult.providerRequests && stratResult.providerRequests.length > 0) {
        stratResult.providerRequests.forEach(req => {
          addDiagnostic(strategy.id(), 'Provider Request', req.status || DiscoveryStatus.SUCCESS, req.duration, req.summary, req);
        });
      }

      addDiagnostic(strategy.id(), 'Discovery Result', stratResult.status, stratResult.elapsedTimeMs, stratResult.reason || stratResult.error || null);

      if (stratResult.status === DiscoveryStatus.ERROR) {
        if (stratResult.error) executionState.providerErrors.push(stratResult.error);
      } else if (stratResult.status === DiscoveryStatus.SKIPPED || stratResult.status === DiscoveryStatus.PREREQUISITE_UNAVAILABLE) {
        executionState.skippedStrategies.push(strategy.id());
      } else if (stratResult.status === DiscoveryStatus.SUCCESS) {
        executionState.winningStrategy = strategy.name();
        executionState.winningStrategyId = strategy.id();
        executionState.finalResult = stratResult;
        discoverySuccess = true;
        break;
      }
      // DiscoveryStatus.FAILED: continue to next strategy silently
    }

    if (!discoverySuccess) {
      addDiagnostic('strategy-manager', 'Final Evaluation', DiscoveryStatus.PREREQUISITE_UNAVAILABLE, 0, 'All discovery strategies skipped, rejected, or failed');
    }

    return executionState;
  }
}

module.exports = TrainDiscoveryStrategyManager;
