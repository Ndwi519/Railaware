/**
 * Base interface for Train Discovery Strategies.
 * Implementations must override these methods.
 * 
 * @property {import('../../../domain/types/enums.js').ResolutionMethod} [minimumEvidenceStrength] - Optional minimum evidence required by the provider.
 */
class TrainDiscoveryStrategy {
  /**
   * Returns the unique name of the strategy.
   * @returns {string}
   */
  name() {
    throw new Error('Not implemented');
  }

  /**
   * Returns a stable identifier for the strategy used for mapper lookups.
   * @returns {string}
   */
  id() {
    throw new Error('Not implemented');
  }

  /**
   * Evaluates the given context to determine if this strategy has the required data to execute.
   * MUST NEVER perform heavy operations (network, overpass, station resolution).
   * @param {Object} context - The immutable discovery context { requestId, location, corridor, services, cache }
   * @returns {{ supported: boolean, reason: string | null }} 
   */
  supports(context) {
    throw new Error('Not implemented');
  }

  /**
   * Executes the train discovery logic.
   * Must return a standardized result object. Never throw exceptions intentionally.
   * @param {Object} context 
   * @returns {Promise<Object>} The standard strategy result:
   * {
   *   status: DiscoveryStatus,
   *   provider: string,
   *   confidence: number | null,
   *   discoveredTrains: Array,
   *   trainTarget: string | null,
   *   providerRequests: Array,
   *   diagnostics: Array,
   *   elapsedTimeMs: number,
   *   error: string | null,
   *   providerData: any
   * }
   */
  async discover(context) {
    throw new Error('Not implemented');
  }
}
module.exports = TrainDiscoveryStrategy;