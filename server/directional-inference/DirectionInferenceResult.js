"use strict";

const { deepFreeze } = require('../utils/deepFreeze.js');
const { MovementState } = require('./MovementState.js');
const { ValidationError } = require('./errors.js');

/**
 * Immutable domain object representing the deterministic output of Directional Inference.
 */
class DirectionInferenceResult {
  constructor({ movementState, headingDegrees = null, forwardVector = null, reverseDetected = false, isStable = false, evidenceSummary = {} }) {
    if (!Object.values(MovementState).includes(movementState)) {
      throw new ValidationError(`Invalid movementState: ${movementState}`);
    }

    this.movementState = movementState;
    this.headingDegrees = headingDegrees;
    this.forwardVector = forwardVector;
    this.reverseDetected = !!reverseDetected;
    this.isStable = !!isStable;
    this.evidenceSummary = evidenceSummary;

    deepFreeze(this);
  }
}

module.exports = {
  DirectionInferenceResult
};
