/**
 * Represents the final user-facing decision independently from RiskAssessment.
 * Immutable data model only.
 */
function createRecommendation({ directive, userAction, generatedAt }) {
  return Object.freeze({
    directive,
    userAction,
    generatedAt
  });
}

module.exports = { createRecommendation };
