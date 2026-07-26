"use strict";

/**
 * @module route-selection/TravelDirection
 *
 * Defines corridor-relative travel direction semantics.
 * - FORWARD means movement aligned with segment.startNodeId -> segment.endNodeId ordering.
 * - BACKWARD means movement aligned with segment.endNodeId -> segment.startNodeId.
 *
 * This definition is graph-topology-relative only. It is NOT:
 * - operational railway direction
 * - timetable direction
 * - destination direction
 * - passenger-facing direction
 * - "toward next station"
 */
const TravelDirection = Object.freeze({
  FORWARD: 'FORWARD',
  BACKWARD: 'BACKWARD',
  STATIONARY: 'STATIONARY',
  UNKNOWN: 'UNKNOWN'
});

module.exports = { TravelDirection };
