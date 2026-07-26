const { deepFreeze } = require('../utils/deepFreeze.js');

/**
 * Immutable domain object representing the operational path justified by available evidence.
 * Does not contain prediction or forecasting.
 */
class RouteContext {
  constructor({ branchId, currentSegmentIndex, previousStation = null, nextStation = null }) {
    if (branchId === undefined || branchId === null) {
      throw new TypeError('branchId is required');
    }
    if (currentSegmentIndex === undefined || currentSegmentIndex === null) {
      throw new TypeError('currentSegmentIndex is required');
    }

    this.branchId = String(branchId);
    this.currentSegmentIndex = currentSegmentIndex;
    this.previousStation = previousStation;
    this.nextStation = nextStation;
    this.isResolved = true;

    deepFreeze(this);
  }
}

module.exports = {
  RouteContext
};
