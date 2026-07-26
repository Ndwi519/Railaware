const assert = require('assert');
const MovementTraceGenerator = require('./MovementTraceGenerator.js');

// Mock AssembledCorridor to provide segments and topology mapping
class MockAssembledCorridor {
  constructor(segments, branches) {
    this.segments = segments;
    this.branches = branches || {}; // segmentIndex -> branchId mapping
    this.connections = {}; // segmentIndex -> [ connected segments ]
  }

  getTraversableSegments() {
    return this.segments;
  }

  getBranchId(segmentIndex) {
    return this.branches[segmentIndex];
  }

  setConnections(segmentIndex, connectedSegments) {
    this.connections[segmentIndex] = connectedSegments;
  }

  getConnectedSegments(segmentIndex, isForward) {
    return (this.connections[segmentIndex] || []).filter(c => c.isForward === isForward);
  }
}

function runTests() {
  console.log("Running MovementTraceGenerator tests...");

  // Mock segments geometry:
  // Segment 0: 0m to 100m straight north
  // Segment 1: 100m to 200m straight north
  // Segment 2: 100m to 150m straight east (branch)
  const segments = [
    [ { lat: 0, lng: 0 }, { lat: 0.0009, lng: 0 } ], // ~100m north
    [ { lat: 0.0009, lng: 0 }, { lat: 0.0018, lng: 0 } ], // ~100m north
    [ { lat: 0.0009, lng: 0 }, { lat: 0.0009, lng: 0.00045 } ] // ~50m east
  ];

  const corridor = new MockAssembledCorridor(segments, {
    0: 10, // Mainline
    1: 10, // Mainline
    2: 20  // Branch
  });

  corridor.setConnections(0, [
    { segmentIndex: 1, isForward: true },
    { segmentIndex: 2, isForward: true }
  ]);
  corridor.setConnections(1, [
    { segmentIndex: 0, isForward: false }
  ]);
  corridor.setConnections(2, [
    { segmentIndex: 0, isForward: false }
  ]);

  // Test 1: Basic Forward Movement
  const t1 = MovementTraceGenerator.generateTrace({
    assembledCorridor: corridor,
    startSegmentIndex: 0,
    startDistance: 0,
    tickCount: 3,
    speedMetresPerTick: 30, // 30m, 60m, 90m
    isForward: true
  });

  assert.strictEqual(t1.length, 3);
  assert.strictEqual(t1[0].expectedSegmentIndex, 0);
  assert.strictEqual(t1[0].expectedBranchId, 10);
  // Lat should increase
  assert(t1[1].lat > t1[0].lat);
  console.log("  ✓ Basic Forward Movement");

  // Test 2: Transition to Preferred Branch (Mainline)
  const t2 = MovementTraceGenerator.generateTrace({
    assembledCorridor: corridor,
    startSegmentIndex: 0,
    startDistance: 80,
    tickCount: 3, // 80m (Seg0), 110m (Seg1), 140m (Seg1)
    speedMetresPerTick: 30,
    isForward: true,
    preferredBranchId: 10
  });

  assert.strictEqual(t2[0].expectedSegmentIndex, 0);
  assert.strictEqual(t2[1].expectedSegmentIndex, 1);
  assert.strictEqual(t2[1].expectedBranchId, 10);
  console.log("  ✓ Transition to Preferred Branch (Mainline)");

  // Test 3: Transition to Preferred Branch (Branch Line)
  const t3 = MovementTraceGenerator.generateTrace({
    assembledCorridor: corridor,
    startSegmentIndex: 0,
    startDistance: 80,
    tickCount: 3, // 80m (Seg0), 10m on Seg2, 40m on Seg2
    speedMetresPerTick: 30,
    isForward: true,
    preferredBranchId: 20
  });

  assert.strictEqual(t3[0].expectedSegmentIndex, 0);
  assert.strictEqual(t3[1].expectedSegmentIndex, 2);
  assert.strictEqual(t3[1].expectedBranchId, 20);
  console.log("  ✓ Transition to Preferred Branch (Branch Line)");

  // Test 4: Terminal clamp (End of line)
  const t4 = MovementTraceGenerator.generateTrace({
    assembledCorridor: corridor,
    startSegmentIndex: 1,
    startDistance: 80,
    tickCount: 3, // 80m (Seg1), 100m clamped, 100m clamped
    speedMetresPerTick: 30,
    isForward: true
  });

  assert.strictEqual(t4[0].expectedSegmentIndex, 1);
  assert.strictEqual(t4[1].expectedSegmentIndex, 1);
  assert.strictEqual(t4[2].expectedSegmentIndex, 1);
  assert.strictEqual(t4[1].lat, t4[2].lat); // Coordinates locked at terminal
  console.log("  ✓ Terminal clamp (End of line)");

  console.log("All MovementTraceGenerator tests passed.");
}
describe('MovementTraceGenerator', () => {
  it('runs all validation checks successfully', () => {
    runTests();
  });
});
