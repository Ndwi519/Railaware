const { InMemoryCorridorCache } = require('../../application/services/InMemoryCorridorCache.js');

describe('Path 3: Query-Window Topology Continuity', () => {
    it('Should merge previously fetched nodes and ways to prevent dataset churn truncation', () => {
        const cache = new InMemoryCorridorCache();
        const sessionId = 'test-session-tick11';

        // Tick 1: We fetch the complete way and its nodes
        const tick1Fetch = [
            { id: 1, type: 'way', nodes: [100, 101, 102], tags: { railway: 'rail' } },
            { id: 100, type: 'node', lat: 0, lon: 0 },
            { id: 101, type: 'node', lat: 0, lon: 0.01 },
            { id: 102, type: 'node', lat: 0, lon: 0.02 }
        ];

        cache.mergeAndGetElements(sessionId, tick1Fetch);

        // Tick 11: The train moved. The radius query dropped node 100 because it's too far behind.
        // If we didn't cache, the way would truncate!
        const tick11Fetch = [
            { id: 1, type: 'way', nodes: [100, 101, 102], tags: { railway: 'rail' } },
            { id: 101, type: 'node', lat: 0, lon: 0.01 },
            { id: 102, type: 'node', lat: 0, lon: 0.02 },
            { id: 103, type: 'node', lat: 0, lon: 0.03 } // New node ahead of the train
        ];

        const mergedElements = cache.mergeAndGetElements(sessionId, tick11Fetch);

        // Assert that ALL nodes are present, including the one that dropped out of the fetch window
        const nodeIds = mergedElements.filter(e => e.type === 'node').map(e => e.id);
        
        expect(nodeIds).toContain(100);
        expect(nodeIds).toContain(101);
        expect(nodeIds).toContain(102);
        expect(nodeIds).toContain(103);
        
        // Assert that the way is still there
        const way = mergedElements.find(e => e.type === 'way');
        expect(way).toBeDefined();
    });

    it('Should not collide when a node and a way share the same numeric ID', () => {
        const cache = new InMemoryCorridorCache();
        const sessionId = 'test-session-collision';

        // Tick 1: Fetch a way with ID 1
        cache.mergeAndGetElements(sessionId, [
            { id: 1, type: 'way', nodes: [100, 101], tags: { railway: 'rail' } }
        ]);

        // Tick 2: Fetch a node with ID 1
        const mergedElements = cache.mergeAndGetElements(sessionId, [
            { id: 1, type: 'node', lat: 10, lon: 10 }
        ]);

        // Assert that BOTH exist in the merged set and haven't overwritten each other
        const way = mergedElements.find(e => e.type === 'way' && e.id === 1);
        const node = mergedElements.find(e => e.type === 'node' && e.id === 1);

        expect(way).toBeDefined();
        expect(node).toBeDefined();
    });

    it('Should allow seed-hysteresis to survive boundary exits by using merged corridors', () => {
        // This test simulates the exact flow in resolver.js
        const { CorridorResolver } = require('../../corridor-resolver/resolver.js');
        const { corridorCache } = require('../../application/services/InMemoryCorridorCache.js');
        
        const sessionId = 'test-session-seed-survival';
        
        // Mock overpass that simulates a boundary exit
        const mockOverpass = {
            fetchNearbyRailways: async () => {
                // In Tick 11, the original seed way dropped completely from the fetch window!
                return {
                    corridors: [], // Seed way is GONE from raw corridors
                    stations: [],
                    elements: [] // Seed way is GONE from raw elements
                };
            }
        };

        const resolver = new CorridorResolver(mockOverpass);

        // Populate the cache as if Tick 1 happened
        corridorCache.mergeAndGetElements(sessionId, [
            { id: 123, type: 'node', lat: 10.0, lon: 10.0 },
            { id: 124, type: 'node', lat: 10.1, lon: 10.1 },
            { id: 999, type: 'way', nodes: [123, 124], tags: { railway: 'rail' } }
        ]);

        // Attempt resolution at Tick 11 where the seed way is missing from the fetch
        const previousSessionState = {
            sessionId: sessionId,
            referenceWayId: 999, // User is pinned to Way 999
            lastAlongTrack: 50,
            lastCorridorSegmentIndex: 0,
            timestamp: Date.now() - 10000,
            lastSpeed: 0
        };

        const location = { lat: 10.05, lng: 10.05 };

        return resolver.resolveNearest(location, 500, previousSessionState).then(result => {
            // If the bug existed, resolveSeedWay would fail to find Way 999 in `corridors`,
            // lose the hysteresis pin, and fall back to whatever (or null).
            // But because resolver.js now uses `mergedCorridors`, the seed pin survives!
            expect(result).not.toBeNull();
            expect(result.referenceWayId).toBe(999);
        });
    });
});
