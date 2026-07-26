const { findNearestCorridorPoint } = require('../calculations/nearest-corridor.js');

/**
 * Isolates the legacy seed selection logic behind a dedicated boundary.
 * Graph Foundation requires a seed way to initiate traversal. This module uses
 * the legacy geometric proximity heuristic to determine that seed way,
 * hiding the implementation from the orchestration layer.
 *
 * @param {Object} location
 * @param {Array} corridors
 * @returns {Object|null} { seedWayId, minDistance }
 */
function resolveSeedWay(location, corridors) {
  const nearestInfo = findNearestCorridorPoint(location, corridors);
  if (!nearestInfo || !nearestInfo.nearestCorridor) {
    return null;
  }
  return {
    seedWayId: Number(nearestInfo.nearestCorridor.id),
    minDistance: nearestInfo.minDistance
  };
}

module.exports = {
  resolveSeedWay
};
