const { TraversalEventType } = require('./TraversalEventType.js');
const { TraversalConfig } = require('./TraversalConfig.js');

class TraversalEventDetector {
  /**
   * Detects traversal events by comparing the current state/input against the previous state.
   *
   * @param {Object|null} previousState
   * @param {Object|null} projectionResult
   * @param {Object} routeContext
   * @returns {Array<Object>} List of semantic events
   */
  detectEvents(previousState, projectionResult, routeContext) {
    if (!previousState || previousState.state === 'INITIALIZING') {
      if (projectionResult) {
        return [{ type: TraversalEventType.TRACKING_STARTED, projection: projectionResult, routeContext }];
      }
      return [];
    }

    const events = [];
    const lastStableProjection = previousState.lastStableProjection;

    // Detect GPS Loss
    if (!projectionResult) {
      if (previousState.state === 'TRACKING' || previousState.state === 'AT_STATION') {
        events.push({ type: TraversalEventType.LOST_TRACKING });
      }
      return events;
    }

    // Detect Impossible Jumps
    if (lastStableProjection && projectionResult.segmentIndex === lastStableProjection.segmentIndex) {
      const jumpDistance = Math.abs(projectionResult.alongTrackDistanceMetres - lastStableProjection.alongTrackDistanceMetres);
      if (jumpDistance > TraversalConfig.IMPOSSIBLE_JUMP_THRESHOLD_METRES) {
        if (previousState.state !== 'RECOVERING' && previousState.state !== 'LOST') {
          events.push({ type: TraversalEventType.IMPOSSIBLE_JUMP });
        }
        return events; // Ignore other events if jumping impossibly
      }
    }

    // Detect Recovery vs Steady Update
    if (previousState.state === 'RECOVERING' || previousState.state === 'LOST') {
      events.push({ type: TraversalEventType.TRACKING_RECOVERED, projection: projectionResult, routeContext });
    } else {
      events.push({ type: TraversalEventType.PROJECTION_UPDATED, projection: projectionResult, routeContext });
    }

    // Detect Segment & Branch Transitions
    if (routeContext.currentSegmentIndex !== previousState.currentSegmentIndex) {
      events.push({
        type: TraversalEventType.ENTERED_SEGMENT,
        segmentIndex: routeContext.currentSegmentIndex
      });
    }

    if (routeContext.branchId !== previousState.currentBranchId) {
      events.push({
        type: TraversalEventType.ENTERED_BRANCH,
        branchId: routeContext.branchId
      });
    }

    // Detect Direction
    if (lastStableProjection && projectionResult.segmentIndex === lastStableProjection.segmentIndex) {
      const delta = projectionResult.alongTrackDistanceMetres - lastStableProjection.alongTrackDistanceMetres;
      if (Math.abs(delta) > TraversalConfig.DIRECTION_JITTER_THRESHOLD_METRES) {
        const isForward = delta > 0;
        if (previousState.traversalDirection !== isForward) {
          events.push({ type: TraversalEventType.DIRECTION_CHANGED, direction: isForward });
        }
      }
    }

    // Detect Station Proximity Changes
    const isAtStation = this._isAtStation(projectionResult, routeContext);
    if (isAtStation && previousState.state === 'TRACKING') {
      const station = this._getNearbyStation(projectionResult, routeContext);
      events.push({ type: TraversalEventType.ARRIVED_AT_STATION, station: station?.station, routeContext });
    } else if (!isAtStation && previousState.state === 'AT_STATION') {
      events.push({ type: TraversalEventType.DEPARTED_STATION });
    }

    // Detect Semantically Passed Station
    if (previousState.routeContext && previousState.routeContext.previousStation) {
      const prevStationCodeOld = previousState.routeContext.previousStation.station.code;
      const prevStationCodeNew = routeContext.previousStation ? routeContext.previousStation.station.code : null;
      if (prevStationCodeNew && prevStationCodeNew !== prevStationCodeOld) {
        events.push({ type: TraversalEventType.PASSED_STATION, station: routeContext.previousStation.station });
      }
    } else if (!previousState.routeContext || !previousState.routeContext.previousStation) {
      if (routeContext.previousStation) {
        events.push({ type: TraversalEventType.PASSED_STATION, station: routeContext.previousStation.station });
      }
    }

    return events;
  }

  _isAtStation(projection, routeContext) {
    return !!this._getNearbyStation(projection, routeContext);
  }

  _getNearbyStation(projection, routeContext) {
    if (!projection) return null;

    // Check previous station
    if (routeContext.previousStation && routeContext.previousStation.corridorSegmentIndex === projection.segmentIndex) {
      const dist = Math.abs(projection.alongTrackDistanceMetres - routeContext.previousStation.alongTrackDistanceMetres);
      if (dist <= TraversalConfig.AT_STATION_THRESHOLD_METRES) return routeContext.previousStation;
    }

    // Check next station
    if (routeContext.nextStation && routeContext.nextStation.corridorSegmentIndex === projection.segmentIndex) {
      const dist = Math.abs(projection.alongTrackDistanceMetres - routeContext.nextStation.alongTrackDistanceMetres);
      if (dist <= TraversalConfig.AT_STATION_THRESHOLD_METRES) return routeContext.nextStation;
    }

    return null;
  }
}

module.exports = {
  TraversalEventDetector
};
