/**
 * Validates inputs for the projection adapter.
 *
 * @param {Object} assembledCorridor The immutable AssembledCorridor instance
 * @param {Object} point The observation point {lat, lng}
 * @throws {TypeError} If inputs do not meet contract requirements
 */
function validateInputs(assembledCorridor, point) {
  if (!assembledCorridor || typeof assembledCorridor.getTraversableSegments !== 'function') {
    throw new TypeError('Invalid AssembledCorridor: must expose getTraversableSegments()');
  }

  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    throw new TypeError('Invalid observation point: must contain numeric lat and lng properties');
  }
}

module.exports = {
  validateInputs
};
