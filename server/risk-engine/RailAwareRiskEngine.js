const RiskEngine = require('../domain/contracts/RiskEngine.js');
const { RiskLevel, ConfidenceLevel, TrainStatus } = require('../domain/types/enums.js');
const { createRiskAssessment } = require('../domain/models/RiskAssessment.js');

class RailAwareRiskEngine extends RiskEngine {
  evaluate(journey, observation, confidence, estimation) {
    if (!observation || !confidence) {
      throw new Error('RiskEngine requires observation and confidence');
    }

    const overallLevel = confidence.overallConfidence || confidence.level;

    // --- TEMPORARY MIGRATION: Factual Awareness Payload ---
    const baseAwareness = {
      status: 'UNKNOWN',
      trainAlongTrackDistanceMetres: estimation ? estimation.trainAlongTrackDistanceMetres : null,
      userAlongTrackDistanceMetres: estimation ? estimation.userAlongTrackDistanceMetres : null,
      distanceMetres: estimation ? estimation.distanceMetres : null,
      direction: estimation ? estimation.direction : null,
      approaching: estimation ? estimation.approaching : null,
      confidence: overallLevel,
      lastUpdatedAt: estimation && estimation.lastUpdatedAt ? estimation.lastUpdatedAt : new Date(),
      explanation: ''
    };

    let awareness = { ...baseAwareness };
    
    // --- LEGACY LOGIC: Backward Compatibility ---
    let legacyLevel = RiskLevel.SAFE;
    const legacyReasons = [];
    
    if (!journey && overallLevel === ConfidenceLevel.HIGH) {
      awareness.status = 'NO_TRAINS_FOUND';
      awareness.explanation = '[Engineering decision] Track topology verified; provider confirms zero active trains.';
      legacyLevel = RiskLevel.UNKNOWN;
      legacyReasons.push('[Engineering decision] Track topology verified; provider confirms zero active trains (ADR-002)');
      return this._buildHybridResponse(legacyLevel, legacyReasons, awareness);
    }

    if (!journey) {
      awareness.explanation = '[Engineering decision] Unable to estimate because no journey context is available.';
      legacyLevel = RiskLevel.UNKNOWN;
      legacyReasons.push('[Engineering decision] No journey context available; proximity to target station cannot be evaluated');
      return this._buildHybridResponse(legacyLevel, legacyReasons, awareness);
    }

    if (overallLevel === ConfidenceLevel.UNKNOWN) {
      awareness.explanation = '[Engineering decision] Unable to estimate because confidence is UNKNOWN.';
      legacyLevel = RiskLevel.UNKNOWN;
      legacyReasons.push('[Engineering decision] UNKNOWN confidence enforces UNKNOWN risk');
      return this._buildHybridResponse(legacyLevel, legacyReasons, awareness);
    }

    if (overallLevel === ConfidenceLevel.LOW) {
      legacyLevel = RiskLevel.ELEVATED; // Prevent false sense of safety
      legacyReasons.push('[Engineering decision] LOW confidence degrades risk certainty to ELEVATED');
    }

    if (observation.status === TrainStatus.CANCELLED) {
      awareness.status = 'CANCELLED';
      awareness.explanation = '[Engineering decision] Train is officially cancelled.';
      
      if (legacyLevel !== RiskLevel.ELEVATED) {
        legacyLevel = RiskLevel.SAFE;
      }
      legacyReasons.push('[Engineering decision] Train is cancelled, boarding risk is neutralized');
      return this._buildHybridResponse(legacyLevel, legacyReasons, awareness);
    }



    if (observation.currentSegment) {
      const prevCode = observation.currentSegment.previousStation.code;
      const nextCode = observation.currentSegment.nextStation ? observation.currentSegment.nextStation.code : null;
      const targetCode = journey.targetStation.code;

      if (observation.status === TrainStatus.ARRIVED && prevCode === targetCode) {
        awareness.status = 'AT_STATION';
        awareness.approaching = false;
        awareness.explanation = '[Engineering decision] Estimated using topology: train is currently at target station.';
        legacyLevel = RiskLevel.IMMINENT;
        legacyReasons.push('[Engineering decision] Train has arrived at target station');
      } else if (nextCode === targetCode) {
        awareness.status = 'APPROACHING_STATION';
        awareness.approaching = true;
        awareness.explanation = '[Engineering decision] Estimated using topology: train is approaching target station.';
        legacyLevel = RiskLevel.IMMINENT;
        legacyReasons.push('[Engineering decision] Train is approaching target station');
      } else if (prevCode === targetCode) {
        awareness.status = 'DEPARTED_STATION';
        awareness.approaching = false;
        awareness.explanation = '[Engineering decision] Estimated using topology: train has departed target station.';
        legacyLevel = RiskLevel.IMMINENT;
        legacyReasons.push('[Engineering decision] Train is currently at or just departing target station');
      } else {
        awareness.status = 'DISTANT';
        awareness.approaching = null;
        awareness.explanation = '[Engineering decision] Estimated using topology: train is distant from target station.';
        if (legacyLevel === RiskLevel.SAFE) {
          legacyReasons.push('[Engineering decision] Train is distant from target station');
        }
      }

      if (overallLevel === ConfidenceLevel.LOW) {
        awareness.explanation += ' (Data has low confidence).';
      }
    } else {
      awareness.explanation = '[Engineering decision] Unable to estimate because topology is unresolved.';
      legacyLevel = RiskLevel.UNKNOWN;
      legacyReasons.push('[Engineering decision] Topography unknown, defaulting to UNKNOWN risk baseline');
    }

    return this._buildHybridResponse(legacyLevel, legacyReasons, awareness);
  }

  /**
   * Temporary migration helper.
   * Returns a hybrid object containing both the legacy RiskAssessment contract 
   * (so callers don't break) and the new nested 'awareness' factual payload.
   * This merge will be removed after Steps 2 and 3.
   */
  _buildHybridResponse(level, reasons, awareness) {
    const legacyAssessment = createRiskAssessment({
      level,
      reasons,
      evaluatedAt: new Date()
    });
    
    // Spread the legacy object to preserve its public properties (.level, .reasons)
    // and explicitly separate the new payload via the nested `.awareness` property.
    return Object.freeze({
      ...legacyAssessment,
      awareness: Object.freeze(awareness)
    });
  }
}

module.exports = RailAwareRiskEngine;
