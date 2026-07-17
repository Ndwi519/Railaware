/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
export class OfflineGraphStrategy {
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
