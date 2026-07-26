Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GEOMETRIC_PROJECTION_CONSTRAINTS = exports.DEFAULT_THRESHOLDS = void 0;
/**
 * @module config/thresholds
 * @responsibility Define all configurable operational thresholds.
 */

const DEFAULT_THRESHOLDS = exports.DEFAULT_THRESHOLDS = {
  noiseThresholdMetres: 10,
  corridorSearchRadiusMetres: 500,
  corridorProximityMetres: 100,
  maxCandidateTrains: 10,
  pollingIntervalMs: 30_000,
  corridorCacheTtlMs: 5 * 60 * 1_000,
  // 5 minutes
  trainStatusCacheTtlMs: 30_000,
  // 30 seconds
  providerTimeoutMs: 10_000,
  bearingVarianceFailDegrees: 45,
  STATION_CORRIDOR_MATCH_DISTANCE_METRES: 175 // Phase 4 provisional calibration (NDLS measured cross-track ≈146.7m)
};

/**
 * Phase 3: Geometric Projection Constraints
 * 
 * ADR-011 mandates that these admissibility constraints govern the
 * geometric projection strategy. They are intentionally isolated and 
 * uncalibrated (undefined) in Phase 3 to prevent the algorithm from 
 * silently assuming guessed defaults. Calibration is deferred to Phase 4.
 */
const GEOMETRIC_PROJECTION_CONSTRAINTS = exports.GEOMETRIC_PROJECTION_CONSTRAINTS = {
  maximumProjectionDistanceMetres: 250,
  maximumAlongTrackGapMetres: 2000,
  minimumStationCount: 2,
  minimumCorridorCoverage: 0.8
};