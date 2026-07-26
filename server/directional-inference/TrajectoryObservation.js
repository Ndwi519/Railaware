"use strict";

const { deepFreeze } = require('../utils/deepFreeze.js');
const { ValidationError } = require('./errors.js');

/**
 * Immutable domain object representing a single temporal GPS observation,
 * optionally augmented with projection data.
 */
class TrajectoryObservation {
  constructor({ timestamp, latitude, longitude, projectionResult = null, metadata = {} }) {
    if (typeof timestamp !== 'number') {
      throw new ValidationError('TrajectoryObservation requires a numeric timestamp.');
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new ValidationError('TrajectoryObservation requires numeric latitude and longitude.');
    }

    this.timestamp = timestamp;
    this.latitude = latitude;
    this.longitude = longitude;
    this.projectionResult = projectionResult;
    this.metadata = metadata;

    deepFreeze(this);
  }
}

module.exports = {
  TrajectoryObservation
};
