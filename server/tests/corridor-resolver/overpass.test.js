import { OverpassClient } from '../../corridor-resolver/overpass.js';
import { jest } from '@jest/globals';

describe('OverpassClient Caching', () => {
    let client;
    
    beforeEach(() => {
        client = new OverpassClient({
            gridSizeDeg: 0.005,
            requestTimeoutMs: 1000,
            maxAttempts: 1,
            retryDelaysMs: [0],
            cacheTtlSuccessMs: 60000,
            cacheTtlNoCorridorMs: 60000,
            cacheTtlTransientFailureMs: 60000
        });
        
        // Mock fetch
        global.fetch = jest.fn();
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('cache hit returns exact same payload with corridors and stations', async () => {
        const mockResponse = {
            elements: [
                { type: 'node', id: 1, lat: 10, lon: 20 },
                { type: 'node', id: 4, lat: 10.1, lon: 20 },
                { type: 'node', id: 2, lat: 10.1, lon: 20.1, tags: { railway: 'station', ref: 'ABC' } },
                { type: 'way', id: 3, nodes: [1, 4], tags: { railway: 'rail' } }
            ]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValueOnce(JSON.stringify(mockResponse))
        });

        // First call
        const result1 = await client.fetchNearbyRailways({ lat: 10, lng: 20 }, 500);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result1.corridors.length).toBe(1);
        expect(result1.stations.length).toBe(1);
        expect(result1.stations[0].feature.station.code).toBe('ABC');

        // Second call (cache hit)
        const result2 = await client.fetchNearbyRailways({ lat: 10, lng: 20 }, 500);
        expect(global.fetch).toHaveBeenCalledTimes(1); // Not called again
        expect(result2).toBe(result1); // Exact same object reference!
        expect(result2.corridors.length).toBe(1);
        expect(result2.stations.length).toBe(1);
        expect(result2.stations[0].feature.station.code).toBe('ABC');
        
        // Assert deep frozen
        expect(Object.isFrozen(result2)).toBe(true);
        expect(Object.isFrozen(result2.corridors)).toBe(true);
        expect(Object.isFrozen(result2.stations)).toBe(true);
        
        // Assert mutation throws
        expect(() => { result2.corridors = []; }).toThrow();
        expect(() => { result2.stations.push({}); }).toThrow();
    });

    test('expired cache triggers new fetch', async () => {
        client.config.cacheTtlSuccessMs = -1000; // Instantly expire
        client.config.cacheTtlNoCorridorMs = -1000; // Instantly expire empty responses too

        const mockResponse = { elements: [] };
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        await client.fetchNearbyRailways({ lat: 10, lng: 20 }, 500);
        await client.fetchNearbyRailways({ lat: 10, lng: 20 }, 500);
        
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('cached transient failures throw without network request', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 503,
            text: jest.fn().mockResolvedValueOnce('Service Unavailable')
        });

        await expect(client.fetchNearbyRailways({ lat: 10, lng: 20 }, 500)).rejects.toThrow('Failed to retrieve nearby railways');
        
        // Second call should throw instantly from cache
        await expect(client.fetchNearbyRailways({ lat: 10, lng: 20 }, 500)).rejects.toThrow('Failed to retrieve nearby railways');
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('parser topology invariant regressions', async () => {
        const mockResponse = {
            elements: [
                { type: 'node', id: 100, lat: 10.0, lon: 10.0 },
                { type: 'node', id: 200, lat: 10.0, lon: 10.01 }, // ~1.1km
                { type: 'node', id: 300, lat: 10.0, lon: 10.02 }, // ~1.1km further
                { type: 'node', id: 400, lat: 10.1, lon: 10.1, tags: { railway: 'station', ref: 'STA' } }, // station node
                { type: 'way', id: 1, nodes: [100, 200, 300, 400], tags: { railway: 'rail' } } // 400 is not in nodes array because we mock dropped geometry to see authoritative logic
            ]
        };

        // We simulate that node 400 has geometry but the way drops it, wait, if the way includes 400 it will have geometry. Let's not include 400 in way nodes to simulate missing geometry? Wait, if 400 is in way nodes it has geometry. Let's make way nodes exactly 100, 200, 300
        mockResponse.elements[4].nodes = [100, 200, 300];

        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValueOnce(JSON.stringify(mockResponse))
        });

        const result = await client.fetchNearbyRailways({ lat: 10, lng: 10 }, 500);
        
        expect(result.corridors.length).toBe(1);
        const topology = result.corridors[0].topology;
        
        // Invariant 1: points.length === cumulativeDistances.length
        expect(topology.points.length).toBe(topology.cumulativeDistances.length);
        expect(topology.points.length).toBe(3);

        // Invariant 2: Object.keys(nodeDistanceLookup).length === points.length
        const distanceKeys = Object.keys(topology.nodeDistanceLookup);
        expect(distanceKeys.length).toBe(topology.points.length);

        // Invariant 3: Object.keys(nodeDistanceLookup).every(key => authoritativeNodeLookup[key] === true)
        distanceKeys.forEach(key => {
            expect(topology.authoritativeNodeLookup[key]).toBe(true);
        });

        // Invariant 4: cumulativeDistances[0] === 0
        expect(topology.cumulativeDistances[0]).toBe(0);

        // Invariant 5: cumulativeDistances is monotonically increasing
        for (let i = 1; i < topology.cumulativeDistances.length; i++) {
            expect(topology.cumulativeDistances[i]).toBeGreaterThanOrEqual(topology.cumulativeDistances[i - 1]);
        }

        // Invariant 6: totalLengthMetres === cumulativeDistances[cumulativeDistances.length - 1]
        expect(topology.totalLengthMetres).toBe(topology.cumulativeDistances[topology.cumulativeDistances.length - 1]);
    });
});
