/**
 * Tracks the mathematically evaluated trust in the current Observation.
 */
function createConfidenceAssessment({ level, topologyConfidence, observationConfidence, providerReliability, reasons = [], assessedAt }) {
  return Object.freeze({
    level, // Legacy fallback
    topologyConfidence,
    observationConfidence,
    providerReliability,
    reasons: Object.freeze([...reasons]),
    assessedAt
  });
}

module.exports = { createConfidenceAssessment };
