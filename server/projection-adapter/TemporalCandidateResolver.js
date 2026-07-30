const { DEFAULT_THRESHOLDS } = require('../config/thresholds.js');
const { selectBestCandidate } = require('./CandidateSelector.js');

/**
 * Resolves the best candidate by applying a temporal hysteresis layer over the stateless candidates.
 * Prevents flapping between parallel tracks by preferring the candidate topologically closest 
 * to the previous along-track position, provided it remains within an acceptable cross-track noise tolerance.
 * 
 * @param {Array<{result: Object, evaluationOrder: number}>} candidates - Raw evaluated candidates
 * @param {Object} [previousSessionState] - Optional state containing { lastAlongTrack, lastCorridorSegmentIndex, timestamp, lastSpeed }
 * @param {number} [currentTime] - Optional override for Date.now() for testing
 * @returns {Object|null} The resolved ProjectionResult with corridorSegmentIndex
 */
function resolveWithTemporalHysteresis(candidates, previousSessionState = null, currentTime = Date.now()) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // 1. If no temporal state, fallback to purely stateless geometric selection
  if (!previousSessionState || typeof previousSessionState.lastAlongTrack !== 'number') {
    return selectBestCandidate(candidates);
  }

  // 2. Find the absolute minimum cross-track distance among all candidates
  let minCrossTrack = Infinity;
  for (const c of candidates) {
    if (c.result.crossTrackDistanceMetres < minCrossTrack) {
      minCrossTrack = c.result.crossTrackDistanceMetres;
    }
  }

  // 3. Filter candidates to those within the noise tolerance of the absolute minimum.
  // If the user's old branch diverges and is now 20m further away than the new branch,
  // it gets excluded here, forcing a natural snap to the new branch.
  const tolerance = DEFAULT_THRESHOLDS.temporalCandidateCrossTrackToleranceMetres || 15;
  const viableCandidates = candidates.filter(
    c => c.result.crossTrackDistanceMetres <= minCrossTrack + tolerance
  );

  // 4. Calculate expected motion
  // We use the previous speed to estimate the new position. This perfectly supports
  // both stationary users (speed ~ 0) and moving trains, without penalizing either.

  let expectedAlongTrack = previousSessionState.lastAlongTrack;
  if (previousSessionState.timestamp && typeof previousSessionState.lastSpeed === 'number') {
    const timeDeltaSeconds = (currentTime - previousSessionState.timestamp) / 1000;
    // Cap the time delta to 60s to prevent massive jumps if the app was backgrounded
    // Floor it at 0 to prevent negative time in tests
    const effectiveDelta = Math.max(0, Math.min(timeDeltaSeconds, 60));
    expectedAlongTrack += (previousSessionState.lastSpeed * effectiveDelta);
  }

  let bestCandidate = null;
  let minAlongTrackDiff = Infinity;

  for (const c of viableCandidates) {
    const alongTrackDiff = Math.abs(c.result.alongTrackDistanceMetres - expectedAlongTrack);
    
    if (alongTrackDiff < minAlongTrackDiff) {
      bestCandidate = c;
      minAlongTrackDiff = alongTrackDiff;
    } else if (alongTrackDiff === minAlongTrackDiff) {
      // Arbitrary tie-break for an extremely rare mathematical collision.
      // Lowest evaluationOrder is used purely for deterministic output, not geometric prioritization.
      if (bestCandidate && c.evaluationOrder < bestCandidate.evaluationOrder) {
        bestCandidate = c;
      }
    }
  }

  if (!bestCandidate) {
    return selectBestCandidate(candidates);
  }

  return {
    ...bestCandidate.result,
    corridorSegmentIndex: bestCandidate.evaluationOrder
  };
}

module.exports = {
  resolveWithTemporalHysteresis
};
