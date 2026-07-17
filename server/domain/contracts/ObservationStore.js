/**
 * The immutable memory barrier between the Provider Interpretation Layer
 * and all downstream engines.
 */
class ObservationStore {
  async save(observation) {
    throw new Error('Not implemented');
  }

  async latest(trainNumber) {
    throw new Error('Not implemented');
  }

  async history(trainNumber, limit = null) {
    throw new Error('Not implemented');
  }

  async clear() {
    throw new Error('Not implemented');
  }
}

module.exports = ObservationStore;
