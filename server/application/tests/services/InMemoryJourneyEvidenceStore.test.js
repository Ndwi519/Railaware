const InMemoryJourneyEvidenceStore = require('../../services/InMemoryJourneyEvidenceStore.js');

describe('InMemoryJourneyEvidenceStore', () => {
    let store;
    const TTL_MS = 86400000;

    beforeEach(() => {
        jest.useFakeTimers();
        store = new InMemoryJourneyEvidenceStore(TTL_MS, 600000);
    });

    afterEach(() => {
        store.destroy();
        jest.useRealTimers();
    });

    test('saves and retrieves evidence', () => {
        store.save('session1', '12903', 'NDLS');
        const evidence = store.get('session1');
        expect(evidence).toBeDefined();
        expect(evidence.trainId).toBe('12903');
    });

    test('throws ValidationError if missing required fields on save', () => {
        expect(() => store.save(null, '12903', 'NDLS')).toThrowError('required fields for JourneyEvidence');
        expect(() => store.save('session1', null, 'NDLS')).toThrowError('required fields for JourneyEvidence');
        expect(() => store.save('session1', '12903', null)).toThrowError('required fields for JourneyEvidence');
    });

    test('overwrites existing evidence', () => {
        store.save('session1', '12903', 'NDLS');
        store.save('session1', '12904', 'MMCT');
        const evidence = store.get('session1');
        expect(evidence.trainId).toBe('12904');
    });

    test('expires evidence', () => {
        store.save('session1', '12903', 'NDLS');
        jest.advanceTimersByTime(TTL_MS + 1000);
        expect(store.get('session1')).toBeNull();
    });

    test('clears evidence idempotently', () => {
        store.save('session1', '12903', 'NDLS');
        store.clear('session1');
        store.clear('session1');
        expect(store.get('session1')).toBeNull();
    });

    test('returns defensive copy', () => {
        store.save('session1', '12903', 'NDLS');
        const evidence = store.get('session1');
        evidence.trainId = 'HACKED';
        const fresh = store.get('session1');
        expect(fresh.trainId).toBe('12903');
    });
    test('returns deep copy preventing Date mutation', () => {
        store.save('session1', '12903', 'NDLS');
        const evidence = store.get('session1');
        
        const originalExpiresAt = evidence.expiresAt.getTime();
        const originalConfirmedAt = evidence.confirmedAt.getTime();
        
        evidence.expiresAt.setTime(0);
        evidence.confirmedAt.setTime(0);
        
        const fresh = store.get('session1');
        expect(fresh.expiresAt.getTime()).toBe(originalExpiresAt);
        expect(fresh.confirmedAt.getTime()).toBe(originalConfirmedAt);
    });
});
