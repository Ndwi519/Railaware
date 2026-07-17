/**
 * Pure helper to determine if a candidate station should replace an existing station
 * based on deterministic priority rules.
 * @returns {boolean} true if candidate should replace existing
 */
export function shouldReplaceStation(candidate, existing) {
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
 * Pure helper to deterministically order stations along the corridor.
 * @returns {number} negative if a comes first, positive if b comes first
 */
export function compareStationsAlongTrack(a, b) {
    if (a.alongTrackDistanceMetres !== b.alongTrackDistanceMetres) {
        return a.alongTrackDistanceMetres - b.alongTrackDistanceMetres;
    }
    return a.id - b.id;
}

/**
 * Pure helper to deduplicate matched stations based on station code.
 * @param {Array} matchedList - Array of tentatively matched station objects
 * @returns {Array} Deduplicated station objects
 */
export function deduplicateStations(matchedList) {
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
 * @param {Object} params.topology - The immutable O(1) topology metadata of the corridor
 * @param {Array} params.stations - The raw station features to filter
 * @param {number} params.thresholdMetres - The cross-track threshold for geometric fallback matching
 * @param {Function} params.projectPointOntoCorridor - Injected geometric projection function
 * @returns {Array} Extracted and deterministically ordered StationFeatures
 */
export function matchStationsToCorridor({ topology, stations, thresholdMetres, projectPointOntoCorridor }) {
    const { points, nodeDistanceLookup, authoritativeNodeLookup } = topology;
    const tentativeMatches = [];

    // 1. Match
    for (const st of stations) {
        
        const idKey = String(st.id);
        const isAuthoritativeNode = authoritativeNodeLookup[idKey] === true;
        
        
        let isValidMatch = false;
        let alongTrackDistanceMetres = 0;

        if (isAuthoritativeNode) {
            const authoritativeDistance = nodeDistanceLookup[idKey];
            if (authoritativeDistance !== undefined) {
                isValidMatch = true;
                alongTrackDistanceMetres = authoritativeDistance;
            } else {
                // Silently skip missing authoritative geometries defensively
                continue;
            }
        } else {
            const proj = projectPointOntoCorridor(st.feature, points);
            
            if (proj && proj.crossTrackDistanceMetres <= thresholdMetres) {
                isValidMatch = true;
                alongTrackDistanceMetres = proj.alongTrackDistanceMetres;
            }
        }

        if (isValidMatch) {
            
            tentativeMatches.push({
                ...st,
                alongTrackDistanceMetres
            });
        }
    }

    // 2. Deduplicate
    const finalStations = deduplicateStations(tentativeMatches);

    // 3. Sort
    finalStations.sort(compareStationsAlongTrack);

    // 4. Map to features
    

return finalStations.map(s => s.feature);
}
