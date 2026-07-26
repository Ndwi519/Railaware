const { deepFreeze } = require('../utils/deepFreeze.js');
const { ValidationError } = require('./errors.js');
const { RouteContext } = require('./RouteContext.js');
const { BranchDecision, BranchStatus } = require('./BranchDecision.js');
const { RouteSelectionEvidence } = require('./RouteSelectionEvidence.js');

/**
 * Immutable domain object representing the unified outcome of a route selection attempt.
 * Encapsulates the evidence used alongside the BranchDecision and successfully constructed RouteContext.
 */
class RouteSelectionResult {
  constructor({ decision, routeContext = null, evidenceSnapshot }) {
    if (!(decision instanceof BranchDecision)) {
      throw new ValidationError('decision must be a BranchDecision.');
    }
    if (!(evidenceSnapshot instanceof RouteSelectionEvidence)) {
      throw new ValidationError('evidenceSnapshot must be a RouteSelectionEvidence.');
    }

    if (decision.status === BranchStatus.SELECTED) {
      if (!(routeContext instanceof RouteContext)) {
        throw new ValidationError('SELECTED decision requires a valid RouteContext.');
      }
    } else {
      if (routeContext !== undefined && routeContext !== null) {
        throw new ValidationError('AMBIGUOUS decision cannot contain a RouteContext.');
      }
    }

    this.decision = decision;
    this.routeContext = routeContext;
    this.evidenceSnapshot = evidenceSnapshot;

    deepFreeze(this);
  }
}

module.exports = {
  RouteSelectionResult
};
