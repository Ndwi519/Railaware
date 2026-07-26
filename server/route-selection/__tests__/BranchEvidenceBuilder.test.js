const { BranchEvidenceBuilder } = require('../BranchEvidenceBuilder.js');
const { MovementState } = require('../../directional-inference/MovementState.js');
const { TravelDirection } = require('../TravelDirection.js');

describe('BranchEvidenceBuilder', () => {
  let builder;
  beforeEach(() => {
    builder = new BranchEvidenceBuilder();
  });

  const createMockCorridor = (segments, connectedSegmentsFn) => ({
    getTraversableSegments: () => segments,
    getBranchId: (i) => String(i),
    getConnectedSegments: connectedSegmentsFn || (() => [])
  });

  it('handles UNKNOWN movement state by returning empty branches', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 0 },
      { movementState: MovementState.UNKNOWN },
      createMockCorridor([ [{lat:0, lng:0}, {lat:1, lng:1}] ])
    );
    expect(evidence.downstreamBranches).toEqual([]);
    expect(evidence.travelDirection).toBe(TravelDirection.UNKNOWN);
  });

  it('handles STATIONARY movement state', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 0 },
      { movementState: MovementState.STATIONARY },
      createMockCorridor([ [{lat:0, lng:0}, {lat:1, lng:1}] ])
    );
    expect(evidence.downstreamBranches).toEqual([]);
    expect(evidence.travelDirection).toBe(TravelDirection.STATIONARY);
  });

  describe('Segment Transitions', () => {
    it('returns UNKNOWN travelDirection if crossing segments', () => {
      const evidence = builder.buildEvidence(
        { corridorSegmentIndex: 1 }, // Currently on segment 1
        { movementState: MovementState.MOVING, headingDegrees: 45 },
        createMockCorridor([ [{lat:0, lng:0}, {lat:1, lng:1}], [{lat:1, lng:1}, {lat:2, lng:2}] ]),
        { lastProjectedSegmentIndex: 0 } // Previously on segment 0
      );
      expect(evidence.travelDirection).toBe(TravelDirection.UNKNOWN);
    });
  });

  describe('Direction Classification (Divergence)', () => {
    const runDivergenceTest = (heading, expectedDirection) => {
      // Segment bearing is 90 degrees (lat:0,lng:0 -> lat:0,lng:1)
      const evidence = builder.buildEvidence(
        { corridorSegmentIndex: 0 },
        { movementState: MovementState.MOVING, headingDegrees: heading },
        createMockCorridor([ [{lat: 0, lng: 0}, {lat: 0, lng: 1}] ]), // 90 deg bearing
        { lastProjectedSegmentIndex: 0 }
      );
      return evidence.travelDirection;
    };

    it('20° divergence -> FORWARD', () => {
      expect(runDivergenceTest(90 + 20, TravelDirection.FORWARD)).toBe(TravelDirection.FORWARD);
    });

    it('60° divergence -> FORWARD', () => {
      expect(runDivergenceTest(90 + 60, TravelDirection.FORWARD)).toBe(TravelDirection.FORWARD);
    });

    it('89° divergence -> FORWARD', () => {
      expect(runDivergenceTest(90 + 89, TravelDirection.FORWARD)).toBe(TravelDirection.FORWARD);
    });

    it('90° divergence -> BACKWARD', () => {
      expect(runDivergenceTest(90 + 90, TravelDirection.BACKWARD)).toBe(TravelDirection.BACKWARD);
    });

    it('120° divergence -> BACKWARD', () => {
      expect(runDivergenceTest(90 + 120, TravelDirection.BACKWARD)).toBe(TravelDirection.BACKWARD);
    });

    it('170° divergence -> BACKWARD', () => {
      expect(runDivergenceTest(90 + 170, TravelDirection.BACKWARD)).toBe(TravelDirection.BACKWARD);
    });
  });

  it('detects a terminal branch (FORWARD)', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 0 },
      { movementState: MovementState.MOVING, headingDegrees: 45 },
      createMockCorridor(
        [ [{lat: 0, lng: 0}, {lat: 1, lng: 1}] ], // 45 deg bearing -> FORWARD
        () => []
      )
    );
    expect(evidence.travelDirection).toBe(TravelDirection.FORWARD);
    expect(evidence.downstreamBranches.length).toBe(1);
    expect(evidence.downstreamBranches[0].isTerminal).toBe(true);
    expect(evidence.downstreamBranches[0].branchId).toBe("0");
  });

  it('detects a single continuous branch (FORWARD)', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 0 },
      { movementState: MovementState.MOVING, headingDegrees: 45 },
      createMockCorridor(
        [ [{lat: 0, lng: 0}, {lat: 1, lng: 1}], [{lat: 1, lng: 1}, {lat: 2, lng: 2}] ],
        (index, isEnd) => index === 0 && isEnd ? [
          { segmentIndex: 1, branchId: "1", isForward: true }
        ] : []
      )
    );
    expect(evidence.travelDirection).toBe(TravelDirection.FORWARD);
    expect(evidence.downstreamBranches.length).toBe(1);
    expect(evidence.downstreamBranches[0].isTerminal).toBe(false);
    expect(evidence.downstreamBranches[0].branchId).toBe("1");
  });

  it('detects multiple downstream branches (FORWARD junction)', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 0 },
      { movementState: MovementState.MOVING, headingDegrees: 90 },
      createMockCorridor(
        [
          [{lat: 0, lng: 0}, {lat: 0, lng: 1}], // Segment 0 (90 deg)
          [{lat: 0, lng: 1}, {lat: 0, lng: 2}], // Segment 1 (90 deg)
          [{lat: 0, lng: 1}, {lat: -1, lng: 1}]  // Segment 2 (180 deg)
        ],
        (index, isEnd) => index === 0 && isEnd ? [
          { segmentIndex: 1, branchId: "1", isForward: true },
          { segmentIndex: 2, branchId: "2", isForward: true }
        ] : []
      )
    );
    expect(evidence.travelDirection).toBe(TravelDirection.FORWARD);
    expect(evidence.downstreamBranches.length).toBe(2);
    expect(evidence.downstreamBranches[0].branchId).toBe("1");
    expect(evidence.downstreamBranches[1].branchId).toBe("2");
  });

  it('detects backward continuous branch (BACKWARD)', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 1 },
      { movementState: MovementState.MOVING, headingDegrees: 225 }, // 45 deg reverse
      createMockCorridor(
        [ [{lat: 0, lng: 0}, {lat: 1, lng: 1}], [{lat: 1, lng: 1}, {lat: 2, lng: 2}] ],
        (index, isEnd) => index === 1 && !isEnd ? [
          { segmentIndex: 0, branchId: "0", isForward: false }
        ] : []
      )
    );
    expect(evidence.travelDirection).toBe(TravelDirection.BACKWARD);
    expect(evidence.downstreamBranches.length).toBe(1);
    expect(evidence.downstreamBranches[0].isTerminal).toBe(false);
    expect(evidence.downstreamBranches[0].branchId).toBe("0");
  });

  it('detects a terminal branch (BACKWARD)', () => {
    const evidence = builder.buildEvidence(
      { corridorSegmentIndex: 0 },
      { movementState: MovementState.MOVING, headingDegrees: 225 }, // 45 deg reverse -> BACKWARD
      createMockCorridor(
        [ [{lat: 0, lng: 0}, {lat: 1, lng: 1}] ], // 45 deg bearing
        () => []
      )
    );
    expect(evidence.travelDirection).toBe(TravelDirection.BACKWARD);
    expect(evidence.downstreamBranches.length).toBe(1);
    expect(evidence.downstreamBranches[0].isTerminal).toBe(true);
    expect(evidence.downstreamBranches[0].branchId).toBe("0");
  });
});
