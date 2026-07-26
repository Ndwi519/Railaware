const { deepFreeze } = require('../utils/deepFreeze.js');

const AmbiguityReason = Object.freeze({
  UNKNOWN_DIRECTION: 'UNKNOWN_DIRECTION',
  MULTIPLE_FORWARD_BRANCHES: 'MULTIPLE_FORWARD_BRANCHES',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  INVALID_INPUT: 'INVALID_INPUT'
});

/**
 * Immutable domain object representing a state where deterministic routing
 * has stopped due to insufficient evidence.
 */
class RouteAmbiguous {
  constructor(reason, details = {}) {
    if (!Object.values(AmbiguityReason).includes(reason)) {
      throw new TypeError(`Invalid ambiguity reason: ${reason}`);
    }

    this.reason = reason;
    this.details = details;
    this.isResolved = false;

    deepFreeze(this);
  }
}

module.exports = {
  RouteAmbiguous,
  AmbiguityReason
};
