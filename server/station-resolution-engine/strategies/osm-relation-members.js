Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OsmRelationMembersStrategy = void 0;
/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
class OsmRelationMembersStrategy {
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
exports.OsmRelationMembersStrategy = OsmRelationMembersStrategy;