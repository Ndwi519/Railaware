const { RouteContext } = require('./RouteContext.js');
const { BranchStatus } = require('./BranchDecision.js');

/**
 * Topological Domain Service: Extracts bounding stations based on the business decision.
 */
class RouteContextBuilder {
  /**
   * Consumes the decision and traverses the topology to construct the final RouteContext.
   *
   * @param {Object} branchDecision
   * @param {Object} assembledCorridor
   * @param {number} currentSegmentIndex
   * @param {number} userAlongTrackDistanceMetres
   * @param {Array} matchedStations (output of station-matcher, containing corridorSegmentIndex and alongTrackDistanceMetres)
   * @returns {RouteContext}
   */
  buildContext(branchDecision, assembledCorridor, currentSegmentIndex, userAlongTrackDistanceMetres, matchedStations) {
    if (branchDecision.status !== BranchStatus.SELECTED) {
      throw new Error('Cannot build RouteContext without a SELECTED branch decision.');
    }

    const segments = assembledCorridor.getTraversableSegments();
    const selectedSegmentIndex = assembledCorridor.getSegmentIndex(branchDecision.selectedBranchId);
    const travelDirection = branchDecision.travelDirection;

    if (selectedSegmentIndex === -1) {
      throw new Error('Invalid selectedBranchId. No matching topological segment.');
    }
    if (!travelDirection) {
      throw new Error('travelDirection is required on BranchDecision to build RouteContext.');
    }

    // 1. Traverse to find next station
    let nextStation = null;
    let prevStation = null;

    // Determine movement semantics
    const isForward = travelDirection === 'FORWARD';

    // Sort stations by distance for easier traversal. We sort ascending (start node to end node)
    const stationsOnBranch = matchedStations.filter(s => s.corridorSegmentIndex === selectedSegmentIndex)
      .sort((a, b) => a.alongTrackDistanceMetres - b.alongTrackDistanceMetres);

    const stationsOnCurrent = matchedStations.filter(s => s.corridorSegmentIndex === currentSegmentIndex)
      .sort((a, b) => a.alongTrackDistanceMetres - b.alongTrackDistanceMetres);

    // If the user is on the selected branch
    if (currentSegmentIndex === selectedSegmentIndex) {
      if (isForward) {
        for (const st of stationsOnBranch) {
          if (st.alongTrackDistanceMetres >= userAlongTrackDistanceMetres) {
            if (!nextStation) nextStation = st;
          } else {
            prevStation = st;
          }
        }
      } else {
        // BACKWARD travel: next station is decreasing along-track distance
        for (let i = stationsOnBranch.length - 1; i >= 0; i--) {
          const st = stationsOnBranch[i];
          if (st.alongTrackDistanceMetres <= userAlongTrackDistanceMetres) {
            if (!nextStation) nextStation = st;
          } else {
            prevStation = st;
          }
        }
      }
    } else {
      // User is on a different segment, moving into this branch
      if (isForward) {
        if (stationsOnBranch.length > 0) nextStation = stationsOnBranch[0];
        for (const st of stationsOnCurrent) {
          if (st.alongTrackDistanceMetres <= userAlongTrackDistanceMetres) prevStation = st;
        }
      } else {
        // BACKWARD travel
        if (stationsOnBranch.length > 0) nextStation = stationsOnBranch[stationsOnBranch.length - 1];
        for (let i = stationsOnCurrent.length - 1; i >= 0; i--) {
          const st = stationsOnCurrent[i];
          if (st.alongTrackDistanceMetres >= userAlongTrackDistanceMetres) prevStation = st;
        }
      }
    }

    // If we didn't find them on the current segments, traverse the topology using the Corridor API
    if (!nextStation) {
       // Moving FORWARD means looking at end node. Moving BACKWARD means looking at start node.
       const connected = assembledCorridor.getConnectedSegments(selectedSegmentIndex, isForward);
       if (connected.length > 0) {
         const nextSegIndex = connected[0].segmentIndex;
         const nextSts = matchedStations
            .filter(s => s.corridorSegmentIndex === nextSegIndex)
            .sort((a, b) => a.alongTrackDistanceMetres - b.alongTrackDistanceMetres);

         if (nextSts.length > 0) {
           nextStation = isForward ? nextSts[0] : nextSts[nextSts.length - 1];
         }
       }
    }

    if (!prevStation) {
       // Previous station is in the opposite direction of travel
       const connected = assembledCorridor.getConnectedSegments(currentSegmentIndex, !isForward);
       if (connected.length > 0) {
         const prevSegIndex = connected[0].segmentIndex;
         const prevSts = matchedStations
            .filter(s => s.corridorSegmentIndex === prevSegIndex)
            .sort((a, b) => a.alongTrackDistanceMetres - b.alongTrackDistanceMetres);

         if (prevSts.length > 0) {
           prevStation = isForward ? prevSts[prevSts.length - 1] : prevSts[0];
         }
       }
    }

    return new RouteContext({
      branchId: branchDecision.selectedBranchId,
      currentSegmentIndex,
      previousStation: prevStation,
      nextStation: nextStation
    });
  }
}

module.exports = {
  RouteContextBuilder
};
