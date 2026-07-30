const { CorridorResolver } = require('../../corridor-resolver/resolver.js');
const { evaluateCandidates } = require('../../projection-adapter/CandidateEvaluator.js');
const { DEFAULT_THRESHOLDS } = require('../../config/thresholds.js');

/**
 * Spatial Awareness Service
 * 
 * Provides a stateless, single-shot snapshot query for nearby spatial infrastructure.
 * Fully decoupled from session tracking, continuous tracking, or temporal hysteresis.
 * Designed purely to satisfy the Phase 1 static awareness requirements.
 */
class SpatialAwarenessService {
    constructor(overpassClient, thresholds) {
        this.resolver = new CorridorResolver(overpassClient);
        this.radiusMetres = thresholds.DEFAULT_THRESHOLDS.SPATIAL_AWARENESS_RADIUS_METRES || 300;
    }

    /**
     * Executes a stateless snapshot query for nearby railways, crossings, and stations.
     *
     * @param {Object} location { lat, lng }
     * @returns {Object} Phase 1 Spatial Awareness Result
     */
    async getNearbyAwareness(location) {
        const { assembledCorridors, nearestStation } = await this.resolver.resolveAllClusters(location, this.radiusMetres);

        if (assembledCorridors.length === 0) {
            return {
                nearbyTracks: [],
                nearestCrossing: null,
                nearestStation: null,
                disclaimer: "No railway infrastructure detected within range. Ensure you are near a track."
            };
        }

        const trackListRadius = DEFAULT_THRESHOLDS.SPATIAL_AWARENESS_TRACK_LIST_RADIUS_METRES || 100;
        const branchMap = new Map();

        for (const assembledCorridor of assembledCorridors) {
            const segments = assembledCorridor.getTraversableSegments();
            const clusterCandidates = evaluateCandidates(segments, location);

            for (const candidate of clusterCandidates) {
                if (candidate.result.crossTrackDistanceMetres <= trackListRadius) {
                    // Because branchId contains global OSM node IDs, they are guaranteed to not collide 
                    // across different disjoint graph clusters.
                    const branchId = assembledCorridor.getBranchId(candidate.evaluationOrder);
                    if (!branchMap.has(branchId) || candidate.result.crossTrackDistanceMetres < branchMap.get(branchId).result.crossTrackDistanceMetres) {
                        branchMap.set(branchId, candidate);
                    }
                }
            }
        }

        const nearbyTracks = Array.from(branchMap.entries()).map(([branchId, candidate]) => ({
            id: branchId,
            crossTrackDistanceMetres: candidate.result.crossTrackDistanceMetres,
            side: "unknown" // Phase 2: Directional inference
        })).sort((a, b) => a.crossTrackDistanceMetres - b.crossTrackDistanceMetres);

        return {
            nearbyTracks,
            // PHASE 2 DECISION: Nearest crossing calculation is explicitly deferred.
            // Reasoning: Correct crossing resolution requires parsing node tags (highway=crossing) 
            // and intersecting them with the assembled corridor topology. This complexity introduces
            // risk to the Phase 1 static awareness stability and will be delivered in Phase 2.
            nearestCrossing: null, 
            nearestStation,
            disclaimer: "RailAware provides situational awareness based on public data. It is NOT a substitute for visual confirmation. Always obey local safety signals."
        };
    }
}

function createSpatialAwarenessService({ overpassClient, thresholds }) {
    return new SpatialAwarenessService(overpassClient, thresholds);
}

module.exports = {
    createSpatialAwarenessService
};
