"use strict";

const { deepFreeze } = require('../../utils/deepFreeze.js');

class DiscoveryContext {
  constructor({ observation, sessionTrajectory, routingState = {} }) {
    if (!observation) {
      throw new Error("DiscoveryContext requires an observation.");
    }
    if (!sessionTrajectory) {
      throw new Error("DiscoveryContext requires a sessionTrajectory.");
    }

    this.observation = observation;
    this.sessionTrajectory = sessionTrajectory;
    this.routingState = routingState;

    deepFreeze(this);
  }
}

module.exports = { DiscoveryContext };
