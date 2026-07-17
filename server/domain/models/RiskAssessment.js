/**
 * The safety evaluation generated against business rules.
 */
function createRiskAssessment({ level, reasons = [], evaluatedAt }) {
  return Object.freeze({
    level,
    reasons: Object.freeze([...reasons]),
    evaluatedAt
  });
}

module.exports = { createRiskAssessment };
