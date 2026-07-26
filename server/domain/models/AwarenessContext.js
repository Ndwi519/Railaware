/**
 * @module domain/models/AwarenessContext
 * @responsibility Immutable value object representing the complete situational awareness delivered to the presentation layer.
 */
function createAwarenessContext({
  status,
  trainAlongTrackDistanceMetres = null,
  userAlongTrackDistanceMetres = null,
  distanceMetres = null,
  direction = null,
  approaching = null,
  observationConfidence,
  providerReliability,
  lastUpdatedAt,
  explanation,
  requiresProminentDisplay
}) {
  if (!status || typeof status !== 'string') {
    throw new Error('AwarenessContext invariant violated: status must be a non-empty string');
  }
  if (!observationConfidence || typeof observationConfidence !== 'string') {
    throw new Error('AwarenessContext invariant violated: observationConfidence must be a non-empty string');
  }
  if (!providerReliability || typeof providerReliability !== 'string') {
    throw new Error('AwarenessContext invariant violated: providerReliability must be a non-empty string');
  }

  return Object.freeze({
    status,
    trainAlongTrackDistanceMetres,
    userAlongTrackDistanceMetres,
    distanceMetres,
    direction,
    approaching,
    observationConfidence,
    providerReliability,
    lastUpdatedAt,
    explanation,
    requiresProminentDisplay
  });
}

module.exports = { createAwarenessContext };
