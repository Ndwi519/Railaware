const { projectPointOntoCorridor } = require('../calculations/projection.js');

/**
 * Evaluates all traversable segments and collects valid projection candidates.
 *
 * @param {Array<Array<{lat: number, lng: number}>>} segments The geometry segments
 * @param {Object} point The observation point
 * @returns {Array<{result: Object, evaluationOrder: number}>} Evaluated candidates
 */
function evaluateCandidates(segments, point) {
  const candidates = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Invoke the existing projection engine unmodified
    const result = projectPointOntoCorridor(point, segment);

    if (result) {
      // Annotate internally with evaluation order for deterministic tie-breaking.
      // This wrapper must be stripped before final return.
      candidates.push({
        result,
        evaluationOrder: i
      });
    }
  }

  return candidates;
}

module.exports = {
  evaluateCandidates
};
