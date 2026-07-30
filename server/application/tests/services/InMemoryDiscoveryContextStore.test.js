const InMemoryDiscoveryContextStore = require('../../services/InMemoryDiscoveryContextStore.js');

describe('InMemoryDiscoveryContextStore', () => {
    let store;
    const TTL_MS = 60000;

    beforeEach(() => {
        jest.useFakeTimers();
        store = new InMemoryDiscoveryContextStore(TTL_MS, 10000);
    });

    afterEach(() => {
        store.destroy();
        jest.useRealTimers();
    });

    test('creates context when none exists', () => {
        const id = store.evaluateAndStore('session1', 'NDLS', ['123']);
        expect(id).toBeDefined();
    });

    test('reuses identical context', () => {
        const first = store.evaluateAndStore('session1', 'NDLS', ['123', '456']);
        jest.advanceTimersByTime(10000);
        const second = store.evaluateAndStore('session1', 'NDLS', ['456', '123']);
        expect(second).toBe(first);
    });

    test('supersedes on material change (station)', () => {
        const first = store.evaluateAndStore('session1', 'NDLS', ['123']);
        const second = store.evaluateAndStore('session1', 'MMCT', ['123']);
        expect(second).not.toBe(first);
        expect(store.consume('session1', first, '123')).toBeNull();
    });

    test('consumes exactly once', () => {
        const id = store.evaluateAndStore('session1', 'NDLS', ['123']);
        expect(store.consume('session1', id, '123')).toBe('NDLS');
        expect(store.consume('session1', id, '123')).toBeNull();
    });

    test('expires context', () => {
        const id = store.evaluateAndStore('session1', 'NDLS', ['123']);
        jest.advanceTimersByTime(TTL_MS + 1000);
        expect(store.consume('session1', id, '123')).toBeNull();
    });

    test('invalidate prevents subsequent consumption', () => {
        const id = store.evaluateAndStore('session1', 'NDLS', ['123']);
        store.invalidate('session1');
        expect(store.consume('session1', id, '123')).toBeNull();
    });

    test('wrong discoveryContextId does not evict valid context', () => {
        const id = store.evaluateAndStore('session1', 'NDLS', ['123']);
        
        // Attempt consume with wrong context ID
        expect(store.consume('session1', 'wrong-id', '123')).toBeNull();
        
        // Valid context should still be consumable
        expect(store.consume('session1', id, '123')).toBe('NDLS');
    });
});
