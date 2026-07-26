Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compareStationsAlongTrack = compareStationsAlongTrack;
exports.deduplicateStations = deduplicateStations;
exports.matchStationsToCorridor = matchStationsToCorridor;
exports.shouldReplaceStation = shouldReplaceStation;
/**
 * Pure helper to determine if a candidate station should replace an existing station
 * based on deterministic priority rules.
 * @returns {boolean} true if candidate should replace existing
 */
function shouldReplaceStation(candidate, existing) {
  if (candidate.hasRefIR && !existing.hasRefIR) return true;
  if (candidate.hasRefIR === existing.hasRefIR) {
    if (candidate.hasName && !existing.hasName) return true;
    if (candidate.hasName === existing.hasName) {
      return candidate.id < existing.id;
    }
  }
  return false;
}

/**
 * Pure helper to deterministically order stations.
 * This comparator is an arbitrary implementation detail to guarantee tests are deterministic.
 * It strictly does NOT imply physical railway ordering or an operational route across branches.
 * @returns {number} negative if a comes first, positive if b comes first
 */
function compareStationsAlongTrack(a, b) {
  if (a.corridorSegmentIndex !== b.corridorSegmentIndex) {
    return (a.corridorSegmentIndex || 0) - (b.corridorSegmentIndex || 0);
  }
  if (a.alongTrackDistanceMetres !== b.alongTrackDistanceMetres) {
    return (a.alongTrackDistanceMetres || 0) - (b.alongTrackDistanceMetres || 0);
  }
  if (a.segmentIndex !== b.segmentIndex) {
    return (a.segmentIndex || 0) - (b.segmentIndex || 0);
  }
  return a.id - b.id;
}

/**
 * Pure helper to deduplicate matched stations based on station code.
 * @param {Array} matchedList - Array of tentatively matched station objects
 * @returns {Array} Deduplicated station objects
 */
function deduplicateStations(matchedList) {
  const deduplicated = new Map();
  for (const st of matchedList) {
    const code = st.feature.station.code;
    const existing = deduplicated.get(code);
    if (!existing || shouldReplaceStation(st, existing)) {
      deduplicated.set(code, st);
    }
  }
  return Array.from(deduplicated.values());
}

/**
 * Pure function to match stations to a corridor and return them deterministically ordered.
 *
 * @param {Object} params
 * @param {Object} params.assembledCorridor - The multi-branch assembled corridor
 * @param {Array} params.stations - The raw station features to filter
 * @param {number} params.thresholdMetres - The cross-track threshold for geometric fallback matching
 * @param {Function} params.projectOntoCorridor - Injected ProjectionAdapter.projectOntoCorridor
 * @returns {Array} Extracted and deterministically ordered StationFeatures
 */
function matchStationsToCorridor({
  assembledCorridor,
  stations,
  thresholdMetres,
  projectOntoCorridor
}) {
  const tentativeMatches = [];

  // 1. Match
  for (const st of stations) {
    // The ProjectionAdapter expects an object containing { lat, lng }.
    // We pass the inner feature which natively holds these extracted coordinates.
    const point = st.feature;
    const proj = projectOntoCorridor(assembledCorridor, point);

    if (proj && proj.crossTrackDistanceMetres <= thresholdMetres) {
      tentativeMatches.push({
        ...st,
        corridorSegmentIndex: proj.corridorSegmentIndex,
        alongTrackDistanceMetres: proj.alongTrackDistanceMetres, // Note: This is polyline-local, not end-to-end
        segmentIndex: proj.segmentIndex // Note: This is polyline-local
      });
    }
  }

  // 2. Deduplicate
  const finalStations = deduplicateStations(tentativeMatches);

  // 3. Sort
  finalStations.sort(compareStationsAlongTrack);

  return finalStations.map(s => {
    return {
      ...s.feature,
      corridorSegmentIndex: s.corridorSegmentIndex,
      alongTrackDistanceMetres: s.alongTrackDistanceMetres,
      segmentIndex: s.segmentIndex
    };
  });
}