/**
 * @typedef {"HIGH" | "MEDIUM" | "LOW"} ResolutionConfidence
 */

/**
 * @typedef {import('../domain/types/station.js').StationReference} StationReference
 */

/**
 * @typedef {Object} ResolutionAttempt
 * @property {string} strategy - The name of the strategy
 * @property {boolean} success - Whether the strategy succeeded
 * @property {string} reason - The reason for failure or success
 * @property {number} durationMs - How long the strategy took to execute
 */

/**
 * @typedef {Object} ResolutionResult
 * @property {import('../domain/types/enums.js').ResolutionStatus} status
 * @property {StationReference | null} previousStation
 * @property {StationReference | null} nextStation
 * @property {import('../domain/types/enums.js').ResolutionMethod | null} method
 * @property {ResolutionConfidence | null} confidence
 * @property {string[]} confidenceReasons
 * @property {import('../domain/types/enums.js').EvidenceSource[]} evidenceSources
 * @property {ResolutionAttempt[]} attempts
 */

/**
 * @interface ResolutionStrategy
 * @property {string} name
 * @method resolve
 * @param {Object} gps - { lat, lng }
 * @param {Object} snappedGeometry - Output from CorridorResolver
 * @returns {Promise<{success: true, previousStation: StationReference, nextStation: StationReference, confidence: import('../domain/types/enums.js').ConfidenceLevel, method: import('../domain/types/enums.js').ResolutionMethod, confidenceReasons: string[], evidenceSources: import('../domain/types/enums.js').EvidenceSource[], reason?: string} | {success: false, reason?: string}>}
 */

/**
 * @interface StationResolutionCache
 * @method get
 * @param {string} cacheKey
 * @returns {Promise<ResolutionResult | null>}
 * @method set
 * @param {string} cacheKey
 * @param {ResolutionResult} result
 * @param {number} [ttlMs]
 * @returns {Promise<void>}
 */

export {};
