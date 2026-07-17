/**
 * Represents basic static information about a train.
 */
function createTrain({ number, name, startDate }) {
  return Object.freeze({
    number,
    name,
    startDate
  });
}

module.exports = { createTrain };
