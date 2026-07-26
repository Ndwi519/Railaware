Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateUserSegmentFraction = calculateUserSegmentFraction;
var _errors = require("../utils/errors.js");
/**
 * Computes the fraction of the corridor that the user has traversed based on precomputed cumulative distances.
 * 
 * @param {Object} topology - The immutable topology metadata of the corridor
 * @param {number} nearestPointIndex - The index of the geometry point nearest to the user
 * @returns {Object} { totalLengthMetres, userSegmentFraction }
 * @throws {TopologyError} if nearestPointIndex is outside the bounds of cumulativeDistances
 */
function calculateUserSegmentFraction(topology, nearestPointIndex) {
  const totalLengthMetres = topology.totalLengthMetres;
  if (totalLengthMetres <= 0) {
    return {
      totalLengthMetres,
      userSegmentFraction: 0
    };
  }
  if (!Number.isInteger(nearestPointIndex) || nearestPointIndex < 0 || nearestPointIndex >= topology.cumulativeDistances.length) {
    throw new _errors.TopologyError('Invalid topology: nearestPointIndex is outside cumulativeDistances.');
  }
  const lengthToNearest = topology.cumulativeDistances[nearestPointIndex];
  return {
    totalLengthMetres,
    userSegmentFraction: lengthToNearest / totalLengthMetres
  };
}