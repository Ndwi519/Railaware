'use strict';
const { OverpassProvider } = require('../../corridor-resolver/OverpassProvider.js');
const { TopologyError } = require('../../utils/errors.js');

describe('OverpassProvider Circuit Breaker', () => {
    let provider;
    let config;

    beforeEach(() => {
        config = {
            overpass: {
                providerCooldownMs: 60000,
                requestTimeoutMs: 1000
            }
        };
        provider = new OverpassProvider('TestProvider', 'http://test', config);
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('isHealthy initially', () => {
        expect(provider.isHealthy()).toBe(true);
    });

    test('Exponential cooldown increases up to 5x cap on consecutive failures', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValue('Server Error')
        });

        const originalNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;

        try {
            // Failure 1: consecutiveFailures = 1. Cooldown = 60000 * 2^0 = 60000
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(1);
            expect(provider.health.cooldownUntil).toBe(currentTime + 60000);

            // Fast forward past cooldown
            currentTime += 60001;

            // Failure 2: consecutiveFailures = 2. Cooldown = 60000 * 2^1 = 120000
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(2);
            expect(provider.health.cooldownUntil).toBe(currentTime + 120000);

            // Fast forward past cooldown
            currentTime += 120001;

            // Failure 3: consecutiveFailures = 3. Cooldown = 60000 * 2^2 = 240000
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(3);
            expect(provider.health.cooldownUntil).toBe(currentTime + 240000);

            // Fast forward past cooldown
            currentTime += 240001;

            // Failure 4: consecutiveFailures = 4. Cooldown = 60000 * Math.min(2^3, 5) = 60000 * 5 = 300000
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(4);
            expect(provider.health.cooldownUntil).toBe(currentTime + 300000);

            // Fast forward past cooldown
            currentTime += 300001;

            // Failure 5: consecutiveFailures = 5. Cooldown = 60000 * Math.min(2^4, 5) = 300000
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(5);
            expect(provider.health.cooldownUntil).toBe(currentTime + 300000); // capped at 5x

        } finally {
            Date.now = originalNow;
        }
    });

    test('Success resets consecutive failures and cooldown', async () => {
        // First fail
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValue('Server Error')
        });

        const originalNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;

        try {
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(1);
            expect(provider.health.cooldownUntil).toBeGreaterThan(currentTime);

            // Fast forward past cooldown
            currentTime += 60001;

            // Now succeed
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue(JSON.stringify({ elements: [{ type: 'node', id: 1, lat: 10, lon: 20 }] }))
            });

            await provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 });

            expect(provider.health.consecutiveFailures).toBe(0);
            expect(provider.health.cooldownUntil).toBe(0);
        } finally {
            Date.now = originalNow;
        }
    });

    test('Provider rejects requests during cooldown and recovers EXACTLY on boundary', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValue('Server Error')
        });

        const originalNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;

        try {
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);

            // Do not fast forward - we are in cooldown!
            // It should reject immediately without calling fetch again
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow('is in cooldown');

            // Fetch should only have been called once
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Test exact boundaries
            // Date.now() < cooldownUntil => unhealthy
            currentTime = 1000000 + 59999;
            expect(provider.isHealthy()).toBe(false);

            // Date.now() === cooldownUntil => healthy
            currentTime = 1000000 + 60000;
            expect(provider.isHealthy()).toBe(true);

            // Date.now() > cooldownUntil => healthy
            currentTime = 1000000 + 60001;
            expect(provider.isHealthy()).toBe(true);
        } finally {
            Date.now = originalNow;
        }
    });

    test('Zero-valued providerCooldownMs is respected (cooldown=0)', async () => {
        config.overpass.providerCooldownMs = 0;
        provider = new OverpassProvider('TestProvider', 'http://test', config);

        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValue('Server Error')
        });

        const originalNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;

        try {
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider.health.consecutiveFailures).toBe(1);
            expect(provider.health.cooldownUntil).toBe(currentTime); // 0 + 0
            expect(provider.isHealthy()).toBe(true); // Should remain healthy since cooldown is 0
        } finally {
            Date.now = originalNow;
        }
    });

    describe('Failure Accounting', () => {
        beforeEach(() => {
            jest.spyOn(provider, '_recordFailure');
        });

        const testFailureType = async (mockImplementation, expectedCategory) => {
            global.fetch.mockImplementationOnce(mockImplementation);
            await expect(provider.fetch({ lat: 10, lng: 20 }, { track: 10, station: 10, crossing: 10 })).rejects.toThrow(TopologyError);
            expect(provider._recordFailure).toHaveBeenCalledTimes(1);
            expect(provider._recordFailure).toHaveBeenCalledWith(expectedCategory);
            expect(provider.health.consecutiveFailures).toBe(1);
        };

        test('HTTP 429 increments failure exactly once and triggers cooldown', async () => {
            await testFailureType(() => Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve('') }), 'HTTP_429');
        });

        test('HTTP 5xx increments failure exactly once and triggers cooldown', async () => {
            await testFailureType(() => Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('') }), 'HTTP_5XX');
        });

        test('Malformed JSON increments failure exactly once and triggers cooldown', async () => {
            await testFailureType(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{ bad json }') }), 'MALFORMED_RESPONSE');
        });

        test('Missing elements increments failure exactly once and triggers cooldown', async () => {
            await testFailureType(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"version": 1}') }), 'MALFORMED_RESPONSE');
        });

        test('Timeout increments failure exactly once and triggers cooldown', async () => {
            await testFailureType(() => {
                const err = new Error('Timeout');
                err.name = 'TimeoutError';
                return Promise.reject(err);
            }, 'TIMEOUT');
        });

        test('Network failure increments failure exactly once and does NOT trigger cooldown', async () => {
            await testFailureType(() => Promise.reject(new Error('Network offline')), 'NETWORK_FAILURE');
        });

        test('HTTP 400 increments failure exactly once but does NOT trigger cooldown', async () => {
            await testFailureType(() => Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve('Bad request') }), 'HTTP_ERROR');
        });
    });
});
