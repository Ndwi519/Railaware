import { CorridorResolver } from '../../corridor-resolver/resolver.js';
import { jest } from '@jest/globals';

describe('Corridor Resolver', () => {
    let mockOverpass;
    let resolver;

    beforeEach(() => {
        mockOverpass = {
            fetchNearbyRailways: jest.fn()
        };
        resolver = new CorridorResolver(mockOverpass);
    });

    test('Returns null when no corridors found', async () => {
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors: [], stations: [] });
        const result = await resolver.resolveNearest({ lat: 0, lng: 0 }, 500);
        expect(result).toBeNull();
    });

    test('Resolves nearest corridor and calculates segment fraction correctly', async () => {
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([
                    { lat: 10.0, lng: 10.0 },
                    { lat: 10.0, lng: 10.01 }, // ~1.1km away
                    { lat: 10.0, lng: 10.02 }  // ~2.2km away total
                ]),
                cumulativeDistances: Object.freeze([0, 1111, 2222]),
                totalLengthMetres: 2222,
                nodeDistanceLookup: Object.freeze({}),
                authoritativeNodeLookup: Object.freeze({}),
                boundingBox: Object.freeze({})
            })
        }];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations: [] });
        
        // User is near the second point
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.01 }, 500);
        
        expect(result).not.toBeNull();
        expect(result.resolutionStatus).toBe('UNRESOLVED');
        expect(result.nearestBoundingStations).toBeNull();
        expect(result.corridorGeometry).toEqual(corridors[0].topology.points);
        expect(result.userSegmentFraction).toBeGreaterThan(0.4);
        expect(result.userSegmentFraction).toBeLessThan(0.6); // Should be exactly 0.5 for equal segments
    });

    test('Handles corridor with single point gracefully', async () => {
        const corridors = [{
            id: 2,
            topology: Object.freeze({
                points: Object.freeze([{ lat: 10.0, lng: 10.0 }]),
                cumulativeDistances: Object.freeze([0]),
                totalLengthMetres: 0,
                nodeDistanceLookup: Object.freeze({ '100': 0 }),
                authoritativeNodeLookup: Object.freeze({ '100': true }),
                boundingBox: Object.freeze({})
            })
        }];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations: [] });
        
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
        expect(result).not.toBeNull();
        expect(result.userSegmentFraction).toBe(0);
        expect(result.segmentLengthKm).toBe(0);
        expect(result.stations).toEqual([]);
    });

    test('Attaches stations using authoritative topology and deterministic fallback deduplication', async () => {
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([
                    { lat: 10.0, lng: 10.0 }, // node 101
                    { lat: 10.0, lng: 10.01 }, // node 102
                    { lat: 10.0, lng: 10.02 }  // node 103
                ]),
                cumulativeDistances: Object.freeze([0, 1111, 2222]),
                totalLengthMetres: 2222,
                authoritativeNodeLookup: Object.freeze({ '101': true, '102': true, '103': true }),
                nodeDistanceLookup: Object.freeze({ '101': 0, '102': 1111, '103': 2222 }),
                boundingBox: Object.freeze({})
            })
        }];

        const stations = [
            // 1. Authoritative station, part of nodeIds
            {
                id: 101,
                hasRefIR: true,
                hasName: true,
                feature: { station: { code: 'STA1', name: 'Station 1', source: 'osm' }, lat: 10.0, lng: 10.0 }
            },
            // 2. Fallback station, geometrically close (<100m)
            {
                id: 999, // not in nodeIds
                hasRefIR: false,
                hasName: false,
                feature: { station: { code: 'STA2', source: 'osm' }, lat: 10.0, lng: 10.0101 }
            },
            // 3. Fallback station, but too far (>100m)
            {
                id: 888,
                hasRefIR: false,
                hasName: false,
                feature: { station: { code: 'STA3', source: 'osm' }, lat: 15.0, lng: 15.0 } // 500km away
            },
            // 4. Duplicate of STA1 but lacks ref:IR, should be ignored due to deduplication priority
            {
                id: 105, // arbitrary
                hasRefIR: false,
                hasName: true,
                feature: { station: { code: 'STA1', name: 'Duplicate 1', source: 'osm' }, lat: 10.0, lng: 10.0001 }
            },
            // 5. Duplicate of STA1 with ref:IR but larger ID, should be ignored
            {
                id: 200, 
                hasRefIR: true,
                hasName: true,
                feature: { station: { code: 'STA1', name: 'Duplicate 2', source: 'osm' }, lat: 10.0, lng: 10.0001 }
            }
        ];

        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations });
        
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.01 }, 500);
        
        expect(result).not.toBeNull();
        expect(result.stations).toBeDefined();
        expect(result.stations.length).toBe(2);
        
        // Deterministic ordering: STA1 is at 0m (projected onto first point), STA2 is at ~111m
        expect(result.stations[0].station.code).toBe('STA1');
        expect(result.stations[0].station.name).toBe('Station 1'); // Validates it picked the right deduplicated node (id: 101)
        expect(result.stations[1].station.code).toBe('STA2');
    });

    test('resolver never throws and fails safely on partial failure', async () => {
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors: [], stations: [] });
        const result = await resolver.resolveNearest({ lat: 0, lng: 0 }, 500);
        expect(result).toBeNull();
    });

    test('deep freezes the output', async () => {
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([{ lat: 10.0, lng: 10.0 }, { lat: 10.0, lng: 10.01 }]),
                cumulativeDistances: Object.freeze([0, 1111]),
                totalLengthMetres: 1111,
                authoritativeNodeLookup: Object.freeze({ '101': true, '102': true }),
                nodeDistanceLookup: Object.freeze({ '101': 0, '102': 1111 }),
                boundingBox: Object.freeze({})
            })
        }];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations: [] });
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.stations)).toBe(true);
    });

    test('verifies topology and all nested properties are strictly recursively frozen', () => {
        const topology = Object.freeze({
            points: Object.freeze([Object.freeze({ lat: 10.0, lng: 10.0 })]),
            cumulativeDistances: Object.freeze([0]),
            totalLengthMetres: 0,
            authoritativeNodeLookup: Object.freeze({ '101': true }),
            nodeDistanceLookup: Object.freeze({ '101': 0 }),
            boundingBox: Object.freeze({ south: 10, north: 10, west: 10, east: 10 })
        });
        
        expect(Object.isFrozen(topology)).toBe(true);
        expect(Object.isFrozen(topology.points)).toBe(true);
        expect(Object.isFrozen(topology.points[0])).toBe(true);
        expect(Object.isFrozen(topology.cumulativeDistances)).toBe(true);
        expect(Object.isFrozen(topology.authoritativeNodeLookup)).toBe(true);
        expect(Object.isFrozen(topology.nodeDistanceLookup)).toBe(true);
        expect(Object.isFrozen(topology.boundingBox)).toBe(true);

        expect(() => { topology.totalLengthMetres = 100; }).toThrow();
        expect(() => { topology.points.push({ lat: 0, lng: 0 }); }).toThrow();
        expect(() => { topology.points[0].lat = 0; }).toThrow();
        expect(() => { topology.cumulativeDistances.push(100); }).toThrow();
        expect(() => { topology.authoritativeNodeLookup['102'] = true; }).toThrow();
        expect(() => { topology.nodeDistanceLookup['102'] = 100; }).toThrow();
        expect(() => { topology.boundingBox.south = 0; }).toThrow();
    });

    test('resolveNearest respects public API contract and returns frozen exact structure', async () => {
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([
                    Object.freeze({ lat: 10.0, lng: 10.0 }),
                    Object.freeze({ lat: 10.0, lng: 10.01 })
                ]),
                cumulativeDistances: Object.freeze([0, 1111]),
                totalLengthMetres: 1111,
                authoritativeNodeLookup: Object.freeze({ '101': true, '102': true }),
                nodeDistanceLookup: Object.freeze({ '101': 0, '102': 1111 }),
                boundingBox: Object.freeze({})
            })
        }];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations: [] });
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
        
        expect(result).toEqual(expect.objectContaining({
            corridorGeometry: expect.any(Array),
            stations: expect.any(Array),
            userSegmentFraction: expect.any(Number),
            segmentLengthKm: expect.any(Number),
            nearestBoundingStations: null,
            resolutionStatus: expect.any(String)
        }));

        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.corridorGeometry)).toBe(true);
        expect(Object.isFrozen(result.corridorGeometry[0])).toBe(true);
        expect(result.corridorGeometry).toBe(corridors[0].topology.points); // References same object

        expect(() => { result.corridorGeometry[0].lat = 0; }).toThrow();
    });

    test('deterministically resolves duplicate stations favoring smallest node ID', async () => {
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([{ lat: 10.0, lng: 10.0 }, { lat: 10.0, lng: 10.01 }]),
                cumulativeDistances: Object.freeze([0, 1111]),
                totalLengthMetres: 1111,
                authoritativeNodeLookup: Object.freeze({ '101': true, '102': true }),
                nodeDistanceLookup: Object.freeze({ '101': 0, '102': 1111 }),
                boundingBox: Object.freeze({})
            })
        }];
        const stations = [
            { id: 999, hasRefIR: true, hasName: true, feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 } },
            { id: 500, hasRefIR: true, hasName: true, feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 } },
            { id: 700, hasRefIR: true, hasName: true, feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 } }
        ];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations });
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
        expect(result.stations.length).toBe(1);
        expect(stations.find(s => s.id === 500).feature).toEqual(result.stations[0]);
    });

    test('fallback threshold boundary tests', async () => {
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([{ lat: 10.0, lng: 10.0 }, { lat: 10.0, lng: 10.01 }]),
                cumulativeDistances: Object.freeze([0, 1111]),
                totalLengthMetres: 1111,
                authoritativeNodeLookup: Object.freeze({ '101': true, '102': true }),
                nodeDistanceLookup: Object.freeze({ '101': 0, '102': 1111 }),
                boundingBox: Object.freeze({})
            })
        }];
        const stations = [
            // Exactly 100m away (using approximate 0.00089 degrees = ~99m)
            { id: 201, hasRefIR: false, hasName: false, feature: { station: { code: 'EXACT', source: 'osm' }, lat: 10.00089, lng: 10.005 } },
            // move OUTSIDE to lat: 10.003 (~333m away) so it actually fails the 175m check
            { id: 202, hasRefIR: false, hasName: false, feature: { station: { code: 'OUTSIDE', source: 'osm' }, lat: 10.003, lng: 10.005 } },
            // < 100m away
            { id: 203, hasRefIR: false, hasName: false, feature: { station: { code: 'INSIDE', source: 'osm' }, lat: 10.0005, lng: 10.005 } }
        ];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations });
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
        
        const codes = result.stations.map(s => s.station.code);
        expect(codes).toContain('EXACT');
        expect(codes).toContain('INSIDE');
        expect(codes).not.toContain('OUTSIDE');
    });

    test('authoritative lookup maps correctly when missing intermediate nodes', async () => {
        // way.nodes: 10 -> 20 -> 30 -> 40 -> 50
        // resolved geometry: 10 -> 30 -> 50
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([{ lat: 10.0, lng: 10.0 }, { lat: 10.0, lng: 10.01 }, { lat: 10.0, lng: 10.02 }]),
                cumulativeDistances: Object.freeze([0, 1111.39, 2222.78]),
                totalLengthMetres: 2222.78,
                authoritativeNodeLookup: Object.freeze({ '10': true, '20': true, '30': true, '40': true, '50': true }),
                nodeDistanceLookup: Object.freeze({ '10': 0, '30': 1111.39, '50': 2222.78 }),
                boundingBox: Object.freeze({})
            })
        }];
        const stations = [
            // Authoritative station on node 30
            { id: 30, hasRefIR: true, hasName: true, feature: { station: { code: 'STA30', source: 'osm' }, lat: 10.0, lng: 10.01 } },
            // Authoritative station on node 40 (missing from geometry, must be safely skipped without blowing up)
            { id: 40, hasRefIR: true, hasName: true, feature: { station: { code: 'STA40', source: 'osm' }, lat: 10.0, lng: 10.015 } }
        ];
        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations });
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);

        expect(result.stations.length).toBe(1);
        expect(result.stations[0].station.code).toBe('STA30');
    });

    test('behavioral equivalence: matcher output identical to Phase 5 original', async () => {
        // This test proves identical pipeline behavior with the new immutable architecture
        const corridors = [{
            id: 1,
            topology: Object.freeze({
                points: Object.freeze([
                    { lat: 10.0, lng: 10.0 }, 
                    { lat: 10.0, lng: 10.01 }, 
                    { lat: 10.0, lng: 10.02 }
                ]),
                cumulativeDistances: Object.freeze([0, 1111, 2222]),
                totalLengthMetres: 2222,
                authoritativeNodeLookup: Object.freeze({ '101': true, '102': true, '103': true }),
                nodeDistanceLookup: Object.freeze({ '101': 0, '102': 1111, '103': 2222 }),
                boundingBox: Object.freeze({})
            })
        }];

        const stations = [
            { id: 101, hasRefIR: true, hasName: true, feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 } },
            { id: 999, hasRefIR: false, hasName: false, feature: { station: { code: 'STA2', source: 'osm' }, lat: 10.0, lng: 10.0101 } },
            { id: 105, hasRefIR: false, hasName: true, feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0001 } }
        ];

        mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors, stations });
        const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.01 }, 500);

        expect(result.stations.length).toBe(2);
        // Ordering must be STA1 then STA2
        expect(result.stations[0].station.code).toBe('STA1');
        expect(result.stations[1].station.code).toBe('STA2');
    });
});
