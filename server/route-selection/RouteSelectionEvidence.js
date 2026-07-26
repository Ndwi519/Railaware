const { deepFreeze } = require('../utils/deepFreeze.js');

/**
 * Immutable domain object representing the abstracted snapshot of movement and topological options.
 * Contains purely abstracted evidence. No raw coordinates or graph topology is exposed here.
 */
class RouteSelectionEvidence {
  constructor({ movementState, travelDirection, downstreamBranches = [], operationalIntent = null, currentBranchId = null }) {
    if (!movementState) {
      throw new Error('movementState is required');
    }
    if (!travelDirection) {
      throw new Error('travelDirection is required');
    }

    this.movementState = movementState;
    this.travelDirection = travelDirection;
    this.downstreamBranches = downstreamBranches;
    this.operationalIntent = operationalIntent;
    this.currentBranchId = currentBranchId;

    deepFreeze(this);
  }
}

module.exports = {
  RouteSelectionEvidence
};
