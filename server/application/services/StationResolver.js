/**
 * @file StationResolver.js
 * @responsibility Encapsulate the repository gap for resolving station metadata by code.
 * 
 * The repository currently lacks:
 * - A station dataset
 * - A station metadata lookup capability
 * - A StationRepository
 * - By-code Station resolution
 * 
 * This new StationResolver is intentionally scaffolding for a future integration point.
 * It does NOT currently resolve stations. It intentionally returns null.
 * 
 * No caching is implemented because there is no dataset to cache.
 */
class StationResolver {
    /**
     * Resolves a station code into a Station entity.
     * The interface is asynchronous to accommodate future remote/database implementations.
     * 
     * @param {string} code 
     * @returns {Promise<Object|null>} A Station entity or null if unresolvable.
     */
    async resolve(code) {
        // Repository audit confirmed that no station metadata source exists.
        // Returning null is intentional until a real repository-backed
        // implementation becomes available.
        return null;
    }
}

module.exports = StationResolver;
