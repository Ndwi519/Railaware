const { RouteContextBuilder } = require('../RouteContextBuilder.js');
const { BranchDecision, BranchStatus } = require('../BranchDecision.js');
const { TravelDirection } = require('../TravelDirection.js');

describe('RouteContextBuilder', () => {
  let builder;
  beforeEach(() => {
    builder = new RouteContextBuilder();
  });

  const createMockCorridor = (segments) => ({
    getTraversableSegments: () => segments,
    getSegmentIndex: (id) => parseInt(id, 10),
    getConnectedSegments: (index, isEnd) => {
      // Mock connectivity: 0 -> 1 -> 2
      if (index === 0 && isEnd) return [{ segmentIndex: 1, branchId: "1" }];
      if (index === 1 && !isEnd) return [{ segmentIndex: 0, branchId: "0" }];
      if (index === 1 && isEnd) return [{ segmentIndex: 2, branchId: "2" }];
      if (index === 2 && !isEnd) return [{ segmentIndex: 1, branchId: "1" }];
      return [];
    }
  });

  const segments = [
    [{lat: 0, lng: 0}, {lat: 1, lng: 0}], // Segment 0
    [{lat: 1, lng: 0}, {lat: 2, lng: 0}], // Segment 1
    [{lat: 2, lng: 0}, {lat: 3, lng: 0}]  // Segment 2
  ];

  it('throws if BranchDecision is not SELECTED', () => {
    const decision = new BranchDecision({ status: BranchStatus.AMBIGUOUS, ambiguityReason: 'foo', travelDirection: TravelDirection.UNKNOWN });
    expect(() => builder.buildContext(decision, createMockCorridor(segments), 0, 50, [])).toThrow();
  });

  describe('FORWARD routing', () => {
    it('determines previous and next station on the same segment (FORWARD)', () => {
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 1, travelDirection: TravelDirection.FORWARD });
      const stations = [
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 10, name: 'Prev' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 100, name: 'Next' }
      ];

      const context = builder.buildContext(decision, createMockCorridor(segments), 1, 50, stations);
      expect(context.branchId).toBe("1");
      expect(context.previousStation.name).toBe('Prev');
      expect(context.nextStation.name).toBe('Next');
    });

    it('traverses backwards to find previous station when entering new branch (FORWARD)', () => {
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 1, travelDirection: TravelDirection.FORWARD });
      const stations = [
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 90, name: 'PrevOnSeg0' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 10, name: 'NextOnSeg1' }
      ];

      // User is on segment 0 at distance 100
      const context = builder.buildContext(decision, createMockCorridor(segments), 0, 100, stations);
      expect(context.branchId).toBe("1");
      expect(context.previousStation.name).toBe('PrevOnSeg0');
      expect(context.nextStation.name).toBe('NextOnSeg1');
    });
  });

  describe('BACKWARD routing', () => {
    it('determines previous and next station on the same segment (BACKWARD)', () => {
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 1, travelDirection: TravelDirection.BACKWARD });
      const stations = [
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 10, name: 'Next' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 100, name: 'Prev' }
      ];

      // User is at distance 50.
      // BACKWARD movement -> next station should be the one behind us (distance 10)
      // and prev station is the one we already passed (distance 100)
      const context = builder.buildContext(decision, createMockCorridor(segments), 1, 50, stations);
      expect(context.branchId).toBe("1");
      expect(context.previousStation.name).toBe('Prev');
      expect(context.nextStation.name).toBe('Next');
    });

    it('cross-segment BACKWARD traversal', () => {
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 0, travelDirection: TravelDirection.BACKWARD });
      const stations = [
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 90, name: 'NextOnSeg0' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 10, name: 'PrevOnSeg1' }
      ];

      // User is on segment 1 at distance 0, moving backwards into segment 0.
      const context = builder.buildContext(decision, createMockCorridor(segments), 1, 0, stations);
      expect(context.branchId).toBe("0");

      // Moving BACKWARD:
      // The station we just passed (previous) is on segment 1 (dist 10).
      // The station we are approaching (next) is on segment 0 (dist 90).
      expect(context.previousStation.name).toBe('PrevOnSeg1');
      expect(context.nextStation.name).toBe('NextOnSeg0');
    });

    it('terminal BACKWARD branch', () => {
      // User is on segment 0 (start of corridor), moving BACKWARD. There are no segments before it.
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 0, travelDirection: TravelDirection.BACKWARD });
      const stations = [
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 90, name: 'Prev' }
      ];

      // User is on segment 0 at distance 50.
      const context = builder.buildContext(decision, createMockCorridor(segments), 0, 50, stations);
      expect(context.branchId).toBe("0");
      expect(context.previousStation.name).toBe('Prev'); // at dist 90 (we came from there)
      expect(context.nextStation).toBeNull(); // no station behind us, and no connected segment
    });

    it('BACKWARD traversal with multiple stations on same segment', () => {
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 1, travelDirection: TravelDirection.BACKWARD });
      const stations = [
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 10, name: 'Station1' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 20, name: 'Station2' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 30, name: 'Station3' },
        { corridorSegmentIndex: 1, alongTrackDistanceMetres: 40, name: 'Station4' }
      ];

      // User is at distance 25, moving backward.
      // We already passed Station4 (40) and Station3 (30). The most recently passed is Station3.
      // We are approaching Station2 (20) and Station1 (10). The next one is Station2.
      const context = builder.buildContext(decision, createMockCorridor(segments), 1, 25, stations);
      expect(context.previousStation.name).toBe('Station3');
      expect(context.nextStation.name).toBe('Station2');
    });
  });

  describe('RouteContext Symmetry', () => {
    it('behaves as exact mirrors for FORWARD and BACKWARD', () => {
      // Setup identical stations
      const stations = [
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 10, name: 'A' },
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 50, name: 'B' },
        { corridorSegmentIndex: 0, alongTrackDistanceMetres: 90, name: 'C' }
      ];

      // FORWARD from distance 30 (between A and B)
      const decisionFwd = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 0, travelDirection: TravelDirection.FORWARD });
      const contextFwd = builder.buildContext(decisionFwd, createMockCorridor(segments), 0, 30, stations);

      expect(contextFwd.previousStation.name).toBe('A');
      expect(contextFwd.nextStation.name).toBe('B');

      // BACKWARD from distance 70 (between B and C)
      const decisionBwd = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 0, travelDirection: TravelDirection.BACKWARD });
      const contextBwd = builder.buildContext(decisionBwd, createMockCorridor(segments), 0, 70, stations);

      expect(contextBwd.previousStation.name).toBe('C');
      expect(contextBwd.nextStation.name).toBe('B');
    });
  });

  describe('Architectural Boundary (Defect-004 Regression)', () => {
    it('verifies public API stations do not leak routing metadata while RouteContextBuilder still consumes them', () => {
      const { createResponse } = require('../../corridor-resolver/ResolverResponseFactory.js');

      const enrichedStations = [
        {
          station: { code: 'A', source: 'osm', name: 'Station A' },
          lat: 10,
          lng: 10,
          distance: 5, // Cross-track distance
          corridorSegmentIndex: 0,
          alongTrackDistanceMetres: 10,
          segmentIndex: 0
        },
        {
          station: { code: 'B', source: 'osm', name: 'Station B' },
          lat: 20,
          lng: 20,
          distance: 2, // Cross-track distance
          corridorSegmentIndex: 0,
          alongTrackDistanceMetres: 50,
          segmentIndex: 0
        }
      ];

      // 1. Internal Pipeline Boundary: RouteContextBuilder consumes enriched stations
      const decision = new BranchDecision({ status: BranchStatus.SELECTED, selectedBranchId: 0, travelDirection: TravelDirection.FORWARD });
      const context = builder.buildContext(decision, createMockCorridor(segments), 0, 25, enrichedStations);

      // Verification: RouteContextBuilder successfully used the metadata to find the bounding stations
      expect(context.previousStation.station.name).toBe('Station A');
      expect(context.nextStation.station.name).toBe('Station B');

      // 2. Public API Boundary: ResolverResponseFactory strips metadata
      const mockProjection = { projectedPoint: { lat: 15, lng: 15 } };
      const response = createResponse(mockProjection, enrichedStations);

      // Verification: Public stations array preserves core identity but leaks no metadata
      expect(response.stations.length).toBe(2);

      const publicA = response.stations[0];
      expect(publicA.station.code).toBe('A');
      expect(publicA.lat).toBe(10);
      expect(publicA.distance).toBe(5);

      // CRITICAL: Ensure routing metadata is stripped
      expect(publicA.corridorSegmentIndex).toBeUndefined();
      expect(publicA.alongTrackDistanceMetres).toBeUndefined();
      expect(publicA.segmentIndex).toBeUndefined();
    });
  });
});
