/**
 * Defines the contract for quantifying the reliability of an Observation.
 * By definition, this engine MUST NOT modify the Observation.
 */
class ConfidenceEngine {
  evaluate(currentObservation, observationHistory) {
    throw new Error('Not implemented');
  }

  /**
   * Combines two confidence levels, returning the most conservative confidence level.
   * Treats UNKNOWN as dominant (returns UNKNOWN if either input is UNKNOWN or null).
   * 
   * @param {string|null} topologyConfidence - The confidence of the resolved topology.
   * @param {string|null} observationConfidence - The confidence of the active train observation.
   * @returns {string} The combined conservative confidence level.
   */
  combine(topologyConfidence, observationConfidence) {
    throw new Error('Not implemented');
  }
}

module.exports = ConfidenceEngine;
