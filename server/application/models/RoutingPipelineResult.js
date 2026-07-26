"use strict";

const { deepFreeze } = require('../../utils/deepFreeze.js');

class RoutingPipelineResult {
  constructor({
    discoveryContext,
    nearestCorridor,
    projectionResult,
    directionInferenceResult,
    routeSelectionDecision,
    routeContext
  }) {
    this.discoveryContext = discoveryContext;
    this.nearestCorridor = nearestCorridor;
    this.projectionResult = projectionResult;
    this.directionInferenceResult = directionInferenceResult;
    this.routeSelectionDecision = routeSelectionDecision;
    this.routeContext = routeContext || null;

    deepFreeze(this);
  }
}

module.exports = { RoutingPipelineResult };
