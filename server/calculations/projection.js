Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.projectPointOntoCorridor = projectPointOntoCorridor;
var _haversine = require("./haversine.js");
var _constants = require("./constants.js");
var _deepFreeze2 = require("../utils/deepFreeze.js");
/**
 * @module calculations/projection
 * @responsibility Perform mathematical projection of GPS points onto polylines.
 */

/**
 * @typedef {Object} ProjectionResult
 * @property {{lat: number, lng: number}} projectedPoint - The coordinates of the projection
 * @property {number} crossTrackDistanceMetres - Perpendicular distance from original point to the corridor
 * @property {number} alongTrackDistanceMetres - Cumulative distance along the corridor to the projected point
 * @property {number} segmentIndex - The 0-based index of the polyline segment containing the projection
 * @property {number} interpolationRatio - The t-value [0, 1] along the segment where projection occurred
 */

/**
 * Projects a GPS point onto a multi-segment corridor polyline.
 * 
 * DESIGN RATIONALE:
 * This algorithm intentionally uses an Equirectangular Projection Approximation 
 * to compute the interpolation ratio (t) instead of full spherical trigonometry. 
 * Because railway corridor segments (derived from OSM nodes) are extremely short, 
 * treating the local region as a planar surface yields negligible interpolation 
 * error while guaranteeing mathematical determinism and high performance.
 * 
 * Crucially, while interpolation is computed in the projected planar space, all 
 * reported distances (cross-track and along-track) remain true geodesic measurements 
 * calculated using the exact Haversine formula.
 *
 * @param {{lat: number, lng: number}} point - The GPS coordinate to project
 * @param {Array<{lat: number, lng: number}>} polyline - Ordered coordinates defining the corridor
 * @returns {ProjectionResult|null} The geometric projection, or null if geometry is invalid
 */
function projectPointOntoCorridor(point, polyline) {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    return null;
  }
  if (!Array.isArray(polyline) || polyline.length < 2) {
    return null;
  }

  // Validate polyline nodes
  for (const node of polyline) {
    if (!node || typeof node.lat !== 'number' || typeof node.lng !== 'number') {
      return null;
    }
  }
  let bestProjection = null;
  let cumulativeDistance = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const A = polyline[i];
    const B = polyline[i + 1];

    // Local scaling: cosine of average latitude
    const lat0 = (A.lat + B.lat) / 2;
    const kx = Math.cos(lat0 * (Math.PI / 180));

    // Planar vector math scaled for latitude
    const dxAB = (B.lng - A.lng) * kx;
    const dyAB = B.lat - A.lat;
    const dxAP = (point.lng - A.lng) * kx;
    const dyAP = point.lat - A.lat;
    const len2 = dxAB * dxAB + dyAB * dyAB;
    let t = 0;
    if (len2 > _constants.GEOMETRIC_NUMERICAL_TOLERANCE) {
      t = (dxAP * dxAB + dyAP * dyAB) / len2;
      // Clamp to segment endpoints
      t = Math.max(0, Math.min(1, t));
    }
    const projectedPoint = {
      lat: A.lat + t * (B.lat - A.lat),
      lng: A.lng + t * (B.lng - A.lng)
    };
    const crossTrackDistanceMetres = (0, _haversine.haversineMetres)(point.lat, point.lng, projectedPoint.lat, projectedPoint.lng);
    const alongSegmentDistanceMetres = (0, _haversine.haversineMetres)(A.lat, A.lng, projectedPoint.lat, projectedPoint.lng);

    // Evaluate if this segment provides a better projection.
    // Deterministic tie-breaking: if cross-track distance is identical within tolerance, 
    // we keep the earlier segment (bestProjection is not updated).
    if (!bestProjection || crossTrackDistanceMetres < bestProjection.crossTrackDistanceMetres - _constants.TIE_BREAKING_TOLERANCE) {
      bestProjection = {
        projectedPoint,
        crossTrackDistanceMetres,
        alongTrackDistanceMetres: cumulativeDistance + alongSegmentDistanceMetres,
        segmentIndex: i,
        interpolationRatio: t
      };
    }

    // Accumulate total distance for the next segment's starting point
    cumulativeDistance += (0, _haversine.haversineMetres)(A.lat, A.lng, B.lat, B.lng);
  }
  return bestProjection ? (0, _deepFreeze2.deepFreeze)(bestProjection) : null;
}