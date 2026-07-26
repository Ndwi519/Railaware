const { deepFreeze } = require('../utils/deepFreeze.js');

/**
 * Immutable domain object representing the spatial evaluation of a single downstream branch.
 */
class BranchEvidence {
  constructor({ branchId, divergenceDegrees, isTerminal = false }) {
    if (branchId === undefined || branchId === null) {
      throw new Error('branchId is required');
    }
    if (typeof divergenceDegrees !== 'number') {
      throw new Error('divergenceDegrees must be a number');
    }

    this.branchId = String(branchId);
    this.divergenceDegrees = divergenceDegrees;
    this.isTerminal = !!isTerminal;

    deepFreeze(this);
  }
}

module.exports = {
  BranchEvidence
};
