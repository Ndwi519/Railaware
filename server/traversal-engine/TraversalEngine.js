const { TraversalState } = require('./TraversalState.js');
const { TraversalStateType } = require('./TraversalStateType.js');
const { TraversalEventType } = require('./TraversalEventType.js');

/**
 * Pure deterministic reducer that maintains semantic traversal progression across successive updates.
 */
class TraversalEngine {

  /**
   * Evaluates the next traversal state by applying traversal events deterministically.
   *
   * @param {TraversalState|null} previousState
   * @param {Array<Object>} events
   * @returns {TraversalState}
   */
  update(previousState, events) {
    let nextStateEnum = previousState ? previousState.state : TraversalStateType.INITIALIZING;
    const history = previousState ? [...previousState.history] : [];

    let currentBranchId = previousState ? previousState.currentBranchId : null;
    let currentSegmentIndex = previousState ? previousState.currentSegmentIndex : null;
    let previousSegmentIndex = previousState ? previousState.previousSegmentIndex : null;
    let traversalDirection = previousState ? previousState.traversalDirection : null;

    let routeContext = previousState ? previousState.routeContext : null;
    let lastStableProjection = previousState ? previousState.lastStableProjection : null;

    // Process events sequentially to apply state transitions
    for (const event of events) {
      history.push(event);

      switch (event.type) {
        case TraversalEventType.TRACKING_STARTED:
          nextStateEnum = TraversalStateType.TRACKING;
          currentBranchId = event.routeContext.branchId;
          currentSegmentIndex = event.routeContext.currentSegmentIndex;
          previousSegmentIndex = event.routeContext.currentSegmentIndex;
          routeContext = event.routeContext;
          lastStableProjection = event.projection;
          break;

        case TraversalEventType.LOST_TRACKING:
          if (nextStateEnum === TraversalStateType.TRACKING || nextStateEnum === TraversalStateType.AT_STATION) {
            nextStateEnum = TraversalStateType.RECOVERING;
          }
          break;

        case TraversalEventType.IMPOSSIBLE_JUMP:
          if (nextStateEnum !== TraversalStateType.RECOVERING && nextStateEnum !== TraversalStateType.LOST) {
            nextStateEnum = TraversalStateType.RECOVERING;
          }
          break;

        case TraversalEventType.TRACKING_RECOVERED:
          if (nextStateEnum === TraversalStateType.RECOVERING || nextStateEnum === TraversalStateType.LOST) {
            nextStateEnum = TraversalStateType.TRACKING;
          }
          routeContext = event.routeContext;
          lastStableProjection = event.projection;
          break;

        case TraversalEventType.PROJECTION_UPDATED:
          routeContext = event.routeContext;
          lastStableProjection = event.projection;
          break;

        case TraversalEventType.ENTERED_SEGMENT:
          previousSegmentIndex = currentSegmentIndex;
          currentSegmentIndex = event.segmentIndex;
          break;

        case TraversalEventType.ENTERED_BRANCH:
          currentBranchId = event.branchId;
          break;

        case TraversalEventType.DIRECTION_CHANGED:
          traversalDirection = event.direction;
          break;

        case TraversalEventType.ARRIVED_AT_STATION:
          if (nextStateEnum === TraversalStateType.TRACKING) {
            nextStateEnum = TraversalStateType.AT_STATION;
          }
          routeContext = event.routeContext;
          break;

        case TraversalEventType.DEPARTED_STATION:
          if (nextStateEnum === TraversalStateType.AT_STATION) {
            nextStateEnum = TraversalStateType.TRACKING;
          }
          break;

        case TraversalEventType.PASSED_STATION:
          // Informational event
          break;
      }
    }

    return new TraversalState({
      state: nextStateEnum,
      currentBranchId,
      currentSegmentIndex,
      previousSegmentIndex,
      traversalDirection,
      routeContext,
      lastStableProjection,
      history
    });
  }
}

module.exports = {
  TraversalEngine
};
