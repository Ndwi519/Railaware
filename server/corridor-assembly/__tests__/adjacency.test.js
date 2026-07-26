const { assembleSegments } = require('../SegmentAssembler.js');
const { AssembledCorridor } = require('../AssembledCorridor.js');

describe('Stable Corridor Identity & Adjacency', () => {
  it('preserves branch ID stability regardless of coordinate values', () => {
    // Two segments with identical node IDs but we mock one to show coordinate independence
    const segments = [
      {
        coordinates: [{lat: 0, lng: 0}, {lat: 1, lng: 1}],
        startNodeId: 10,
        endNodeId: 20,
        adjacentSegments: []
      }
    ];

    const corridor = new AssembledCorridor(segments, {}, 0);
    expect(corridor.getBranchId(0)).toBe('branch_10_20');
  });

  it('computes correct adjacency for shared junctions (Y-junction)', () => {
    // 0 -> 1
    // 0 -> 2
    const segments = [
      { coordinates: [{lat:0, lng:0}, {lat:1, lng:1}], startNodeId: 10, endNodeId: 20, adjacentSegments: [1, 2] },
      { coordinates: [{lat:1, lng:1}, {lat:2, lng:2}], startNodeId: 20, endNodeId: 30, adjacentSegments: [0] },
      { coordinates: [{lat:1, lng:1}, {lat:2, lng:0}], startNodeId: 20, endNodeId: 40, adjacentSegments: [0] }
    ];

    const corridor = new AssembledCorridor(segments, {}, 2);
    const connected = corridor.getConnectedSegments(0, true);

    expect(connected.length).toBe(2);
    expect(connected.map(c => c.branchId).sort()).toEqual(['branch_20_30', 'branch_20_40']);

    // Check reference coords
    const c1 = connected.find(c => c.branchId === 'branch_20_30');
    expect(c1.isForward).toBe(true);
    expect(c1.referenceCoord).toBeUndefined();
  });

  it('handles reversed geometries cleanly', () => {
    // 0 goes 10->20. 1 goes 30->20 (so it ends at the same node 0 ends at)
    const segments = [
      { coordinates: [{lat:0, lng:0}, {lat:1, lng:1}], startNodeId: 10, endNodeId: 20, adjacentSegments: [1] },
      { coordinates: [{lat:2, lng:2}, {lat:1, lng:1}], startNodeId: 30, endNodeId: 20, adjacentSegments: [0] }
    ];

    const corridor = new AssembledCorridor(segments, {}, 1);
    const connected = corridor.getConnectedSegments(0, true);

    expect(connected.length).toBe(1);
    expect(connected[0].branchId).toBe('branch_30_20');
    expect(connected[0].isForward).toBe(false); // Because we connect to its end node
    expect(connected[0].referenceCoord).toBeUndefined();
  });

  it('handles parallel tracks through the real assembly pipeline', () => {
    // Two physical branches between the exact same nodes
    const connectedComponent = {
      wayIds: new Set([1, 2])
    };
    const ways = new Map([
      [1, { nodeIds: [10, 15, 20] }],
      [2, { nodeIds: [10, 16, 20] }]
    ]);
    const nodeCoords = new Map([
      [10, { lat: 0, lng: 0 }],
      [15, { lat: 0.5, lng: 0.5 }],
      [16, { lat: 0.6, lng: 0.6 }],
      [20, { lat: 1, lng: 1 }]
    ]);
    const branchNodes = new Set([10, 20]);

    const segments = assembleSegments(connectedComponent, ways, nodeCoords, branchNodes);

    // There should be 2 segments, each with 1 adjacent segment (the other one, without duplicates)
    expect(segments.length).toBe(2);
    expect(segments[0].adjacentSegments).toEqual([1]);
    expect(segments[1].adjacentSegments).toEqual([0]);

    const corridor = new AssembledCorridor(segments, {}, 2);
    const connectedAtStart = corridor.getConnectedSegments(0, false);

    expect(connectedAtStart.length).toBe(1);
    expect(connectedAtStart[0].branchId).toBe(corridor.getBranchId(1));
  });

  it('handles duplicate endpoint coordinates properly via Node IDs', () => {
    // Coordinates match, but Node IDs differ. They should NOT be connected.
    const segments = [
      { coordinates: [{lat:0, lng:0}, {lat:1, lng:1}], startNodeId: 10, endNodeId: 20, adjacentSegments: [] },
      { coordinates: [{lat:1, lng:1}, {lat:2, lng:2}], startNodeId: 30, endNodeId: 40, adjacentSegments: [] }
    ];

    const corridor = new AssembledCorridor(segments, {}, 1);
    const connected = corridor.getConnectedSegments(0, true);

    expect(connected.length).toBe(0);
  });

  it('handles loop corridors correctly', () => {
    // A loop where endNodeId == startNodeId
    const segments = [
      { coordinates: [{lat:0, lng:0}, {lat:1, lng:1}, {lat:0, lng:0}], startNodeId: 10, endNodeId: 10, adjacentSegments: [0] }
    ];

    const corridor = new AssembledCorridor(segments, {}, 0);
    const connectedAtStart = corridor.getConnectedSegments(0, false);

    expect(connectedAtStart.length).toBe(1);
    expect(connectedAtStart[0].branchId).toBe('branch_10_10');
  });

  it('Projection outputs remain unchanged (returns raw coordinate arrays)', () => {
    const segments = [
      { coordinates: [{lat: 0, lng: 0}, {lat: 1, lng: 1}], startNodeId: 10, endNodeId: 20, adjacentSegments: [] }
    ];
    const corridor = new AssembledCorridor(segments, {}, 0);
    const traversable = corridor.getTraversableSegments();

    expect(traversable).toEqual([ [{lat: 0, lng: 0}, {lat: 1, lng: 1}] ]);
    // Ensure it's frozen and has no topology data
    expect(Object.isFrozen(traversable)).toBe(true);
    expect(traversable[0].startNodeId).toBeUndefined();
  });
});
