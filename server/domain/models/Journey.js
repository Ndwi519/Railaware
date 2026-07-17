/**
 * Represents a user's intent to board a specific train at a specific station.
 */
function createJourney({ id, train, targetStation, userId }) {
  return Object.freeze({
    id,
    train,
    targetStation,
    userId
  });
}

module.exports = { createJourney };
