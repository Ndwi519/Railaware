'use strict';
const { SpatialProviderManager } = require('../../corridor-resolver/SpatialProviderManager.js');


describe('SpatialProviderManager', () => {
    let manager;
    let config;

    beforeEach(() => {
        config = {
            overpass: {
                primaryUrl: 'http://primary',
                secondaryUrl: 'http://secondary',
                gridSizeDeg: 0.005,
                cacheTtlSuccessMs: 1000,
                cacheMaxAgeMs: 5000,
                providerCooldownMs: 1000,
                requestTimeoutMs: 1000
            }
        };

        manager = new SpatialProviderManager(config);

        // Mock fetches
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Primary fetch success caches data and returns fresh', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
        });

        const result = await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('http://primary', expect.any(Object));
        expect(result._isCached).toBe(false);
        expect(result._freshness).toBe('live');

        // Cache hit next time
        const result2 = await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result2._isCached).toBe(true);
        expect(result2._freshness).toBe('fresh');
    });

    test('Primary fails, secondary succeeds, caches data', async () => {
        global.fetch
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                text: jest.fn().mockResolvedValueOnce('Rate limit')
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
            });

        const result = await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, 500);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://primary', expect.any(Object));
        expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://secondary', expect.any(Object));
        expect(result._isCached).toBe(false);
        expect(result._freshness).toBe('live');
    });

    test('Both fail, no cache -> throws', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValue('Internal error')
        });

        await expect(manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 })).rejects.toThrow('Failed to retrieve nearby railways. All providers unavailable.');
    });

    test('Both fail, stale cache exists -> returns stale cache', async () => {
        // Mock a successful primary fetch in the past
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
        });

        await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });

        // Fast forward time past TTL but before Max Age
        const originalNow = Date.now;
        try {
            Date.now = () => originalNow() + 2000;

            global.fetch.mockReturnValueOnce(new Promise(resolve => {
                resolve({
                    ok: false,
                    status: 500,
                    text: jest.fn().mockResolvedValueOnce('Fail')
                });
            })).mockReturnValueOnce(new Promise(resolve => {
                resolve({
                    ok: false,
                    status: 500,
                    text: jest.fn().mockResolvedValueOnce('Fail')
                });
            }));

            const result = await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });
            expect(result._isCached).toBe(true);
            expect(result._freshness).toBe('stale');
            expect(result._cacheAgeSeconds).toBeGreaterThanOrEqual(2);
        } finally {
            Date.now = originalNow;
        }
    });

    test('Both fail, EXPIRED cache exists -> throws TopologyError', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
        });

        await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });

        const originalNow = Date.now;
        try {
            // Fast forward time past Max Age (5000ms)
            Date.now = () => originalNow() + 6000;

            global.fetch.mockReturnValueOnce(new Promise(resolve => {
                resolve({
                    ok: false,
                    status: 500,
                    text: jest.fn().mockResolvedValueOnce('Fail')
                });
            })).mockReturnValueOnce(new Promise(resolve => {
                resolve({
                    ok: false,
                    status: 500,
                    text: jest.fn().mockResolvedValueOnce('Fail')
                });
            }));

            await expect(manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 }))
                .rejects.toThrow('Failed to retrieve nearby railways. All providers unavailable.');
        } finally {
            Date.now = originalNow;
        }
    });

    test('Coalesces concurrent identical requests', async () => {
        let resolveFetch;
        global.fetch.mockReturnValueOnce(new Promise(resolve => {
            resolveFetch = () => resolve({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
            });
        }));

        const p1 = manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });
        const p2 = manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        resolveFetch();

        await Promise.all([p1, p2]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('Same grid but different coordinates do not coalesce', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValue(JSON.stringify({ elements: [] }))
        });

        const p1 = manager.fetchNearbyRailways({ lat: 10.0001, lng: 20 }, { track: 500, station: 500, crossing: 500 });
        const p2 = manager.fetchNearbyRailways({ lat: 10.0002, lng: 20 }, { track: 500, station: 500, crossing: 500 });

        await Promise.all([p1, p2]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('Same coordinates but different radii do not coalesce', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValue(JSON.stringify({ elements: [] }))
        });

        const p1 = manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });
        const p2 = manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 300, crossing: 500 });

        await Promise.all([p1, p2]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('Failed in-flight request is removed and subsequent request executes', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValueOnce('Error')
        });

        await expect(manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 })).rejects.toThrow();

        // Second request
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
        });

        // Fast forward past cooldown
        manager.primary.health.cooldownUntil = 0;

        const result = await manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 });
        expect(result._isCached).toBe(false);
    });

    test('Coordinates which normalize to the SAME five-decimal representation coalesce', async () => {
        let resolveFetch;
        global.fetch.mockReturnValueOnce(new Promise(resolve => {
            resolveFetch = () => resolve({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValueOnce(JSON.stringify({ elements: [] }))
            });
        }));

        // 10.123451 and 10.123454 both normalize to 10.12345 (to 5 decimal places)
        const p1 = manager.fetchNearbyRailways({ lat: 10.123451, lng: 20.123451 }, { track: 500, station: 500, crossing: 500 });
        const p2 = manager.fetchNearbyRailways({ lat: 10.123454, lng: 20.123454 }, { track: 500, station: 500, crossing: 500 });

        resolveFetch();
        await Promise.all([p1, p2]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('Coordinates which normalize to DIFFERENT five-decimal representations do not coalesce', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValue(JSON.stringify({ elements: [] }))
        });

        // 10.12345 and 10.12346
        const p1 = manager.fetchNearbyRailways({ lat: 10.12345, lng: 20.12345 }, { track: 500, station: 500, crossing: 500 });
        const p2 = manager.fetchNearbyRailways({ lat: 10.12346, lng: 20.12345 }, { track: 500, station: 500, crossing: 500 });

        await Promise.all([p1, p2]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('Different schema versions do not coalesce', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: jest.fn().mockResolvedValue(JSON.stringify({ elements: [] }))
        });

        const p1 = manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 }, 'v1');
        const p2 = manager.fetchNearbyRailways({ lat: 10, lng: 20 }, { track: 500, station: 500, crossing: 500 }, 'v2');

        await Promise.all([p1, p2]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
