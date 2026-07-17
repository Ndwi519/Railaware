import { haversineMetres } from './haversine.js';

/**
 * Finds the nearest point across all provided corridors based on Haversine distance.
 * 
 * @param {Object} location - The GPS location to search from {lat, lng}
 * @param {Array} corridors - An array of corridor objects containing precomputed topology metadata
 * @returns {Object|null} The nearest corridor, nearest point index, and the minimum distance, or null if no valid corridors provided.
 */
export function findNearestCorridorPoint(location, corridors) {
    if (!corridors || !Array.isArray(corridors) || corridors.length === 0) {
        return null;
    }

    let nearestCorridor = null;
    let minDistance = Infinity;
    let nearestPointIndex = 0;
    
    for (const corridor of corridors) {
        if (!corridor || !corridor.topology || !Array.isArray(corridor.topology.points) || corridor.topology.points.length === 0) {
            continue;
        }

        const points = corridor.topology.points;
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            
            if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
                continue;
            }

            const dist = haversineMetres(location.lat, location.lng, point.lat, point.lng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCorridor = corridor;
                nearestPointIndex = i;
            }
        }
    }

    return nearestCorridor ? {
        nearestCorridor,
        nearestPointIndex,
        minDistance
    } : null;
}
