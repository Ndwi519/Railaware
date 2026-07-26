const { ConfidenceLevel, TrainStatus } = require('../domain/types/enums.js');
const { createAwarenessContext } = require('../domain/models/AwarenessContext.js');

class RailAwareAwarenessEngine {
  evaluate(journey, observation, confidence, estimation) {
    if (!observation || !confidence) {
      throw new Error('AwarenessEngine requires observation and confidence');
    }

    const obsLevel = confidence.observationConfidence || ConfidenceLevel.UNKNOWN;
    const topLevel = confidence.topologyConfidence || ConfidenceLevel.UNKNOWN;

    const awareness = {
      status: 'UNKNOWN',
      trainAlongTrackDistanceMetres: estimation ? estimation.trainAlongTrackDistanceMetres : null,
      userAlongTrackDistanceMetres: estimation ? estimation.userAlongTrackDistanceMetres : null,
      distanceMetres: estimation ? estimation.distanceMetres : null,
      direction: estimation ? estimation.direction : null,
      approaching: estimation ? estimation.approaching : null,
      observationConfidence: obsLevel,
      providerReliability: confidence.providerReliability || ConfidenceLevel.UNASSESSED,
      lastUpdatedAt: estimation && estimation.lastUpdatedAt ? estimation.lastUpdatedAt : new Date(),
      explanation: '',
      /**
       * A backend-owned presentation semantic indicating that the current
       * awareness state should be rendered using the application's prominent
       * awareness overlay.
       */
      requiresProminentDisplay: false
    };

    if (!journey && obsLevel === ConfidenceLevel.NOT_APPLICABLE && topLevel === ConfidenceLevel.HIGH) {
      awareness.status = 'NO_TRAINS_FOUND';
      awareness.explanation = '[Implementation policy] Track topology resolved; provider returned empty result set.';
      return createAwarenessContext(awareness);
    }

    if (!journey) {
      awareness.explanation = '[Engineering decision] Unable to estimate because no journey context is available.';
      return createAwarenessContext(awareness);
    }

    if (obsLevel === ConfidenceLevel.UNKNOWN) {
      awareness.explanation = '[Engineering decision] Unable to estimate because confidence is UNKNOWN.';
      return createAwarenessContext(awareness);
    }

    if (observation.status === TrainStatus.CANCELLED) {
      awareness.status = 'CANCELLED';
      awareness.explanation = '[Engineering decision] Train is officially cancelled.';
      return createAwarenessContext(awareness);
    }

    if (observation.currentSegment) {
      const prevCode = observation.currentSegment.previousStation.code;
      const nextCode = observation.currentSegment.nextStation ? observation.currentSegment.nextStation.code : null;
      const targetCode = journey.targetStation.code;

      if (observation.status === TrainStatus.ARRIVED && prevCode === targetCode) {
        awareness.status = 'AT_STATION';
        awareness.approaching = false;
        awareness.explanation = '[Engineering decision] Estimated using topology: train is currently at target station.';
      } else if (nextCode === targetCode) {
        awareness.status = 'APPROACHING_STATION';
        awareness.approaching = true;
        awareness.explanation = '[Engineering decision] Estimated using topology: train is approaching target station.';
      } else if (prevCode === targetCode) {
        awareness.status = 'DEPARTED_STATION';
        awareness.approaching = false;
        awareness.explanation = '[Engineering decision] Estimated using topology: train has departed target station.';
      } else {
        awareness.status = 'DISTANT';
        awareness.approaching = null;
        awareness.explanation = '[Engineering decision] Estimated using topology: train is distant from target station.';
      }

      if (obsLevel === ConfidenceLevel.LOW) {
        awareness.explanation += ' (Data has low observation confidence).';
      }
    } else {
      awareness.explanation = '[Engineering decision] Unable to estimate because topology is unresolved.';
    }

    awareness.requiresProminentDisplay =
      awareness.status === 'APPROACHING_STATION' ||
      awareness.status === 'AT_STATION';

    return createAwarenessContext(awareness);
  }
}

module.exports = RailAwareAwarenessEngine;
