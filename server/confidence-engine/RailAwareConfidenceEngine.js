const ConfidenceEngine = require('../domain/contracts/ConfidenceEngine.js');
const { ConfidenceLevel, TrainStatus, ConfidenceRanking } = require('../domain/types/enums.js');
const { createConfidenceAssessment } = require('../domain/models/ConfidenceAssessment.js');

class RailAwareConfidenceEngine extends ConfidenceEngine {
  constructor(config = {}) {
    super();
    // [Engineering decision] Configurable stale threshold instead of hardcoded
    this.staleThresholdMs = config.staleThresholdMs || 15 * 60 * 1000;
  }

  evaluate(currentObservation, observationHistory = []) {
    if (!currentObservation) {
      return createConfidenceAssessment({
        level: ConfidenceLevel.UNKNOWN,
        reasons: ['[Engineering decision] observation absent'],
        assessedAt: new Date()
      });
    }

    const reasons = [];
    let level = ConfidenceLevel.HIGH;

    // --- UNKNOWN constraints ---
    if (observationHistory.length === 0) {
      level = ConfidenceLevel.UNKNOWN;
      reasons.push('[Engineering decision] insufficient history');
    }

    if (currentObservation.status === TrainStatus.UNKNOWN) {
      level = ConfidenceLevel.UNKNOWN;
      reasons.push('[Engineering decision] unknown provider status');
    }

    // --- LOW constraints (overrides UNKNOWN/HIGH/MEDIUM) ---
    let forceLow = false;

    // Evaluate explicit validation errors instead of inferring failure from status
    if (currentObservation.validationErrors && currentObservation.validationErrors.length > 0) {
      forceLow = true;
      reasons.push('[Engineering decision] explicit validation errors present');
    }

    // Repeated HTTP gaps
    let gaps = 0;
    for (let i = 1; i < observationHistory.length; i++) {
      const prevTime = observationHistory[i - 1].recordedAt.getTime();
      const currTime = observationHistory[i].recordedAt.getTime();
      if (currTime - prevTime > 2 * 60 * 1000) {
        gaps++;
      }
    }
    if (gaps >= 2) {
      forceLow = true;
      reasons.push('[Evidence-backed] repeated HTTP acquisition gaps');
    }

    // --- MEDIUM constraints (overrides HIGH) ---
    let forceMedium = false;

    // Missing topology is no longer an automatic LOW. It just reduces interpretability.
    if (!currentObservation.currentSegment || !currentObservation.currentSegment.previousStation) {
      forceMedium = true;
      reasons.push('[Engineering decision] missing topology');
    }

    if (currentObservation.currentSegment && currentObservation.segmentProgress === null) {
      forceMedium = true;
      reasons.push('[Engineering decision] missing optional fields');
    }

    const ageMs = new Date() - (currentObservation.lastUpdatedAt || currentObservation.recordedAt);
    if (ageMs > this.staleThresholdMs) {
      forceMedium = true;
      reasons.push('[Engineering decision] stale observation');
    }

    // Regression check (Phase 0 Evidence)
    let regressionFound = false;
    if (currentObservation.segmentProgress !== null && currentObservation.currentSegment) {
      for (const past of observationHistory) {
        if (past.id === currentObservation.id) continue;
        if (
          past.currentSegment &&
          past.currentSegment.previousStation.code === currentObservation.currentSegment.previousStation.code &&
          past.segmentProgress !== null &&
          past.segmentProgress > currentObservation.segmentProgress &&
          past.recordedAt < currentObservation.recordedAt
        ) {
          regressionFound = true;
          break;
        }
      }
    }

    if (regressionFound) {
      forceMedium = true;
      // Do NOT treat segmentProgress regression as evidence that the provider is wrong.
      // Treat it as evidence that the observation requires additional interpretation.
      reasons.push('[Evidence-backed] observed segmentProgress regression requires interpretation');
    }

    // Combinations of MEDIUM evidence that materially reduce interpretability -> LOW
    if ((!currentObservation.currentSegment || !currentObservation.currentSegment.previousStation) &&
      (ageMs > this.staleThresholdMs || regressionFound)) {
      forceLow = true;
      reasons.push('[Engineering decision] compounding missing topology and degraded state');
    }

    // --- Resolve Hierarchy ---
    if (level !== ConfidenceLevel.UNKNOWN || forceLow || forceMedium) {
      if (forceLow) {
        level = ConfidenceLevel.LOW;
      } else if (forceMedium && level !== ConfidenceLevel.UNKNOWN) {
        level = ConfidenceLevel.MEDIUM;
      }
    }

    // --- HIGH fallbacks ---
    if (level === ConfidenceLevel.HIGH && reasons.length === 0) {
      reasons.push('[Engineering decision] complete observation');
      reasons.push('[Engineering decision] no validation errors');
      reasons.push('[Engineering decision] recent provider timestamp');
    }

    return createConfidenceAssessment({
      level,
      reasons,
      assessedAt: new Date()
    });
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
    const tConf = topologyConfidence || ConfidenceLevel.UNKNOWN;
    const oConf = observationConfidence || ConfidenceLevel.UNKNOWN;
    // Defensive validation: unknown enum values are treated conservatively.
    if (!(tConf in ConfidenceRanking) || !(oConf in ConfidenceRanking)) {
      return ConfidenceLevel.UNKNOWN;
    }
    if (tConf === ConfidenceLevel.UNKNOWN || oConf === ConfidenceLevel.UNKNOWN) {
      return ConfidenceLevel.UNKNOWN;
    }

    return ConfidenceRanking[tConf] <= ConfidenceRanking[oConf] ? tConf : oConf;
  }
}

module.exports = RailAwareConfidenceEngine;
