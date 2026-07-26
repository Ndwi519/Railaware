const { deepFreeze } = require('../utils/deepFreeze.js');
const { TraversalStateType } = require('./TraversalStateType.js');
const { TraversalConfig } = require('./TraversalConfig.js');

/**
 * Immutable domain object representing the state of the user's journey
 * through the corridor over time.
 */
class TraversalState {
  /**
   * @param {Object} params
   * @param {string} params.state - Current machine state
   * @param {string|null} params.currentBranchId
   * @param {number|null} params.currentSegmentIndex
   * @param {number|null} params.previousSegmentIndex
   * @param {boolean|null} params.traversalDirection - true for forward, false for reverse
   * @param {Object|null} params.routeContext - The last matched route context
   * @param {Object|null} params.lastStableProjection - The last stable ProjectionResult
   * @param {Array<Object>} params.history - Array of semantic traversal events
   */
  constructor({
    state = TraversalStateType.INITIALIZING,
    currentBranchId = null,
    currentSegmentIndex = null,
    previousSegmentIndex = null,
    traversalDirection = null,
    routeContext = null,
    lastStableProjection = null,
    history = []
  }) {
    this.state = state;
    this.currentBranchId = currentBranchId;
    this.currentSegmentIndex = currentSegmentIndex;
    this.previousSegmentIndex = previousSegmentIndex;
    this.traversalDirection = traversalDirection;
    this.routeContext = routeContext;
    this.lastStableProjection = lastStableProjection;

    // Copy and bound history to ensure immutability and memory limits
    const slicedHistory = history.slice(-TraversalConfig.MAX_HISTORY_EVENTS);
    this.history = Object.freeze([...slicedHistory]);

    deepFreeze(this);
  }
}

module.exports = {
  TraversalState
};
