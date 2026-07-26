/**
 * Generic request-scoped cache to guarantee expensive operations execute exactly once.
 */
class RequestCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Retrieves an existing promise/result or executes the factory and caches the result.
   * @param {string} key Unique identifier for the operation
   * @param {Function} factory Function returning a Promise or value
   * @returns {Promise<any>}
   */
  getOrCreate(key, factory) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Store the Promise immediately to prevent concurrent duplicate executions
    let promise;
    try {
      promise = Promise.resolve(factory());
    } catch (e) {
      promise = Promise.reject(e);
    }

    promise = promise.catch(err => {
      this.cache.delete(key);
      throw err;
    });
    this.cache.set(key, promise);

    return promise;
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = RequestCache;
