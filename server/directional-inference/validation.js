"use strict";

const { ValidationError } = require('./errors.js');

function validateObservation(obs) {
  if (!obs || typeof obs !== 'object') {
    throw new ValidationError('Observation must be an object');
  }
  if (typeof obs.timestamp !== 'number') {
    throw new ValidationError('Observation missing valid numeric timestamp');
  }
  if (!obs.location || typeof obs.location.lat !== 'number' || typeof obs.location.lng !== 'number') {
    throw new ValidationError('Observation missing valid location object with lat and lng');
  }
}

module.exports = {
  validateObservation
};
