Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RailRadarRouteGeometryStrategy = void 0;
/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
class RailRadarRouteGeometryStrategy {
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
exports.RailRadarRouteGeometryStrategy = RailRadarRouteGeometryStrategy;