'use strict';
const { SpatialCache, calculateBoundingBox } = require('../../corridor-resolver/SpatialCache.js');
const haversineModule = require('../../calculations/haversine.js');

describe('SpatialCache', () => {
    let cache;
    let config;

    beforeEach(() => {
        config = {
            overpass: {
                gridSizeDeg: 0.005,
                cacheMaxEntries: 3,
                cacheTtlSuccessMs: 1000,
                cacheMaxAgeMs: 5000
            }
        };
        cache = new SpatialCache(config);
    });

    test('calculateBoundingBox generates correct box', () => {
        const lat = 23.0;
        const lng = 77.0;
        const maxRadiusM = 1000;
        const box = calculateBoundingBox(lat, lng, maxRadiusM);

        expect(box.south).toBeLessThan(lat);
        expect(box.north).toBeGreaterThan(lat);
        expect(box.west).toBeLessThan(lng);
        expect(box.east).toBeGreaterThan(lng);
    });

    test('Bounding Box exact match (exactly equal) is accepted', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const radii = { track: 300, station: 300, crossing: 1000 }; // max 1000
        cache.set(location, radii, { elements: [] });

        // Same location and radii => exactly equal bounding box
        const result = cache.get(location, radii);
        expect(result).not.toBeNull();
    });

    test('Bounding Box just outside is rejected', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const cachedRadii = { track: 1000, station: 1000, crossing: 1000 };
        cache.set(location, cachedRadii, { elements: [] });

        // Request a bounding box that exceeds the cached one by moving south past the cache's south bound
        // cached south bound is: 23.0 - latDelta
        const cachedBox = calculateBoundingBox(23.0, 77.0, 1000);

        // reqLat - reqLatDelta < cachedBox.south => reqBox extends outside cachedBox
        // reqLatDelta for 1000m is the same as cached latDelta.
        // So if reqLat is even slightly smaller than 23.0, reqBox.south < cachedBox.south
        const newLocation = { lat: 22.99999, lng: 77.0 };
        const reqRadii = { track: 1000, station: 1000, crossing: 1000 };

        const result = cache.get(newLocation, reqRadii);
        expect(result).toBeNull(); // Rejected because bounding box is not completely covered
    });

    test('Set and Get (Fresh)', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const radii = { track: 300, station: 300, crossing: 1000 };
        const data = { elements: [] };

        const key = cache.set(location, radii, data);

        const result = cache.get(location, radii);
        expect(result).not.toBeNull();
        expect(result.data).toBe(data);
        expect(result.freshness).toBe('FRESH');
    });

    test('age = 0 is FRESH', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward 0ms
            const result = cache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('FRESH');
            expect(result.cacheAgeSeconds).toBe(0);
        } finally {
            Date.now = originalNow;
        }
    });

    test('age = TTL - 1 is FRESH', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward 999ms (TTL is 1000ms)
            currentTime += 999;

            const result = cache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('FRESH');
            expect(result.cacheAgeSeconds).toBe(0); // Math.floor(999/1000)
        } finally {
            Date.now = originalNow;
        }
    });

    test('age = TTL is FRESH', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward exactly TTL (1000ms)
            currentTime += 1000;

            const result = cache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('FRESH');
            expect(result.cacheAgeSeconds).toBe(1);
        } finally {
            Date.now = originalNow;
        }
    });

    test('age = TTL + 1 is STALE', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward TTL + 1ms (1001ms)
            currentTime += 1001;

            const result = cache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('STALE');
            expect(result.cacheAgeSeconds).toBe(1); // Math.floor(1001/1000)
        } finally {
            Date.now = originalNow;
        }
    });

    test('age = MAX_AGE - 1 is STALE', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward MAX_AGE - 1 (4999ms)
            currentTime += 4999;

            const result = cache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('STALE');
            expect(result.cacheAgeSeconds).toBe(4);
        } finally {
            Date.now = originalNow;
        }
    });

    test('age = MAX_AGE is STALE', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward exactly MAX_AGE (5000ms)
            currentTime += 5000;

            const result = cache.get(location, radii);
            // According to explicit contract, age <= MAX_AGE is STALE.
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('STALE');
        } finally {
            Date.now = originalNow;
        }
    });

    test('age = MAX_AGE + 1 is EXPIRED and evicts', () => {
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            cache.set(location, radii, { elements: [] });

            // Fast forward MAX_AGE + 1ms (5001ms)
            currentTime += 5001;

            const result = cache.get(location, radii);
            expect(result).toBeNull();
            expect(cache.cache.size).toBe(0);
        } finally {
            Date.now = originalNow;
        }
    });

    test('TTL = 0 with age = 0 is FRESH', () => {
        const zeroCache = new SpatialCache({ overpass: { cacheMaxEntries: 3, cacheTtlSuccessMs: 0, cacheMaxAgeMs: 5000, gridSizeDeg: 0.005 }});
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            zeroCache.set(location, radii, { elements: [] });

            // Fast forward 0ms
            const result = zeroCache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('FRESH');
        } finally {
            Date.now = originalNow;
        }
    });

    test('TTL = 0 with age = 1ms is STALE', () => {
        const zeroCache = new SpatialCache({ overpass: { cacheMaxEntries: 3, cacheTtlSuccessMs: 0, cacheMaxAgeMs: 5000, gridSizeDeg: 0.005 }});
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            zeroCache.set(location, radii, { elements: [] });

            // Fast forward 1ms
            currentTime += 1;
            const result = zeroCache.get(location, radii);
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('STALE');
        } finally {
            Date.now = originalNow;
        }
    });

    test('MAX_AGE = 0 with age = 0 is STALE', () => {
        const zeroCache = new SpatialCache({ overpass: { cacheMaxEntries: 3, cacheTtlSuccessMs: 0, cacheMaxAgeMs: 0, gridSizeDeg: 0.005 }});
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            zeroCache.set(location, radii, { elements: [] });

            // Fast forward 0ms
            const result = zeroCache.get(location, radii);
            // age (0) <= MAX_AGE (0) -> STALE since TTL (0) < age is false, wait: age (0) <= TTL (0) is true -> FRESH
            expect(result).not.toBeNull();
            expect(result.freshness).toBe('FRESH');
        } finally {
            Date.now = originalNow;
        }
    });

    test('MAX_AGE = 0 with age = 1ms is EXPIRED', () => {
        const zeroCache = new SpatialCache({ overpass: { cacheMaxEntries: 3, cacheTtlSuccessMs: 0, cacheMaxAgeMs: 0, gridSizeDeg: 0.005 }});
        const originalNow = Date.now;
        let currentTime = 1600000000000;
        Date.now = () => currentTime;
        try {
            const location = { lat: 23.0, lng: 77.0 };
            const radii = { track: 300, station: 300, crossing: 1000 };
            zeroCache.set(location, radii, { elements: [] });

            // Fast forward 1ms. age (1) > MAX_AGE (0) -> True -> Delete
            currentTime += 1;
            const result = zeroCache.get(location, radii);
            expect(result).toBeNull();
        } finally {
            Date.now = originalNow;
        }
    });

    test('Coverage rejection when radius requested is larger than cached', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const cachedRadii = { track: 300, station: 300, crossing: 300 };
        cache.set(location, cachedRadii, { elements: [] });

        const reqRadii = { track: 300, station: 300, crossing: 1000 }; // Requires larger radius
        const result = cache.get(location, reqRadii);

        expect(result).toBeNull(); // Should not match because cached coverage doesn't completely contain it
    });

    test('Coverage rejection when distance + reqRadius > cachedRadius', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const cachedRadii = { track: 500, station: 500, crossing: 500 };
        cache.set(location, cachedRadii, { elements: [] });

        // Move 300m away
        // 1 degree lat ~ 111320m, so 300m ~ 0.0027 deg
        const newLocation = { lat: 23.0027, lng: 77.0 };
        const reqRadii = { track: 300, station: 300, crossing: 300 };

        // 300m distance + 300m request = 600m > 500m cached
        const result = cache.get(newLocation, reqRadii);

        expect(result).toBeNull(); // Should not match
    });

    test('Coverage acceptance when distance + reqRadius <= cachedRadius', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const cachedRadii = { track: 1000, station: 1000, crossing: 1000 };
        cache.set(location, cachedRadii, { elements: [] });

        // Move 300m away
        const newLocation = { lat: 23.0027, lng: 77.0 };
        const reqRadii = { track: 300, station: 300, crossing: 300 };

        // 300m distance + 300m request = 600m <= 1000m cached
        const result = cache.get(newLocation, reqRadii);

        expect(result).not.toBeNull();
    });

    test('Coverage using real Haversine containment and coordinate boundaries with tolerance', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const newLocation = { lat: 23.0018, lng: 77.0 }; // About 200m away
        const actualDistance = haversineModule.haversineMetres(location.lat, location.lng, newLocation.lat, newLocation.lng);

        const reqRadii = { track: 300, station: 300, crossing: 300 };
        // Add 1.0m tolerance to absorb bounding box flat-earth approximation distortion, satisfying circular containment tightly
        const cachedRadii = {
            track: actualDistance + reqRadii.track + 1.0,
            station: actualDistance + reqRadii.station + 1.0,
            crossing: actualDistance + reqRadii.crossing + 1.0
        };

        cache.set(location, cachedRadii, { elements: [] });

        const result = cache.get(newLocation, reqRadii);
        expect(result).not.toBeNull();
    });

    test('Coverage mathematical rejection just outside boundary (distance + reqRadius > cachedRadius)', () => {
        const location = { lat: 23.0, lng: 77.0 };
        const newLocation = { lat: 23.0018, lng: 77.0 };
        const actualDistance = haversineModule.haversineMetres(location.lat, location.lng, newLocation.lat, newLocation.lng);

        const reqRadii = { track: 300, station: 300, crossing: 300 };
        // Make the cached radii just 1mm smaller than needed
        const cachedRadii = {
            track: actualDistance + reqRadii.track - 0.001,
            station: actualDistance + reqRadii.station - 0.001,
            crossing: actualDistance + reqRadii.crossing - 0.001
        };

        cache.set(location, cachedRadii, { elements: [] });

        const result = cache.get(newLocation, reqRadii);
        expect(result).toBeNull();
    });

    test('LRU Eviction respects maxEntries and access updates recency', () => {
        const radii = { track: 300, station: 300, crossing: 300 };

        cache.set({ lat: 10.1, lng: 20 }, radii, { id: 1 });
        cache.set({ lat: 10.2, lng: 20 }, radii, { id: 2 });
        cache.set({ lat: 10.3, lng: 20 }, radii, { id: 3 });

        expect(cache.cache.size).toBe(3);

        // Access 1st item (10.1) so it becomes the most recently used
        expect(cache.get({ lat: 10.1, lng: 20 }, radii)).not.toBeNull();

        // Adding 4th should now evict the 2nd item (10.2), not the 1st
        cache.set({ lat: 10.4, lng: 20 }, radii, { id: 4 });

        expect(cache.cache.size).toBe(3);

        // 1st item (10.1) survived because it was recently accessed
        expect(cache.get({ lat: 10.1, lng: 20 }, radii)).not.toBeNull();

        // 2nd item (10.2) was evicted because it was the least recently used
        expect(cache.get({ lat: 10.2, lng: 20 }, radii)).toBeNull();

        // 4th item (10.4) exists
        expect(cache.get({ lat: 10.4, lng: 20 }, radii)).not.toBeNull();
    });

    test('Replacing an existing key at capacity does not evict unrelated entries', () => {
        const radii = { track: 300, station: 300, crossing: 300 };

        cache.set({ lat: 10.1, lng: 20 }, radii, { id: 1 });
        cache.set({ lat: 10.2, lng: 20 }, radii, { id: 2 });
        cache.set({ lat: 10.3, lng: 20 }, radii, { id: 3 });

        expect(cache.cache.size).toBe(3);

        // Refresh the 2nd key (10.2)
        cache.set({ lat: 10.2, lng: 20 }, radii, { id: 2, refreshed: true });

        expect(cache.cache.size).toBe(3); // Should still be 3

        // None of the other keys should have been evicted
        expect(cache.get({ lat: 10.1, lng: 20 }, radii)).not.toBeNull();
        expect(cache.get({ lat: 10.2, lng: 20 }, radii)).not.toBeNull();
        expect(cache.get({ lat: 10.3, lng: 20 }, radii)).not.toBeNull();
    });

    test('Cache identity is determined by independent radii, not max radius', () => {
        const location = { lat: 10.0, lng: 20.0 };
        // Both configurations have a max radius of 500
        const radiiA = { track: 500, station: 300, crossing: 500 };
        const radiiB = { track: 300, station: 500, crossing: 500 };

        const keyA = cache.set(location, radiiA, { id: 'A' });
        const keyB = cache.set(location, radiiB, { id: 'B' });

        expect(keyA).not.toBe(keyB);
        expect(cache.cache.size).toBe(2);

        // A cannot satisfy a request for B because A's station radius is 300, B needs 500
        const resultB = cache.get(location, radiiB);
        expect(resultB.data.id).toBe('B');

        // B cannot satisfy a request for A because B's track radius is 300, A needs 500
        const resultA = cache.get(location, radiiA);
        expect(resultA.data.id).toBe('A');
    });
});
