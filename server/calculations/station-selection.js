/**
 * @module calculations/station-selection
 * @responsibility Select the deterministic bounding stations surrounding a projected GPS position from an ordered station index.
 */

import { deepFreeze } from '../utils/deepFreeze.js';
import { TIE_BREAKING_TOLERANCE } from './constants.js';

/**
 * @typedef {import('./projection.js').ProjectionResult} ProjectionResult
 * @typedef {import('./station-index.js').StationIndexEntry} StationIndexEntry
 */

/**
 * @typedef {Object} BoundingStations
 * @property {StationIndexEntry} previousStation
 * @property {StationIndexEntry} nextStation
 * @property {number} previousIndex
 * @property {number} nextIndex
 */

/**
 * Selects the previous and next bounding stations for a projected coordinate.
 * 
 * Rules:
 * 1. Iterates exactly once (O(S) complexity).
 * 2. previousStation is the last station where alongTrackDistanceMetres <= projected distance.
 * 3. nextStation is the immediately following station.
 * 4. Returns null if projection is before the first station, after the final station, or fewer than 2 stations exist.
 * 
 * Contract Validation:
 * - The stationIndex MUST already be monotonically sorted by alongTrackDistanceMetres.
 * - The function strictly validates this contract and ensures every entry is well-formed.
 * - Any contract violation (malformed entry, unsorted index) returns null.
 * 
 * @param {ProjectionResult} projectionResult 
 * @param {Array<StationIndexEntry>} stationIndex - MUST be pre-sorted monotonically by alongTrackDistanceMetres
 * @returns {BoundingStations|null} Deeply frozen bounding stations, or null if unresolvable or if contract is violated.
 */
export function selectBoundingStations(projectionResult, stationIndex) {
  if (!projectionResult || typeof projectionResult.alongTrackDistanceMetres !== 'number') {
    return null;
  }

  if (!Array.isArray(stationIndex) || stationIndex.length < 2) {
    return null;
  }

  // Pre-validate the entire station index contract.
  // We do not silently skip malformed entries. The index is a precomputed immutable structure; 
  // receiving malformed data indicates an upstream contract violation.
  let previousDistance = -Infinity;
  for (let i = 0; i < stationIndex.length; i++) {
    const entry = stationIndex[i];
    
    if (!entry || !entry.station || typeof entry.alongTrackDistanceMetres !== 'number') {
      return null;
    }

    if (entry.alongTrackDistanceMetres < previousDistance) {
      return null;
    }
    
    previousDistance = entry.alongTrackDistanceMetres;
  }

  const projectedDistance = projectionResult.alongTrackDistanceMetres;

  let previousIndex = -1;

  for (let i = 0; i < stationIndex.length; i++) {
    const stationDistance = stationIndex[i].alongTrackDistanceMetres;

    // Due to floating point imprecision, we treat equality within TIE_BREAKING_TOLERANCE.
    // If the station distance is <= projectedDistance (accounting for precision),
    // it is a candidate for previousStation.
    if (stationDistance <= projectedDistance + TIE_BREAKING_TOLERANCE) {
      previousIndex = i;
    } else {
      // Since the array is pre-sorted monotonically, the first station that exceeds 
      // the projected distance (plus tolerance) must be the nextStation.
      // We can stop iterating.
      break;
    }
  }

  // If projection is before the first station, previousIndex remains -1
  if (previousIndex === -1) {
    return null;
  }

  const nextIndex = previousIndex + 1;

  // If projection is after or exactly on the final station, there is no nextStation
  if (nextIndex >= stationIndex.length) {
    return null;
  }

  return deepFreeze({
    previousStation: stationIndex[previousIndex],
    nextStation: stationIndex[nextIndex],
    previousIndex,
    nextIndex
  });
}
