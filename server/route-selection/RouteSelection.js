const { BranchDecision, BranchStatus } = require('./BranchDecision.js');
const { RouteSelectionEvidence } = require('./RouteSelectionEvidence.js');
const { MovementState } = require('../directional-inference/MovementState.js');

const ALIGNMENT_THRESHOLD_DEGREES = 45;

/**
 * RouteSelection
 * Pure business rules only. Consumes RouteSelectionEvidence. Returns BranchDecision.
 */
class RouteSelection {
  /**
   * @param {RouteSelectionEvidence} evidence
   * @returns {BranchDecision}
   */
  evaluate(evidence) {
    if (!(evidence instanceof RouteSelectionEvidence)) {
      throw new Error('evidence must be RouteSelectionEvidence');
    }

    if (evidence.travelDirection === 'UNKNOWN' || evidence.travelDirection === 'STATIONARY') {
      return new BranchDecision({
        status: BranchStatus.AMBIGUOUS,
        ambiguityReason: evidence.travelDirection === 'STATIONARY' ? 'STATIONARY_NO_VECTOR' : 'INSUFFICIENT_EVIDENCE',
        travelDirection: evidence.travelDirection
      });
    }

    if (evidence.downstreamBranches.length === 1) {
      return new BranchDecision({
        status: BranchStatus.SELECTED,
        selectedBranchId: evidence.downstreamBranches[0].branchId,
        travelDirection: evidence.travelDirection
      });
    }

    // Multiple branches, apply thresholds
    const alignedBranches = evidence.downstreamBranches.filter(b => b.divergenceDegrees <= ALIGNMENT_THRESHOLD_DEGREES);

    if (alignedBranches.length === 1) {
      return new BranchDecision({
        status: BranchStatus.SELECTED,
        selectedBranchId: alignedBranches[0].branchId,
        travelDirection: evidence.travelDirection
      });
    }

    if (alignedBranches.length > 1) {
      return new BranchDecision({
        status: BranchStatus.AMBIGUOUS,
        ambiguityReason: 'MULTIPLE_BRANCHES_ALIGNED',
        travelDirection: evidence.travelDirection
      });
    }

    if (evidence.currentBranchId) {
      return new BranchDecision({
        status: BranchStatus.SELECTED,
        selectedBranchId: evidence.currentBranchId,
        travelDirection: evidence.travelDirection
      });
    }

    return new BranchDecision({
      status: BranchStatus.AMBIGUOUS,
      ambiguityReason: 'NO_BRANCHES_ALIGNED',
      travelDirection: evidence.travelDirection
    });
  }
}

module.exports = {
  RouteSelection
};
