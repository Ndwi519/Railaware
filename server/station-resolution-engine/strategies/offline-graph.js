Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OfflineGraphStrategy = void 0;
/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
class OfflineGraphStrategy {
  constructor() {
    this.name = 'Cached Offline Railway Graph';
  }
  async resolve(gps, snappedGeometry) {
    return {
      success: false,
      reason: 'Dataset unavailable. Proprietary GIS database linking OSM nodes to Indian Railways master datasets is required.'
    };
  }
}
exports.OfflineGraphStrategy = OfflineGraphStrategy;