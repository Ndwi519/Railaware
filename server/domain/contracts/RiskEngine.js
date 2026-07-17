/**
 * Defines the contract for evaluating safety rules.
 * This engine only interacts with normalized Observations and ConfidenceAssessments,
 * never raw provider payloads.
 */
class RiskEngine {
  evaluate(journey, observation, confidence) {
    throw new Error('Not implemented');
  }
}

module.exports = RiskEngine;
