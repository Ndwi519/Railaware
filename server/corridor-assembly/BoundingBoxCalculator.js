/**
 * Calculates the immutable bounding box for a given collection of geometric paths.
 *
 * @param {Array<Array<{lat: number, lng: number}>>} traversableSegments The geometry
 * @returns {Object} Immutable bounding box { minLat, maxLat, minLng, maxLng }
 */
function calculateBoundingBox(traversableSegments) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  let hasValidCoordinates = false;

  if (Array.isArray(traversableSegments)) {
    for (const segment of traversableSegments) {
      if (Array.isArray(segment)) {
        for (const coord of segment) {
          if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
            hasValidCoordinates = true;
            if (coord.lat < minLat) minLat = coord.lat;
            if (coord.lat > maxLat) maxLat = coord.lat;
            if (coord.lng < minLng) minLng = coord.lng;
            if (coord.lng > maxLng) maxLng = coord.lng;
          }
        }
      }
    }
  }

  if (!hasValidCoordinates) {
    // Empty or invalid geometry, return safe null-equivalent bounds
    return Object.freeze({
      minLat: 0,
      maxLat: 0,
      minLng: 0,
      maxLng: 0
    });
  }

  return Object.freeze({
    minLat,
    maxLat,
    minLng,
    maxLng
  });
}

module.exports = {
  calculateBoundingBox
};
