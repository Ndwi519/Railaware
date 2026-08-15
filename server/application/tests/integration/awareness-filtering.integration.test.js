const { createSpatialAwarenessService } = require('../../services/createSpatialAwarenessService.js');

describe('SpatialAwarenessService - 100m Track Filtering and Discontinuity', () => {
    it('Legitimately drops connected branches if their closest point exceeds 100m, causing visual discontinuity', async () => {
        // Mock overpass client that returns synthetic topology
        const mockOverpassClient = {
            fetchNearbyRailways: async () => {
                return {
                    stations: [],
                    corridors: [],
                    elements: [
                        { id: 1, type: 'node', lat: 0, lon: 0.0001 },
                        { id: 2, type: 'node', lat: 0, lon: 0.0010 },
                        { id: 3, type: 'node', lat: 0, lon: 0.0020 },
                        {
                            id: 101,
                            type: 'way',
                            nodes: [1, 2],
                            tags: { railway: 'rail' }
                        },
                        {
                            id: 102,
                            type: 'way',
                            nodes: [2, 3],
                            tags: { railway: 'rail' }
                        }
                    ]
                };
            }
        };

        const service = createSpatialAwarenessService({
            overpassClient: mockOverpassClient,
            thresholds: {
                DEFAULT_THRESHOLDS: {
                    SPATIAL_AWARENESS_RADIUS_METRES: 300,
                    SPATIAL_AWARENESS_TRACK_LIST_RADIUS_METRES: 100
                }
            }
        });

        // User is at 0, 0
        const result = await service.getNearbyAwareness({ lat: 0, lng: 0 });

        // Both ways were within the 300m topological query (0.0020 is ~222m away)
        // However, way_1's closest point to user is 11m (<= 100m) -> KEPT
        // way_2's closest point to user is 111m (> 100m) -> DROPPED

        expect(result.nearbyTracks.length).toBe(1);
        // Depending on branch ID generation, it might be stringified way ID or branch index.
        // It should definitely include the way that is within 100m.
        expect(result.nearbyTracks[0].crossTrackDistanceMetres).toBeLessThanOrEqual(100);

        // This confirms the filtering algorithm naturally causes connected tracks to appear discontinuous
        // if they are split into separate ways and one way's closest point exceeds the 100m list radius.
    });

    it('Tests station and crossing boundaries accurately', async () => {
        // At equator, 1 degree = 111,319m.
        // 300m / 111319 = 0.002695
        // 1000m / 111319 = 0.008983

        const mockOverpassClient = {
            fetchNearbyRailways: async () => {
                return {
                    stations: [
                        {
                            feature: {
                                lat: 0.002, // ~222m (Inside 300)
                                lng: 0,
                                station: { code: 'ST1', name: 'Station 1' }
                            }
                        },
                        {
                            feature: {
                                lat: 0.004, // ~445m (Outside 300)
                                lng: 0,
                                station: { code: 'ST2', name: 'Station 2' }
                            }
                        }
                    ],
                    corridors: [],
                    elements: [
                        // Crossings are parsed from elements in resolver.js
                        {
                            id: 201, type: 'node', lat: 0.008, lon: 0, // ~890m (Inside 1000)
                            tags: { railway: 'crossing' }
                        },
                        {
                            id: 202, type: 'node', lat: 0.010, lon: 0, // ~1113m (Outside 1000)
                            tags: { railway: 'crossing' }
                        }
                    ]
                };
            }
        };

        const service = createSpatialAwarenessService({
            overpassClient: mockOverpassClient,
            thresholds: {
                DEFAULT_THRESHOLDS: {
                    SPATIAL_AWARENESS_RADIUS_METRES: 300,
                    SPATIAL_AWARENESS_STATION_RADIUS_METRES: 300,
                    SPATIAL_AWARENESS_CROSSING_RADIUS_METRES: 1000,
                    SPATIAL_AWARENESS_TRACK_LIST_RADIUS_METRES: 100
                }
            }
        });

        const result = await service.getNearbyAwareness({ lat: 0, lng: 0 });

        expect(result.nearestStation).toBeDefined();
        expect(result.nearestStation.id).toBe('ST1'); // Discovered ST1, ignored ST2

        expect(result.nearestCrossing).toBeDefined();
        expect(result.nearestCrossing.id).toBe('201'); // Discovered 201, ignored 202
    });

    it('Propagates cache metadata through the awareness pipeline', async () => {
        const mockOverpassClient = {
            fetchNearbyRailways: async () => {
                return {
                    stations: [],
                    corridors: [],
                    elements: [],
                    _isCached: true,
                    _freshness: 'stale',
                    _cacheAgeSeconds: 15
                };
            }
        };

        const service = createSpatialAwarenessService({
            overpassClient: mockOverpassClient,
            thresholds: {
                DEFAULT_THRESHOLDS: {
                    SPATIAL_AWARENESS_RADIUS_METRES: 300,
                }
            }
        });

        const result = await service.getNearbyAwareness({ lat: 0, lng: 0 });

        expect(result._isCached).toBe(true);
        expect(result._freshness).toBe('stale');
        expect(result._cacheAgeSeconds).toBe(15);
    });
});
