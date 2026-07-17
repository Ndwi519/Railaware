/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
export class OsmRelationMembersStrategy {
  constructor() {
    this.name = 'OSM Relation Members';
  }

  async resolve(gps, snappedGeometry) {
    return {
      success: false,
      reason: 'No verified station codes found within generic relation members.'
    };
  }
}
