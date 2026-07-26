const { deepFreeze } = require('../utils/deepFreeze.js');
const { ValidationError } = require('./errors.js');

const BranchStatus = Object.freeze({
  SELECTED: 'SELECTED',
  AMBIGUOUS: 'AMBIGUOUS'
});

/**
 * Immutable domain object representing the pure business logic outcome of branch evaluation.
 */
class BranchDecision {
  constructor({ status, selectedBranchId = null, ambiguityReason = null, travelDirection = null }) {
    if (!Object.values(BranchStatus).includes(status)) {
      throw new ValidationError(`Invalid status: ${status}`);
    }
    if (status === BranchStatus.SELECTED && (selectedBranchId === null || selectedBranchId === undefined)) {
      throw new ValidationError('SELECTED status requires a selectedBranchId.');
    }
    if (status === BranchStatus.AMBIGUOUS && !ambiguityReason) {
      throw new ValidationError('AMBIGUOUS status requires an ambiguityReason.');
    }

    this.status = status;
    this.selectedBranchId = selectedBranchId !== null ? String(selectedBranchId) : null;
    this.ambiguityReason = ambiguityReason;
    this.travelDirection = travelDirection;

    deepFreeze(this);
  }
}

module.exports = {
  BranchDecision,
  BranchStatus
};
