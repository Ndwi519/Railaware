Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculatePolylineLengthMetres = calculatePolylineLengthMetres;
var _haversine = require("./haversine.js");
/**
 * @module calculations/polyline
 * @responsibility Compute the total length of a polyline geometry using Haversine distance.
 */

/**
 * Calculates the total length of a polyline in metres.
 * 
 * NOTE: If any coordinate in the polyline is malformed (missing numeric lat/lng),
 * the entire polyline is treated as invalid and this function immediately returns 0,
 * rather than returning a partial accumulated length.
 * 
 * @param {Array<{lat: number, lng: number}>} polyline - An array of coordinate points.
 * @returns {number} The total length in metres. Returns 0 if polyline is invalid, too short, or contains malformed points.
 */
function calculatePolylineLengthMetres(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2) {
    return 0;
  }
  let totalLength = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];
    if (!p1 || typeof p1.lat !== 'number' || typeof p1.lng !== 'number' || !p2 || typeof p2.lat !== 'number' || typeof p2.lng !== 'number') {
      return 0;
    }
    totalLength += (0, _haversine.haversineMetres)(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  return totalLength;
}