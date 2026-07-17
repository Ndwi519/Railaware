import { createLogger } from '../utils/index.js';
import { projectPointOntoCorridor, findNearestCorridorPoint, calculateUserSegmentFraction } from '../calculations/index.js';
import { DEFAULT_THRESHOLDS } from '../config/thresholds.js';
import { deepFreeze } from '../utils/deepFreeze.js';
import { ResolutionStatus } from '../domain/types/enums.js';
import { matchStationsToCorridor } from './station-matcher.js';

const log = createLogger('corridor-resolver');

export class CorridorResolver {
    overpass;
    constructor(overpass) {
        this.overpass = overpass;
    }
    
    /**
     * Finds the nearest railway corridor to the given location.
     */
    async resolveNearest(location, radiusMetres) {
        const { corridors, stations } = await this.overpass.fetchNearbyRailways(location, radiusMetres);
        if (corridors.length === 0) {
            log.info('No corridors found near location', { location, radiusMetres });
            return null;
        }

        const nearestInfo = findNearestCorridorPoint(location, corridors);
        if (!nearestInfo || !nearestInfo.nearestCorridor) {
            return null;
        }

        const { nearestCorridor, nearestPointIndex, minDistance } = nearestInfo;
        log.debug('Resolved nearest corridor', { id: nearestCorridor.id, minDistance });

        const { totalLengthMetres, userSegmentFraction } = calculateUserSegmentFraction(
            nearestCorridor.topology, 
            nearestPointIndex
        );

        const stationsOutput = matchStationsToCorridor({
            topology: nearestCorridor.topology,
            stations,
            thresholdMetres: DEFAULT_THRESHOLDS.STATION_CORRIDOR_MATCH_DISTANCE_METRES,
            projectPointOntoCorridor
        });

        const projection = projectPointOntoCorridor(location, nearestCorridor.topology.points);
        const closestPoint = projection
            ? { lat: projection.projectedPoint.lat, lng: projection.projectedPoint.lng }
            : null;

        return deepFreeze({
            corridorGeometry: nearestCorridor.topology.points,
            stations: stationsOutput,
            userSegmentFraction,
            segmentLengthKm: totalLengthMetres / 1000,
            nearestBoundingStations: null,
            resolutionStatus: ResolutionStatus.UNRESOLVED,
            closestPoint
        });
    }
}
