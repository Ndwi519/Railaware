Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TIE_BREAKING_TOLERANCE = exports.GEOMETRIC_NUMERICAL_TOLERANCE = void 0;
/**
 * @module calculations/constants
 * @responsibility Shared numerical constants for geometric and mathematical calculations.
 */

// Tolerance used for preventing division-by-zero on overlapping GPS coordinates or zero-length segments.
const GEOMETRIC_NUMERICAL_TOLERANCE = exports.GEOMETRIC_NUMERICAL_TOLERANCE = 1e-9;

// Tolerance used for comparing minimum cross-track distances and along-track distances to guarantee deterministic tie-breaking.
const TIE_BREAKING_TOLERANCE = exports.TIE_BREAKING_TOLERANCE = 1e-9;