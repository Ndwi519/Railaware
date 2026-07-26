const ObservationStore = require('../domain/contracts/ObservationStore.js');

class InMemoryObservationStore extends ObservationStore {
  constructor(limit = 100, maxTrains = 10000) {
    super();
    this.limit = limit;
    this.maxTrains = maxTrains;
    this.store = new Map();
  }

  async save(observation) {
    if (!observation || !observation.train || !observation.train.number) {
      throw new Error('Invalid observation: missing train number');
    }
    const trainNumber = observation.train.number;

    if (!this.store.has(trainNumber)) {
      if (this.store.size >= this.maxTrains) {
        // Evict oldest train (FIFO insertion order)
        const oldestTrain = this.store.keys().next().value;
        this.store.delete(oldestTrain);
      }
      this.store.set(trainNumber, []);
    }

    const history = this.store.get(trainNumber);
    const latestObs = history.length > 0 ? history[history.length - 1] : null;

    if (latestObs) {
      // Precedence rule: lastUpdatedAt (provider-generated geographic ping) takes priority.
      // recordedAt (local HTTP capture time) is the required fallback.
      // Both being absent is an Observation contract violation — fail fast rather than silently
      // treating the observation as epoch (0), which would mask the programming error.
      const getTimestamp = (obs) => {
        if (obs.lastUpdatedAt instanceof Date && !isNaN(obs.lastUpdatedAt.getTime())) return obs.lastUpdatedAt.getTime();
        if (obs.recordedAt instanceof Date && !isNaN(obs.recordedAt.getTime())) return obs.recordedAt.getTime();
        throw new Error('Invalid Observation: missing both lastUpdatedAt and recordedAt');
      };
      const newTimestamp = getTimestamp(observation);
      const latestTimestamp = getTimestamp(latestObs);

      if (newTimestamp < latestTimestamp) {
        // Reject older observation to preserve deterministic chronological order
        return;
      }
      if (newTimestamp === latestTimestamp) {
        // Option B: Equal timestamps may contain different administrative data (e.g., status
        // changed to CANCELLED without a new GPS ping). Replace the previous observation to
        // capture the latest metadata without adding a zero-time-delta geographic step.
        history[history.length - 1] = observation;
        return;
      }
    }

    // Push the immutable observation directly. Models are already Object.frozen by creation.
    history.push(observation);

    if (history.length > this.limit) {
      history.shift(); // Drop oldest entry
    }
  }

  async latest(trainNumber) {
    const history = this.store.get(trainNumber) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  async history(trainNumber, limit = null) {
    const history = this.store.get(trainNumber) || [];
    if (limit !== null && limit > 0) {
      return history.slice(-limit);
    }
    return [...history]; // Return shallow copy of the array to preserve encapsulation
  }

  async clear() {
    this.store.clear();
  }
}

module.exports = InMemoryObservationStore;
