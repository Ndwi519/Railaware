/**
 * Confidence levels for the reliability of an observation.
 * @enum {string}
 */
const ConfidenceLevel = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Risk assessment levels for a user journey.
 * @enum {string}
 */
const RiskLevel = Object.freeze({
  SAFE: 'SAFE',
  ELEVATED: 'ELEVATED',
  IMMINENT: 'IMMINENT',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Known train statuses from the provider mapping.
 * @enum {string}
 */
const TrainStatus = Object.freeze({
  RUNNING: 'running',
  DEPARTED: 'departed',
  EN_ROUTE: 'en route',
  ARRIVED: 'arrived',
  CANCELLED: 'cancelled',
  NOT_STARTED: 'not-started',
  UNKNOWN: 'unknown'
});

/**
 * Standardized status for discovery strategies.
 * @enum {string}
 */
const DiscoveryStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  ERROR: 'ERROR',
  PREREQUISITE_UNAVAILABLE: 'PREREQUISITE_UNAVAILABLE'
});

/**
 * Standardized status for station resolution.
 * @enum {string}
 */
const ResolutionStatus = Object.freeze({
  RESOLVED: 'RESOLVED',
  UNRESOLVED: 'UNRESOLVED'
});

const ResolutionMethod = Object.freeze({
  VERIFIED_TOPOLOGY: 'VERIFIED_TOPOLOGY',
  OFFLINE_GRAPH: 'OFFLINE_GRAPH',
  PROVIDER_GRAPH: 'PROVIDER_GRAPH',
  GEOMETRIC_PROJECTION: 'GEOMETRIC_PROJECTION'
});

/**
 * Standardized evidence sources for station resolution.
 * @enum {string}
 */
const EvidenceSource = Object.freeze({
  OSM_TRACK_GEOMETRY: 'OSM_TRACK_GEOMETRY',
  OSM_STATION_NODE: 'OSM_STATION_NODE',
  OSM_ROUTE_RELATION: 'OSM_ROUTE_RELATION',
  OFFLINE_GRAPH: 'OFFLINE_GRAPH',
  PROVIDER_TOPOLOGY: 'PROVIDER_TOPOLOGY',
  GEOMETRIC_PROJECTION: 'GEOMETRIC_PROJECTION'
});

/**
 * Centralized numerical ranking for confidence levels.
 * UNKNOWN has the lowest score (dominant in conservative combination).
 * @enum {number}
 */
const ConfidenceRanking = Object.freeze({
  [ConfidenceLevel.UNKNOWN]: 0,
  [ConfidenceLevel.LOW]: 1,
  [ConfidenceLevel.MEDIUM]: 2,
  [ConfidenceLevel.HIGH]: 3
});

module.exports = {
  ConfidenceLevel,
  RiskLevel,
  TrainStatus,
  DiscoveryStatus,
  ResolutionStatus,
  ResolutionMethod,
  EvidenceSource,
  ConfidenceRanking
};
