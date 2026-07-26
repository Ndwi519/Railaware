"use strict";

const { SessionTrajectory } = require('../../directional-inference/SessionTrajectory.js');
const { TrajectoryObservation } = require('../../directional-inference/TrajectoryObservation.js');

class TrajectoryManager {
  /**
   * Prototype session store implementation.
   * - In-memory only.
   * - Lost on restart.
   * - Not shared across server instances.
   * - Implements basic LRU eviction.
   *
   * @param {number} maxSessions - Maximum number of active sessions to retain. Default 1000.
   */
  constructor(maxSessions = 1000) {
    this.maxSessions = maxSessions;
    this.sessions = new Map(); // stores { sessionTrajectory, routingState }
  }

  /**
   * Records a new location and returns the updated trajectory.
   * @param {string} sessionId
   * @param {number} lat
   * @param {number} lng
   * @returns {{observation: TrajectoryObservation, sessionTrajectory: SessionTrajectory}}
   */
  recordObservation(sessionId, lat, lng) {
    if (!sessionId) {
      throw new Error('sessionId is required for trajectory operations');
    }

    const observation = new TrajectoryObservation({
      timestamp: Date.now(),
      latitude: lat,
      longitude: lng
    });

    let sessionEntry = this.sessions.get(sessionId);
    if (!sessionEntry) {
      sessionEntry = {
        sessionTrajectory: new SessionTrajectory(),
        routingState: {}
      };
    }

    sessionEntry.sessionTrajectory = sessionEntry.sessionTrajectory.append(observation);

    // LRU behaviour: delete and re-insert to move to the end of the Map
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
    }
    this.sessions.set(sessionId, sessionEntry);

    // Evict oldest if we exceed limit
    if (this.sessions.size > this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      this.sessions.delete(oldestKey);
    }

    return {
      observation,
      sessionTrajectory: sessionEntry.sessionTrajectory
    };
  }

  /**
   * Explicit lookup of a session trajectory
   * @param {string} sessionId
   * @returns {SessionTrajectory}
   */
  getOrCreateTrajectory(sessionId) {
    if (!sessionId) throw new Error('sessionId is required');
    let sessionEntry = this.sessions.get(sessionId);
    if (!sessionEntry) {
      sessionEntry = {
        sessionTrajectory: new SessionTrajectory(),
        routingState: {}
      };
      this.sessions.set(sessionId, sessionEntry);
      if (this.sessions.size > this.maxSessions) {
        const oldestKey = this.sessions.keys().next().value;
        this.sessions.delete(oldestKey);
      }
    } else {
      // Refresh LRU position
      this.sessions.delete(sessionId);
      this.sessions.set(sessionId, sessionEntry);
    }
    return sessionEntry.sessionTrajectory;
  }

  /**
   * Saves routing state for the session without creating a new trajectory point.
   * @param {string} sessionId
   * @param {Object} routingState
   */
  saveRoutingState(sessionId, routingState) {
    if (!sessionId) throw new Error('sessionId is required');
    const sessionEntry = this.sessions.get(sessionId);
    if (sessionEntry) {
      sessionEntry.routingState = { ...sessionEntry.routingState, ...routingState };
      // Refresh LRU position
      this.sessions.delete(sessionId);
      this.sessions.set(sessionId, sessionEntry);
    }
  }

  /**
   * Retrieves the current routing state for a session.
   * @param {string} sessionId
   * @returns {Object}
   */
  getRoutingState(sessionId) {
    if (!sessionId) throw new Error('sessionId is required');
    const sessionEntry = this.sessions.get(sessionId);
    return sessionEntry ? (sessionEntry.routingState || {}) : {};
  }
}

module.exports = { TrajectoryManager };
