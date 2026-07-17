import { jest } from '@jest/globals';
import { 
    shouldReplaceStation, 
    compareStationsAlongTrack, 
    deduplicateStations,
    matchStationsToCorridor
} from '../../corridor-resolver/station-matcher.js';

describe('Station Matcher Pure Pipeline', () => {

    describe('shouldReplaceStation', () => {
        it('prefers ref:IR', () => {
            expect(shouldReplaceStation({ hasRefIR: true }, { hasRefIR: false })).toBe(true);
            expect(shouldReplaceStation({ hasRefIR: false }, { hasRefIR: true })).toBe(false);
        });

        it('prefers name if ref:IR ties', () => {
            expect(shouldReplaceStation({ hasRefIR: true, hasName: true }, { hasRefIR: true, hasName: false })).toBe(true);
            expect(shouldReplaceStation({ hasRefIR: false, hasName: true }, { hasRefIR: false, hasName: false })).toBe(true);
            expect(shouldReplaceStation({ hasRefIR: false, hasName: false }, { hasRefIR: false, hasName: true })).toBe(false);
        });

        it('prefers smallest node ID if name and ref:IR tie', () => {
            expect(shouldReplaceStation({ hasRefIR: true, hasName: true, id: 100 }, { hasRefIR: true, hasName: true, id: 200 })).toBe(true);
            expect(shouldReplaceStation({ hasRefIR: true, hasName: true, id: 300 }, { hasRefIR: true, hasName: true, id: 200 })).toBe(false);
        });
    });

    describe('compareStationsAlongTrack', () => {
        it('orders by alongTrackDistanceMetres', () => {
            expect(compareStationsAlongTrack({ alongTrackDistanceMetres: 100 }, { alongTrackDistanceMetres: 200 })).toBeLessThan(0);
            expect(compareStationsAlongTrack({ alongTrackDistanceMetres: 200 }, { alongTrackDistanceMetres: 100 })).toBeGreaterThan(0);
        });

        it('orders by node ID if distances tie', () => {
            expect(compareStationsAlongTrack({ alongTrackDistanceMetres: 100, id: 50 }, { alongTrackDistanceMetres: 100, id: 100 })).toBeLessThan(0);
            expect(compareStationsAlongTrack({ alongTrackDistanceMetres: 100, id: 150 }, { alongTrackDistanceMetres: 100, id: 100 })).toBeGreaterThan(0);
        });
    });

    describe('deduplicateStations', () => {
        it('deduplicates based on priority rules keeping only the best match per code', () => {
            const raw = [
                { id: 1, hasRefIR: false, feature: { station: { code: 'A' } } },
                { id: 2, hasRefIR: true, feature: { station: { code: 'A' } } }, // Should win for A
                { id: 3, hasRefIR: true, feature: { station: { code: 'B' } } }
            ];
            const deduped = deduplicateStations(raw);
            expect(deduped.length).toBe(2);
            expect(deduped.find(s => s.feature.station.code === 'A').id).toBe(2);
        });
        
        it('preserves unique stations', () => {
            const raw = [
                { id: 1, hasRefIR: true, feature: { station: { code: 'A' } } },
                { id: 2, hasRefIR: true, feature: { station: { code: 'B' } } },
                { id: 3, hasRefIR: true, feature: { station: { code: 'C' } } }
            ];
            const deduped = deduplicateStations(raw);
            expect(deduped.length).toBe(3);
        });
    });

    describe('matchStationsToCorridor pipeline isolation', () => {
        it('returns deterministic results with injected dependency and topology', () => {
            const topology = Object.freeze({
                points: [{ lat: 10, lng: 10 }],
                authoritativeNodeLookup: Object.freeze({ '100': true }),
                nodeDistanceLookup: Object.freeze({ '100': 150 })
            });
            const stations = [
                { id: 100, feature: { station: { code: 'A' } } }, // Authoritative
                { id: 200, feature: { station: { code: 'B' } } }  // Fallback
            ];
            
            const mockProjection = jest.fn();
            mockProjection.mockReturnValue({ crossTrackDistanceMetres: 50, alongTrackDistanceMetres: 200 });

            const results = matchStationsToCorridor({
                topology,
                stations,
                thresholdMetres: 100,
                projectPointOntoCorridor: mockProjection
            });

            expect(mockProjection).toHaveBeenCalledTimes(1); // Only for fallback (200)
            expect(results.length).toBe(2);
            expect(results[0].station.code).toBe('A'); // 150m (authoritative)
            expect(results[1].station.code).toBe('B'); // 200m (fallback)
        });

        it('safely skips authoritative geometry that is missing', () => {
            const topology = Object.freeze({
                points: [{ lat: 10, lng: 10 }],
                authoritativeNodeLookup: Object.freeze({ '100': true, '300': true }),
                nodeDistanceLookup: Object.freeze({ '100': 150 }) // 300 missing from lookup
            });
            const stations = [
                { id: 100, feature: { station: { code: 'A' } } },
                { id: 300, feature: { station: { code: 'C' } } } // Authoritative but missing geometry
            ];
            
            const mockProjection = jest.fn(); // Should never be called for authoritative nodes

            const results = matchStationsToCorridor({
                topology,
                stations,
                thresholdMetres: 100,
                projectPointOntoCorridor: mockProjection
            });

            expect(mockProjection).not.toHaveBeenCalled();
            expect(results.length).toBe(1);
            expect(results[0].station.code).toBe('A');
        });
    });
});
