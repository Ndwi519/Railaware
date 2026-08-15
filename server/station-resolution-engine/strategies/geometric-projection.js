Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GeometricProjectionStrategy = void 0;
var _index = require("../../calculations/index.js");
var _enums = require("../../domain/types/enums.js");
var _deepFreeze = require("../../utils/deepFreeze.js");
/**
 * @implements {import('../types.js').ResolutionStrategy}
 */
class GeometricProjectionStrategy {
  /**
   * @param {Object} config
   * @param {number} config.maximumProjectionDistanceMetres
   * @param {number} config.maximumAlongTrackGapMetres
   * @param {number} config.minimumStationCount
   * @param {number} config.minimumCorridorCoverage
   */
  constructor(config = {}) {
    this.name = 'Geometric Projection';
    this.config = {
      maximumProjectionDistanceMetres: config.maximumProjectionDistanceMetres,
      maximumAlongTrackGapMetres: config.maximumAlongTrackGapMetres,
      minimumStationCount: config.minimumStationCount,
      minimumCorridorCoverage: config.minimumCorridorCoverage
    };
  }

  /**
  * Resolves the bounding stations geometrically.
  *
  * Requires snappedGeometry to provide:
  * - corridorGeometry
  * - stations
  *
  * Resolution succeeds only when at least two valid stations can be
  * projected onto the resolved corridor.
  */
  async resolve(gps, snappedGeometry) {
    // 1. Validate inputs
    if (!gps || typeof gps.lat !== 'number' || typeof gps.lng !== 'number') {
      return {
        success: false,
        reason: "Invalid GPS coordinates"
      };
    }
    if (!snappedGeometry || typeof snappedGeometry !== 'object') {
      return {
        success: false,
        reason: "Invalid snapped corridor geometry"
      };
    }

    // 2. Extract corridorGeometry and stations
    const {
      corridorGeometry,
      stations
    } = snappedGeometry;
    if (!corridorGeometry || !stations) {
      return {
        success: false,
        reason: "Missing required corridorGeometry or stations in snappedGeometry"
      };
    }

    // 3. Build the station index
    const stationIndex = (0, _index.buildCorridorStationIndex)(corridorGeometry, stations);
    if (!stationIndex || stationIndex.length < 2) {
      return {
        success: false,

        reason: "Insufficient valid stations in corridor to establish bounds"
      };
    }

    // 4. Project the GPS
    const projectionResult = (0, _index.projectPointOntoCorridor)(gps, corridorGeometry);
    if (!projectionResult) {
      return {
        success: false,
        reason: "Failed to mathematically project GPS point onto corridor geometry"
      };
    }

    // 5. Select bounding stations
    const bounding = (0, _index.selectBoundingStations)(projectionResult, stationIndex);
    if (!bounding) {
      return {
        success: false,
        reason: "GPS projection falls outside the bounds of known stations on this corridor"
      };
    }

    // 6. Evaluate geometric constraints
    if (this.config.maximumProjectionDistanceMetres === undefined || this.config.maximumAlongTrackGapMetres === undefined || this.config.minimumStationCount === undefined || this.config.minimumCorridorCoverage === undefined) {
      return {
        success: false,
        reason: "Geometric projection constraints are not calibrated"
      };
    }
    if (projectionResult.crossTrackDistanceMetres > this.config.maximumProjectionDistanceMetres) {
      return {
        success: false,
        reason: "Cross-track projection distance exceeds configured limit"
      };
    }
    const gapMetres = bounding.nextStation.alongTrackDistanceMetres - bounding.previousStation.alongTrackDistanceMetres;
    if (gapMetres > this.config.maximumAlongTrackGapMetres) {
      return {
        success: false,
        reason: "Along-track gap between bounding stations exceeds configured limit"
      };
    }
    if (stationIndex.length < this.config.minimumStationCount) {
      return {
        success: false,
        reason: "Total valid stations is below minimum required"
      };
    }
    const corridorLengthMetres = (0, _index.calculatePolylineLengthMetres)(corridorGeometry);
    if (corridorLengthMetres > 0) {
      const stationSpanMetres = stationIndex[stationIndex.length - 1].alongTrackDistanceMetres - stationIndex[0].alongTrackDistanceMetres;
      const coverage = stationSpanMetres / corridorLengthMetres;
      if (coverage < this.config.minimumCorridorCoverage) {
        return {
          success: false,
          reason: "Station coverage is below minimum required"
        };
      }
    }

    // 7. Successful resolution
    return (0, _deepFreeze.deepFreeze)({
      success: true,
      previousStation: bounding.previousStation.station,
      nextStation: bounding.nextStation.station,
      method: _enums.ResolutionMethod.GEOMETRIC_PROJECTION,
      confidence: _enums.ConfidenceLevel.LOW,
      confidenceReasons: ["Projected onto corridor geometry.", "Bounding stations determined geometrically.", "No authoritative topology available."],
      evidenceSources: [_enums.EvidenceSource.GEOMETRIC_PROJECTION]
    });
  }
}
exports.GeometricProjectionStrategy = GeometricProjectionStrategy;