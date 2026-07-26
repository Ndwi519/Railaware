const { ValidationError } = require('./errors.js');

/**
 * Pure functions to validate Route Selection inputs.
 */

function validateAssembledCorridor(corridor) {
  if (!corridor) {
    throw new ValidationError('AssembledCorridor is required.');
  }
  if (typeof corridor.getTraversableSegments !== 'function') {
    throw new ValidationError('Invalid AssembledCorridor: missing getTraversableSegments().');
  }
}

function validateProjectionResult(projection) {
  if (!projection) {
    throw new ValidationError('ProjectionResult is required.');
  }
  if (!projection.projectedPoint || typeof projection.projectedPoint.lat !== 'number' || typeof projection.projectedPoint.lng !== 'number') {
    throw new ValidationError('Invalid ProjectionResult: missing projectedPoint with lat/lng.');
  }
}

module.exports = {
  validateAssembledCorridor,
  validateProjectionResult
};
