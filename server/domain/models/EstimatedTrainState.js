/**
 * @module domain/models/EstimatedTrainState
 * @responsibility Immutable value object representing the geographic and topological estimation of a train's state.
 */
function createEstimatedTrainState({
  trainAlongTrackDistanceMetres = null,
  userAlongTrackDistanceMetres = null,
  distanceMetres = null,
  direction = null,
  approaching = null,
  lastUpdatedAt = null
}) {
  return Object.freeze({
    trainAlongTrackDistanceMetres,
    userAlongTrackDistanceMetres,
    distanceMetres,
    direction,
    approaching,
    lastUpdatedAt
  });
}

module.exports = { createEstimatedTrainState };
