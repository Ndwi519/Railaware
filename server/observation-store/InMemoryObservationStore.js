const ObservationStore = require('../domain/contracts/ObservationStore.js');

class InMemoryObservationStore extends ObservationStore {
  constructor(limit = 100) {
    super();
    this.limit = limit;
    this.store = new Map();
  }

  async save(observation) {
    if (!observation || !observation.train || !observation.train.number) {
      throw new Error('Invalid observation: missing train number');
    }
    const trainNumber = observation.train.number;
    
    if (!this.store.has(trainNumber)) {
      this.store.set(trainNumber, []);
    }
    
    const history = this.store.get(trainNumber);
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
