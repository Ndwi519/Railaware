const { createClient } = require('redis');
const ObservationStore = require('../domain/contracts/ObservationStore.js');
const { createLogger } = require('../utils/logger.js');
const log = createLogger('observation-store:redis');

class RedisObservationStore extends ObservationStore {
  constructor(url = 'redis://localhost:6379', limit = 100, ttlSeconds = 86400) {
    super();
    this.limit = limit;
    this.ttlSeconds = ttlSeconds;
    this.client = createClient({ url });
    
    this.client.on('error', (err) => log.error('Redis Client Error', err));
    
    this.connectionPromise = this.client.connect().catch(err => {
      log.error('Failed to connect to Redis', err);
    });
  }

  async save(observation) {
    if (!observation || !observation.train || !observation.train.number) {
      throw new Error('Invalid observation: missing train number');
    }
    const trainNumber = observation.train.number;

    await this.connectionPromise;

    const key = `train_history:${trainNumber}`;

    // Get current history to enforce chronological precedence rules
    const historyData = await this.client.lRange(key, 0, -1);
    const history = historyData.map(d => JSON.parse(d));
    
    const latestObs = history.length > 0 ? history[history.length - 1] : null;

    if (latestObs) {
      const getTimestamp = (obs) => {
        const lastUpdated = typeof obs.lastUpdatedAt === 'string' ? new Date(obs.lastUpdatedAt) : obs.lastUpdatedAt;
        const recordedAt = typeof obs.recordedAt === 'string' ? new Date(obs.recordedAt) : obs.recordedAt;

        if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) return new Date(lastUpdated).getTime();
        if (recordedAt && !isNaN(new Date(recordedAt).getTime())) return new Date(recordedAt).getTime();
        throw new Error('Invalid Observation: missing both lastUpdatedAt and recordedAt');
      };

      const newTimestamp = getTimestamp(observation);
      const latestTimestamp = getTimestamp(latestObs);

      if (newTimestamp < latestTimestamp) {
        // Reject older observation
        return;
      }
      
      if (newTimestamp === latestTimestamp) {
        // Replace previous observation
        await this.client.rPop(key);
      }
    }

    // Push new observation
    await this.client.rPush(key, JSON.stringify(observation));
    
    // Trim history
    await this.client.lTrim(key, -this.limit, -1);
    
    // Set TTL
    await this.client.expire(key, this.ttlSeconds);
  }

  async latest(trainNumber) {
    await this.connectionPromise;
    const key = `train_history:${trainNumber}`;
    const result = await this.client.lRange(key, -1, -1);
    if (result && result.length > 0) {
      return JSON.parse(result[0]);
    }
    return null;
  }

  async history(trainNumber, limit = null) {
    await this.connectionPromise;
    const key = `train_history:${trainNumber}`;
    let result = [];
    if (limit !== null && limit > 0) {
      result = await this.client.lRange(key, -limit, -1);
    } else {
      result = await this.client.lRange(key, 0, -1);
    }
    return result.map(d => JSON.parse(d));
  }

  async clear() {
    await this.connectionPromise;
    // In a production system we'd probably use a set to track keys, or use SCAN.
    // Since this is for prototyping/testing, we can just flushdb.
    await this.client.flushDb();
  }
}

module.exports = RedisObservationStore;
