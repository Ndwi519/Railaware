Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildCorridorStationIndex = buildCorridorStationIndex;
var _projection = require("./projection.js");
var _constants = require("./constants.js");
var _deepFreeze2 = require("../utils/deepFreeze.js");
/**
 * @module calculations/station-index
 * @responsibility Transform an unordered collection of station features into a monotonic corridor ordering.
 */

/**
 * @typedef {import('../domain/types/station.js').StationReference} StationReference
 */

/**
 * @typedef {Object} StationIndexEntry
 * @property {StationReference} station - The original station reference
 * @property {{lat: number, lng: number}} projectedPoint - The coordinates on the corridor
 * @property {number} alongTrackDistanceMetres - Distance along the corridor to this station
 * @property {number} crossTrackDistanceMetres - Perpendicular distance from station to corridor
 * @property {number} interpolationRatio - The t-value [0, 1] on the segment
 * @property {number} segmentIndex - The 0-based index of the polyline segment
 */

/**
 * Builds a deterministic ordered station index along a corridor polyline.
 * 
 * Invalid or unprojectable stations are safely ignored and omitted from the final index.
 * 
 * @param {Array<{lat: number, lng: number}>} polyline - Ordered coordinates defining the corridor
 * @param {Array<{station: StationReference, lat: number, lng: number}>} stations - Unordered station features
 * @returns {Array<StationIndexEntry>} A sorted, immutable array of station index entries
 */
function buildCorridorStationIndex(polyline, stations) {
  if (!Array.isArray(polyline) || !Array.isArray(stations)) {
    return [];
  }
  const entries = [];
  for (let i = 0; i < stations.length; i++) {
    const feature = stations[i];

    // Ignore malformed features safely
    if (!feature || !feature.station || typeof feature.lat !== 'number' || typeof feature.lng !== 'number') {
      continue;
    }
    const projection = (0, _projection.projectPointOntoCorridor)(feature, polyline);
    if (projection) {
      entries.push({
        entry: {
          station: feature.station,
          projectedPoint: projection.projectedPoint,
          alongTrackDistanceMetres: projection.alongTrackDistanceMetres,
          crossTrackDistanceMetres: projection.crossTrackDistanceMetres,
          interpolationRatio: projection.interpolationRatio,
          segmentIndex: projection.segmentIndex
        },
        originalIndex: i // Used for final tie-breaking
      });
    }
  }

  // Sort deterministically
  entries.sort((a, b) => {
    const diff = a.entry.alongTrackDistanceMetres - b.entry.alongTrackDistanceMetres;

    // 1. Primary sort: alongTrackDistanceMetres
    if (Math.abs(diff) > _constants.TIE_BREAKING_TOLERANCE) {
      return diff;
    }

    // 2. Tie-breaker: smaller segmentIndex
    if (a.entry.segmentIndex !== b.entry.segmentIndex) {
      return a.entry.segmentIndex - b.entry.segmentIndex;
    }

    // 3. Tie-breaker: smaller interpolationRatio
    const tDiff = a.entry.interpolationRatio - b.entry.interpolationRatio;
    if (Math.abs(tDiff) > _constants.TIE_BREAKING_TOLERANCE) {
      return tDiff;
    }

    // 4. Final tie-breaker: original input order
    return a.originalIndex - b.originalIndex;
  });
  return (0, _deepFreeze2.deepFreeze)(entries.map(e => e.entry));
}