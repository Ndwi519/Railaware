import { findNearestCorridorPoint } from '../../calculations/nearest-corridor.js';

describe('findNearestCorridorPoint', () => {
    const location = { lat: 10, lng: 10 };

    it('returns null for an empty corridor list', () => {
        expect(findNearestCorridorPoint(location, [])).toBeNull();
    });

    it('returns null for invalid inputs', () => {
        expect(findNearestCorridorPoint(location, null)).toBeNull();
        expect(findNearestCorridorPoint(location, undefined)).toBeNull();
        expect(findNearestCorridorPoint(location, 'not-an-array')).toBeNull();
    });

    it('returns the nearest point for a single corridor', () => {
        const corridors = [{
            topology: {
                points: [
                    { lat: 11, lng: 11 }, // far
                    { lat: 10.01, lng: 10.01 }, // near
                    { lat: 12, lng: 12 } // farther
                ]
            }
        }];
        
        const result = findNearestCorridorPoint(location, corridors);
        expect(result).not.toBeNull();
        expect(result.nearestCorridor).toBe(corridors[0]);
        expect(result.nearestPointIndex).toBe(1);
    });

    it('returns the nearest point across multiple corridors', () => {
        const corridors = [
            {
                id: 'C1',
                topology: { points: [{ lat: 11, lng: 11 }, { lat: 10.5, lng: 10.5 }] }
            },
            {
                id: 'C2', // nearest
                topology: { points: [{ lat: 10.01, lng: 10.01 }] }
            }
        ];
        
        const result = findNearestCorridorPoint(location, corridors);
        expect(result.nearestCorridor.id).toBe('C2');
        expect(result.nearestPointIndex).toBe(0);
    });

    it('handles deterministic tie-breaking (first encountered wins)', () => {
        const corridors = [
            {
                id: 'C1',
                topology: { points: [{ lat: 10.01, lng: 10.01 }] }
            },
            {
                id: 'C2',
                topology: { points: [{ lat: 10.01, lng: 10.01 }] } // identical distance
            }
        ];
        
        const result = findNearestCorridorPoint(location, corridors);
        expect(result.nearestCorridor.id).toBe('C1');
        expect(result.nearestPointIndex).toBe(0);
    });

    it('skips malformed topologies safely without crashing', () => {
        const corridors = [
            { id: 'MissingTopology' },
            { id: 'MissingPoints', topology: {} },
            { id: 'PointsNotArray', topology: { points: 'points' } },
            { id: 'EmptyPoints', topology: { points: [] } },
            {
                id: 'Valid',
                topology: { points: [{ lat: 10.01, lng: 10.01 }] }
            }
        ];

        const result = findNearestCorridorPoint(location, corridors);
        expect(result.nearestCorridor.id).toBe('Valid');
    });

    it('skips malformed geometry points without crashing', () => {
        const corridors = [
            {
                id: 'C1',
                topology: {
                    points: [
                        null,
                        undefined,
                        { lat: '10.01', lng: 10.01 }, // string lat
                        { lat: 10.01, lng: '10.01' }, // string lng
                        { lat: 10.01, lng: 10.01 }    // valid
                    ]
                }
            }
        ];

        const result = findNearestCorridorPoint(location, corridors);
        expect(result).not.toBeNull();
        expect(result.nearestPointIndex).toBe(4);
    });

    it('handles a corridor with one point', () => {
        const corridors = [{
            topology: { points: [{ lat: 10.01, lng: 10.01 }] }
        }];
        
        const result = findNearestCorridorPoint(location, corridors);
        expect(result.nearestPointIndex).toBe(0);
    });

    it('returns null if all corridors are malformed', () => {
        const corridors = [
            { id: 'C1' },
            { topology: {} },
            { topology: { points: [] } },
            { topology: { points: [{ lat: 'string', lng: 10 }] } }
        ];
        
        expect(findNearestCorridorPoint(location, corridors)).toBeNull();
    });
});
