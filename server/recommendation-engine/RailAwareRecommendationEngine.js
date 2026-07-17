const { createRecommendation } = require('../domain/models/Recommendation.js');
const { RiskLevel } = require('../domain/types/enums.js');

class RailAwareRecommendationEngine {
  /**
   * Converts RiskAssessment or its embedded awareness payload into factual 
   * situational awareness. Stops generating action-oriented recommendations.
   */
  evaluate(riskAssessment) {
    if (!riskAssessment) throw new Error('RecommendationEngine requires RiskAssessment');

    // 1. Extract from the primary source (awareness) if available
    if (riskAssessment.awareness) {
      const awareness = riskAssessment.awareness;
      
      // We return the factual data fields. We also populate the legacy 
      // directive/userAction with factual strings so downstream mappers do not crash.
      const factualData = {
        directive: awareness.explanation || 'Factual operational data available.',
        userAction: `Status: ${awareness.status}`,
        
        // Factual fields as requested
        status: awareness.status,
        confidence: awareness.confidence,
        lastUpdatedAt: awareness.lastUpdatedAt,
        explanation: awareness.explanation,
        distanceMetres: awareness.distanceMetres || null,
        direction: awareness.direction || null,
        approaching: awareness.approaching
      };
      
      return Object.freeze(factualData);
    }

    // 2. Compatibility Fallback (if awareness is unavailable)
    let explanation = '';
    let status = 'UNKNOWN';
    let confidence = 'UNKNOWN';

    switch (riskAssessment.level) {
      case RiskLevel.IMMINENT:
        explanation = '[Fallback] Train is arriving or present.';
        status = 'AT_STATION';
        break;
      case RiskLevel.ELEVATED:
        explanation = '[Fallback] Train is approaching or data is uncertain.';
        status = 'APPROACHING_STATION';
        break;
      case RiskLevel.SAFE:
        explanation = '[Fallback] Train is distant or cancelled.';
        status = 'DISTANT';
        break;
      case RiskLevel.UNKNOWN:
      default:
        explanation = '[Fallback] System cannot confidently determine train state.';
        status = 'UNKNOWN';
        break;
    }

    return Object.freeze({
      directive: explanation,
      userAction: `Status: ${status}`,
      status,
      confidence,
      lastUpdatedAt: riskAssessment.evaluatedAt || new Date(),
      explanation,
      distanceMetres: null,
      direction: null,
      approaching: null
    });
  }
}

module.exports = RailAwareRecommendationEngine;
