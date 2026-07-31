const { CorridorResolver } = require('../../corridor-resolver/resolver.js');
const { evaluateCandidates } = require('../../projection-adapter/CandidateEvaluator.js');
const { DEFAULT_THRESHOLDS } = require('../../config/thresholds.js');
const { matchStationsToCorridor } = require('../../corridor-resolver/station-matcher.js');
const { projectOntoCorridor } = require('../../projection-adapter/ProjectionAdapter.js');
const scheduleCache = require('./ScheduleCorridorCache.js');

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
        const { assembledCorridors, nearestStation, nearestCrossing, stations } = await this.resolver.resolveAllClusters(location, this.radiusMetres);

        if (assembledCorridors.length === 0) {
            return {
                nearbyTracks: [],
                nearestCrossing,
                nearestStation,
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
                        branchMap.set(branchId, { ...candidate, assembledCorridor });
                    }
                }
            }
        }

        const nearbyTracks = Array.from(branchMap.entries()).map(([branchId, candidate]) => {
            const branchPoints = candidate.assembledCorridor.getTraversableSegments()[candidate.evaluationOrder];
            const geometry = branchPoints ? branchPoints.map(p => ({
                lat: p.lat,
                lng: p.lng
            })) : [];

            return {
                id: branchId,
                crossTrackDistanceMetres: candidate.result.crossTrackDistanceMetres,
                side: "unknown", // Phase 2: Directional inference
                geometry,
                assembledCorridor: candidate.assembledCorridor, // internal, used for station matching
                candidate // internal
            };
        }).sort((a, b) => a.crossTrackDistanceMetres - b.crossTrackDistanceMetres);

        if (nearbyTracks.length > 0 && stations && stations.length > 0) {
            const closest = nearbyTracks[0];
            const matched = matchStationsToCorridor({
                assembledCorridor: closest.assembledCorridor,
                stations: stations,
                thresholdMetres: DEFAULT_THRESHOLDS.STATION_CORRIDOR_MATCH_DISTANCE_METRES || 50,
                projectOntoCorridor
            });
            if (matched.length >= 2) {
                // Determine bounding stations for the user's location
                // matchStationsToCorridor returns them sorted along track
                // The candidate contains user projection details
                const userDist = closest.candidate.result.alongTrackDistanceMetres;
                
                let prev = null;
                let next = null;
                for (let i = 0; i < matched.length; i++) {
                    if (matched[i].alongTrackDistanceMetres <= userDist) {
                        prev = matched[i];
                    } else if (!next) {
                        next = matched[i];
                        break;
                    }
                }
                
                if (prev && next) {
                    scheduleCache.set(closest.id, { from: prev.code, to: next.code });
                }
            }
        }

        // Clean up internal fields before returning to client
        const cleanTracks = nearbyTracks.map(t => ({
            id: t.id,
            crossTrackDistanceMetres: t.crossTrackDistanceMetres,
            side: t.side,
            geometry: t.geometry
        }));

        return {
            nearbyTracks: cleanTracks,
            nearestCrossing, 
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
