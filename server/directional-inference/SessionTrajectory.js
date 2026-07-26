"use strict";

const { deepFreeze } = require('../utils/deepFreeze.js');
const { TrajectoryObservation } = require('./TrajectoryObservation.js');
const { ValidationError } = require('./errors.js');

/**
 * Immutable domain object representing an ordered history of GPS observations.
 * Stores only TrajectoryObservation objects.
 */
class SessionTrajectory {
  constructor(observations = [], maxHistory = 10) {
    if (!Array.isArray(observations)) {
      throw new ValidationError('Observations must be an array');
    }

    // Validate type and chronological ordering
    let prevTimestamp = 0;
    for (const obs of observations) {
      if (!(obs instanceof TrajectoryObservation)) {
        throw new ValidationError('SessionTrajectory accepts only TrajectoryObservation objects.');
      }
      if (obs.timestamp < prevTimestamp) {
        throw new ValidationError('Observations must be chronologically ordered');
      }
      prevTimestamp = obs.timestamp;
    }

    // Keep only the most recent 'maxHistory' observations
    this.observations = observations.slice(-maxHistory);
    this.maxHistory = maxHistory;

    deepFreeze(this);
  }

  /**
   * Returns a new SessionTrajectory with the appended observation.
   * Maintains immutability.
   * @param {TrajectoryObservation} observation
   * @returns {SessionTrajectory}
   */
  append(observation) {
    if (!(observation instanceof TrajectoryObservation)) {
      throw new ValidationError('SessionTrajectory accepts only TrajectoryObservation objects.');
    }

    const lastObs = this.observations[this.observations.length - 1];
    if (lastObs && observation.timestamp < lastObs.timestamp) {
      throw new ValidationError('Cannot append observation older than the latest in trajectory');
    }

    const newObservations = [...this.observations, observation];
    return new SessionTrajectory(newObservations, this.maxHistory);
  }
}

module.exports = {
  SessionTrajectory
};
