/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
export class RailRadarRouteGeometryStrategy {
  constructor() {
    this.name = 'RailRadar Route Geometry';
  }

  async resolve(gps, snappedGeometry) {
    return {
      success: false,
      reason: 'Provider route geometry only returns LineString arrays with no topological station markers. Cannot extract verified station codes without heuristics.'
    };
  }
}
