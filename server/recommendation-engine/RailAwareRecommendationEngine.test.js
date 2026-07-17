const RailAwareRecommendationEngine = require('./RailAwareRecommendationEngine.js');
const { createRiskAssessment } = require('../domain/models/RiskAssessment.js');
const { RiskLevel } = require('../domain/types/enums.js');

describe('RailAwareRecommendationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new RailAwareRecommendationEngine();
  });

  const evalRisk = (level) => engine.evaluate(createRiskAssessment({ level, reasons: [], evaluatedAt: new Date() }));

  it('should return factual status for IMMINENT risk', () => {
    const rec = evalRisk(RiskLevel.IMMINENT);
    expect(rec.userAction).toBe('Status: AT_STATION');
    expect(rec.directive).toContain('[Fallback]');
  });

  it('should return factual status for ELEVATED risk', () => {
    const rec = evalRisk(RiskLevel.ELEVATED);
    expect(rec.userAction).toBe('Status: APPROACHING_STATION');
  });

  it('should return factual status for SAFE risk', () => {
    const rec = evalRisk(RiskLevel.SAFE);
    expect(rec.userAction).toBe('Status: DISTANT');
  });

  it('should return fallback for UNKNOWN risk', () => {
    const rec = evalRisk(RiskLevel.UNKNOWN);
    expect(rec.userAction).toBe('Status: UNKNOWN');
    expect(rec.directive).toContain('[Fallback]');
  });
});
