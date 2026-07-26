"use strict";

const { DirectionInferenceResult } = require('./DirectionInferenceResult.js');
const { MovementState } = require('./MovementState.js');
const { SessionTrajectory } = require('./SessionTrajectory.js');
const { haversineMetres } = require('../calculations/haversine.js');
const { ValidationError } = require('./errors.js');

const STATIONARY_THRESHOLD_METRES = 15; // Within 15 metres is considered stationary/GPS jitter
const JUMP_THRESHOLD_METRES = 5000; // Impossibly large jump between points in quick succession

/**
 * Validates trajectory and determines the deterministic movement state.
 * Never predicts or estimates destinations.
 *
 * @param {import('../application/models/DiscoveryContext.js').DiscoveryContext} discoveryContext
 * @param {Object} [projectionResult=null]
 * @returns {DirectionInferenceResult}
 */
function inferDirection(discoveryContext, projectionResult = null) {
  if (!discoveryContext || !discoveryContext.sessionTrajectory) {
    throw new ValidationError('discoveryContext must contain a valid sessionTrajectory');
  }

  const obs = discoveryContext.sessionTrajectory.observations;

  if (obs.length < 2) {
    return new DirectionInferenceResult({
      movementState: MovementState.INSUFFICIENT_HISTORY,
      evidenceSummary: { observationsCount: obs.length }
    });
  }

  const latest = obs[obs.length - 1];
  const previous = obs[obs.length - 2];

  const distance = haversineMetres(
    previous.latitude,
    previous.longitude,
    latest.latitude,
    latest.longitude
  );

  // Very noisy or impossible jumps
  if (distance > JUMP_THRESHOLD_METRES) {
    return new DirectionInferenceResult({
      movementState: MovementState.NOISY,
      evidenceSummary: { distanceMetres: distance, reason: 'exceeds jump threshold' }
    });
  }

  // Stationary / Jitter
  if (distance <= STATIONARY_THRESHOLD_METRES) {
    return new DirectionInferenceResult({
      movementState: MovementState.STATIONARY,
      isStable: true,
      evidenceSummary: { distanceMetres: distance }
    });
  }

  // Heading calculation (0 to 360)
  const dLng = (latest.longitude - previous.longitude) * Math.PI / 180;
  const lat1 = previous.latitude * Math.PI / 180;
  const lat2 = latest.latitude * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  // We are not traversing branches yet, so we assume forward movement if we move at all.
  // In a real implementation, we would compare heading with the corridor segment vector.
  // We'll hardcode MOVING as the deterministic output for now when moving cleanly.
  return new DirectionInferenceResult({
    movementState: MovementState.MOVING,
    headingDegrees: heading,
    forwardVector: { lat: latest.latitude - previous.latitude, lng: latest.longitude - previous.longitude },
    isStable: true,
    evidenceSummary: { distanceMetres: distance }
  });
}

module.exports = {
  inferDirection
};
