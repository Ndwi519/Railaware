/**
 * Tracks the mathematically evaluated trust in the current Observation.
 */
function createConfidenceAssessment({ level, topologyConfidence, observationConfidence, overallConfidence, reasons = [], assessedAt }) {
  return Object.freeze({
    level, // Legacy fallback, same as overallConfidence for now or as caller specifies
    topologyConfidence,
    observationConfidence,
    overallConfidence,
    reasons: Object.freeze([...reasons]),
    assessedAt
  });
}

module.exports = { createConfidenceAssessment };
