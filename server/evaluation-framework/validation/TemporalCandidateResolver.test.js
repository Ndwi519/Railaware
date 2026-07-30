const { resolveWithTemporalHysteresis } = require('../../projection-adapter/TemporalCandidateResolver.js');
const { DEFAULT_THRESHOLDS } = require('../../config/thresholds.js');

describe('TemporalCandidateResolver', () => {
    // 1. PIN THE TICK 2 CASE AS A NAMED REGRESSION TEST
    it('PINNED REGRESSION (Tick 2 Flapping): Should prefer geometrically slightly-farther candidate if it aligns with prior along-track position', () => {
        // This explicitly replicates the Tick 2 failure where a parallel track branch (Seg 13)
        // was mathematically closer by 0.22m, but topologically 1,800m away.
        const candidates = [
            {
                evaluationOrder: 0,
                result: {
                    crossTrackDistanceMetres: 2.68,
                    alongTrackDistanceMetres: 38.01,
                    segmentIndex: 0
                }
            },
            {
                evaluationOrder: 13,
                result: {
                    crossTrackDistanceMetres: 2.46,
                    alongTrackDistanceMetres: 1862.22,
                    segmentIndex: 13
                }
            }
        ];

        // The train's state from Tick 1
        const previousSessionState = {
            referenceWayId: 34940854,
            lastAlongTrack: 0.00,
            lastCorridorSegmentIndex: 0,
            timestamp: Date.now() - 10000, // 10 seconds ago
            lastSpeed: 0
        };

        const result = resolveWithTemporalHysteresis(candidates, previousSessionState);

        // It must select Seg 0, ignoring Seg 13's marginally better cross-track distance
        expect(result).not.toBeNull();
        expect(result.corridorSegmentIndex).toBe(0);
        expect(result.alongTrackDistanceMetres).toBe(38.01);
    });

    // 4. CONFIRM STATIONARY-USER BEHAVIOR SPECIFICALLY
    it('STATIONARY USER: Should hold the pinned track flawlessly even with zero expected motion when GPS jitters back and forth', () => {
        // The user is standing still at 100m along-track.
        const previousSessionState = {
            referenceWayId: 12345,
            lastAlongTrack: 100.0,
            lastCorridorSegmentIndex: 1,
            timestamp: Date.now() - 30000,
            lastSpeed: 0
        };

        // Tick A: Jitter makes Track A look 2m away, Track B look 4m away
        const candidatesTickA = [
            { evaluationOrder: 1, result: { crossTrackDistanceMetres: 2.0, alongTrackDistanceMetres: 102.0 } }, // Track A
            { evaluationOrder: 2, result: { crossTrackDistanceMetres: 4.0, alongTrackDistanceMetres: 850.0 } }  // Track B
        ];
        const resA = resolveWithTemporalHysteresis(candidatesTickA, previousSessionState);
        expect(resA.corridorSegmentIndex).toBe(1);

        // Tick B (30 seconds later): Jitter bounces perfectly opposite. 
        // Track A is now 4m away, Track B is now 2m away.
        const candidatesTickB = [
            { evaluationOrder: 1, result: { crossTrackDistanceMetres: 4.0, alongTrackDistanceMetres: 97.0 } }, // Track A
            { evaluationOrder: 2, result: { crossTrackDistanceMetres: 2.0, alongTrackDistanceMetres: 845.0 } }  // Track B
        ];
        // We feed back the result from Tick A
        const stateB = { ...previousSessionState, lastAlongTrack: resA.alongTrackDistanceMetres, lastCorridorSegmentIndex: resA.corridorSegmentIndex };
        
        const resB = resolveWithTemporalHysteresis(candidatesTickB, stateB);
        
        // It must STAY on Track A (Seg 1) because 97m is much closer to 102m than 845m is to 102m,
        // and its crossTrack (4.0m) is within the 15m tolerance of the minimum (2.0m).
        expect(resB.corridorSegmentIndex).toBe(1);
        expect(resB.alongTrackDistanceMetres).toBe(97.0);
    });

    it('Should snap to a new branch if the old branch diverges beyond cross-track tolerance', () => {
        const previousSessionState = {
            referenceWayId: 12345,
            lastAlongTrack: 100.0,
            lastCorridorSegmentIndex: 1,
            timestamp: Date.now(),
            lastSpeed: 10
        };

        // Train took a diverging branch. The old branch (Seg 1) is now 25m away (beyond 15m tolerance).
        // The new branch (Seg 2) is 2m away.
        const candidates = [
            { evaluationOrder: 1, result: { crossTrackDistanceMetres: 25.0, alongTrackDistanceMetres: 140.0 } },
            { evaluationOrder: 2, result: { crossTrackDistanceMetres: 2.0, alongTrackDistanceMetres: 50.0 } }
        ];

        const result = resolveWithTemporalHysteresis(candidates, previousSessionState);
        
        // It MUST snap to Seg 2, ignoring the along-track similarity, because Seg 1 fell out of cross-track tolerance
        expect(result.corridorSegmentIndex).toBe(2);
    });
});
