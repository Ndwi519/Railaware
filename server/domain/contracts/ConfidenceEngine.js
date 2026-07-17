/**
 * Defines the contract for quantifying the reliability of an Observation.
 * By definition, this engine MUST NOT modify the Observation.
 */
class ConfidenceEngine {
  evaluate(currentObservation, observationHistory) {
    throw new Error('Not implemented');
  }
}

module.exports = ConfidenceEngine;
