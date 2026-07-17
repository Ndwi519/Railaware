/**
 * Represents the track connecting two sequential stations.
 */
function createSegment({ previousStation, nextStation = null, distanceKm = null }) {
  return Object.freeze({
    previousStation,
    nextStation,
    distanceKm
  });
}

module.exports = { createSegment };
