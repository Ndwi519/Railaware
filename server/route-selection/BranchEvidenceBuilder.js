const { BranchEvidence } = require('./BranchEvidence.js');
const { RouteSelectionEvidence } = require('./RouteSelectionEvidence.js');
const { MovementState } = require('../directional-inference/MovementState.js');

function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const y = Math.sin(dLng) * Math.cos(rLat2);
  const x = Math.cos(rLat1) * Math.sin(rLat2) -
            Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function calculateDivergence(heading1, heading2) {
  let diff = Math.abs(heading1 - heading2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

const { TravelDirection } = require('./TravelDirection.js');

/**
 * Spatial Domain Service: Evaluates downstream branches.
 */
class BranchEvidenceBuilder {
  /**
   * Consumes spatial evidence and evaluates branch alignments.
   * Does NOT make business decisions or traverse topology.
   *
   * @param {Object} projectionResult
   * @param {Object} directionalInferenceResult
   * @param {Object} assembledCorridor
   * @param {Object} routingState
   * @returns {RouteSelectionEvidence}
   */
  buildEvidence(projectionResult, directionalInferenceResult, assembledCorridor, routingState = {}) {
    const movementState = directionalInferenceResult.movementState;
    const heading = directionalInferenceResult.headingDegrees;

    // Fallback if we don't have movement state
    if (!movementState || movementState === MovementState.UNKNOWN) {
      return new RouteSelectionEvidence({
        movementState: movementState || MovementState.UNKNOWN,
        travelDirection: TravelDirection.UNKNOWN,
        downstreamBranches: []
      });
    }

    const segments = assembledCorridor.getTraversableSegments();
    const currentIndex = projectionResult.corridorSegmentIndex;
    if (currentIndex === undefined || currentIndex === null || !segments[currentIndex]) {
      return new RouteSelectionEvidence({
        movementState,
        travelDirection: TravelDirection.UNKNOWN,
        downstreamBranches: []
      });
    }

    const currentSegmentCoords = segments[currentIndex];

    let travelDirection = TravelDirection.UNKNOWN;

    if (movementState === MovementState.STATIONARY) {
      travelDirection = TravelDirection.STATIONARY;
    } else if (movementState === MovementState.MOVING && heading !== null) {
      if (routingState.lastProjectedSegmentIndex !== undefined && routingState.lastProjectedSegmentIndex !== currentIndex) {
        // Do not fabricate direction across a segment transition
        travelDirection = TravelDirection.UNKNOWN;
      } else {
        // Compare movement direction with corridor direction
        const startCoord = currentSegmentCoords[0];
        const endCoord = currentSegmentCoords[currentSegmentCoords.length - 1];
        const segmentBearing = calculateBearing(startCoord.lat, startCoord.lng, endCoord.lat, endCoord.lng);
        const divergence = calculateDivergence(heading, segmentBearing);

        if (divergence < 90) {
          travelDirection = TravelDirection.FORWARD;
        } else {
          travelDirection = TravelDirection.BACKWARD;
        }
      }
    }

    if (travelDirection === TravelDirection.UNKNOWN || travelDirection === TravelDirection.STATIONARY) {
      return new RouteSelectionEvidence({
        movementState,
        travelDirection,
        downstreamBranches: []
      });
    }

    let comparisonPoint = null;
    if (travelDirection === TravelDirection.FORWARD) {
      comparisonPoint = currentSegmentCoords[currentSegmentCoords.length - 1];
    } else if (travelDirection === TravelDirection.BACKWARD) {
      comparisonPoint = currentSegmentCoords[0];
    }

    const isForwardMovement = travelDirection === TravelDirection.FORWARD;
    const connectedSegments = assembledCorridor.getConnectedSegments(currentIndex, isForwardMovement);

    const downstreamBranches = [];

    for (const seg of connectedSegments) {
      const coords = segments[seg.segmentIndex];
      let referenceCoord;
      if (seg.isForward) {
        referenceCoord = coords.length > 1 ? coords[1] : coords[0];
      } else {
        referenceCoord = coords.length > 1 ? coords[coords.length - 2] : coords[0];
      }

      const branchBearing = calculateBearing(comparisonPoint.lat, comparisonPoint.lng, referenceCoord.lat, referenceCoord.lng);
      const divergenceDegrees = calculateDivergence(heading, branchBearing);

      downstreamBranches.push(new BranchEvidence({
        branchId: seg.branchId,
        divergenceDegrees,
        isTerminal: false // Simplified: full terminal detection might require deeper topological checks
      }));
    }

    // If no explicit downstream branches found, it's a terminal branch
    if (downstreamBranches.length === 0) {
      downstreamBranches.push(new BranchEvidence({
        branchId: assembledCorridor.getBranchId(currentIndex),
        divergenceDegrees: 0,
        isTerminal: true
      }));
    }

    const currentBranchId = assembledCorridor.getBranchId(currentIndex);

    return new RouteSelectionEvidence({
      movementState,
      travelDirection,
      downstreamBranches,
      currentBranchId
    });
  }
}

module.exports = {
  BranchEvidenceBuilder
};
