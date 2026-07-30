const StationResolver = require('../../services/StationResolver.js');

describe('StationResolver', () => {
    let resolver;

    beforeEach(() => {
        resolver = new StationResolver();
    });

    test('resolve(validCode) returns null to formalize repository gap', async () => {
        const result = await resolver.resolve('NDLS');
        expect(result).toBeNull();
    });

    test('resolve(null) returns null', async () => {
        const result = await resolver.resolve(null);
        expect(result).toBeNull();
    });

    test('resolve(undefined) returns null', async () => {
        const result = await resolver.resolve(undefined);
        expect(result).toBeNull();
    });

    test('resolve("") returns null', async () => {
        const result = await resolver.resolve('');
        expect(result).toBeNull();
    });
});
