const { deepFreeze } = require('../utils/deepFreeze.js');
const { ResolutionStatus } = require('../domain/types/enums.js');

/**
 * Constructs the resolver response and strictly enforces the Version 1.1 Architecture Amendment.
 * Separates graph-relative metrics (which are immediately valid) from route-relative metrics
 * (which require a future Route Selection milestone to populate).
 */
function createResponse(projection, stationsOutput) {
  const closestPoint = projection ? {
    lat: projection.projectedPoint.lat,
    lng: projection.projectedPoint.lng
  } : null;

  const publicStations = (stationsOutput || []).map(st => ({
    station: { ...st.station },
    lat: st.lat,
    lng: st.lng,
    distance: st.distance
  }));

  return deepFreeze({
    // -- Graph-Relative Metrics --
    closestPoint,
    resolutionStatus: ResolutionStatus.RESOLVED,
    stations: publicStations,

    // [DEFERRED INTEGRATION]
    // nearestBoundingStations requires an operational route to define "ahead" and "behind".
    // It cannot be truthfully derived from a multi-branch physical graph alone.
    // Explicitly null pending Route Selection milestone.
    nearestBoundingStations: null,

    // -- Route-Relative Metrics (V1.1 Architecture) --
    // INTEGRATION POINT: These fields require a future Route Selection milestone.
    // They are explicitly null here because Resolver must not guess operational routes.
    corridorGeometry: null,
    segmentLengthKm: null,
    userSegmentFraction: null
  });
}

module.exports = {
  createResponse
};
