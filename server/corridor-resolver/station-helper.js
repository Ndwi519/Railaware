/**
 * @module corridor-resolver/station-helper
 * @responsibility Defensively extract authoritative StationFeatures from OSM nodes.
 */

/**
 * Extracts a StationFeature from an OSM node element.
 * 
 * Responsibilities:
 * - validate the OSM node
 * - validate coordinates
 * - validate required tags
 * - extract station code (ref:IR -> ref)
 * - build StationFeature
 * - return null for unusable nodes (malformed nodes must never throw)
 * 
 * @param {Object} element - Raw OSM element from Overpass response
 * @returns {Object|null} Internal object containing the feature and metadata for tie-breaking
 */
export function extractStationFeature(element) {
  if (!element || typeof element !== 'object' || element.type !== 'node') {
    return null;
  }

  if (typeof element.lat !== 'number' || typeof element.lon !== 'number') {
    return null;
  }

  if (!element.tags || typeof element.tags !== 'object') {
    return null;
  }

  if (element.tags.railway !== 'station') {
    return null;
  }

  // Priority 1: ref:IR
  // Priority 2: ref
  let code = element.tags['ref:IR'];
  let hasRefIR = true;

  if (typeof code !== 'string' || code.trim() === '') {
    code = element.tags.ref;
    hasRefIR = false;
  }

  if (typeof code !== 'string' || code.trim() === '') {
    return null; // Ignore nodes without usable station codes
  }

  const name = element.tags.name;
  const hasName = typeof name === 'string' && name.trim() !== '';

  const station = {
    code: code.trim(),
    source: 'osm'
  };

  if (hasName) {
    station.name = name.trim();
  }

  return {
    id: element.id,
    hasRefIR,
    hasName,
    feature: {
      station,
      lat: element.lat,
      lng: element.lon
    }
  };
}
