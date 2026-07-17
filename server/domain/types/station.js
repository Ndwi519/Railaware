/**
 * @typedef {Object} StationReference
 * @property {string} code - The verified station code (e.g. from ref or ref:IR tag)
 * @property {string} [name] - Optional station name
 * @property {"osm" | "railradar" | "offline"} source - The source of the station code
 * @property {number} [dist] - Distance in metres from reference point (used in some legacy APIs)
 */

/**
 * @typedef {Object} StationFeature
 * @property {StationReference} station
 * @property {number} lat
 * @property {number} lng
 */

export {};
