const { TIE_BREAKING_TOLERANCE } = require('../calculations/constants.js');

/**
 * Selects the best candidate deterministically and strips temporary annotations.
 *
 * @param {Array<{result: Object, evaluationOrder: number}>} candidates
 * @returns {Object|null} The raw ProjectionResult, or null if no candidates
 */
function selectBestCandidate(candidates) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  let bestCandidate = candidates[0];

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];

    const currentDistance = candidate.result.crossTrackDistanceMetres;
    const bestDistance = bestCandidate.result.crossTrackDistanceMetres;

    // Evaluate if the current candidate is strictly better.
    // If they are within TIE_BREAKING_TOLERANCE, we deterministicly prefer the lowest evaluationOrder.
    // Since we iterate in ascending order, bestCandidate already holds the lower evaluationOrder, so we do nothing.
    if (currentDistance < bestDistance - TIE_BREAKING_TOLERANCE) {
      bestCandidate = candidate;
    }
  }

  // Inject the traversable segment index into the final result contract
  // This is required so downstream consumers (like Station Matcher) can distinguish branches.
  //
  // ProjectionResult Fields:
  // - segmentIndex: polyline-local vertex pair index.
  // - alongTrackDistanceMetres: measured along the single polyline passed into projectPointOntoCorridor.
  // - corridorSegmentIndex: identifies the traversable segment selected by ProjectionAdapter.
  return {
    ...bestCandidate.result,
    corridorSegmentIndex: bestCandidate.evaluationOrder
  };
}

module.exports = {
  selectBestCandidate
};
