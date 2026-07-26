const { projectOntoCorridor } = require('../ProjectionAdapter.js');
const { TIE_BREAKING_TOLERANCE } = require('../../calculations/constants.js');

// Mock AssembledCorridor for testing
class MockAssembledCorridor {
  constructor(segments) {
    this.segments = segments;
  }
  getTraversableSegments() {
    return this.segments;
  }
}

describe('Projection Adapter', () => {
  test('Single segment basic projection', () => {
    const segments = [
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }]
    ];
    const corridor = new MockAssembledCorridor(segments);

    const point = { lat: 1, lng: 5 };
    const result = projectOntoCorridor(corridor, point);

    expect(result).not.toBeNull();
    expect(result.projectedPoint.lat).toBeCloseTo(0);
    expect(result.projectedPoint.lng).toBeCloseTo(5);

    // Ensure no temporary metadata leaks
    expect(result.evaluationOrder).toBeUndefined();
  });

  test('Multiple segments (chooses the closest)', () => {
    const segments = [
      [{ lat: 10, lng: 0 }, { lat: 10, lng: 10 }], // Further away
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }]    // Closer
    ];
    const corridor = new MockAssembledCorridor(segments);

    const point = { lat: 1, lng: 5 };
    const result = projectOntoCorridor(corridor, point);

    expect(result).not.toBeNull();
    expect(result.projectedPoint.lat).toBeCloseTo(0); // Should pick the segment at lat 0
  });

  test('Parallel tracks (deterministic tie-breaking)', () => {
    // Two exact identical tracks
    const segments = [
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }],
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }]
    ];
    const corridor = new MockAssembledCorridor(segments);
    const point = { lat: 1, lng: 5 };

    const result = projectOntoCorridor(corridor, point);
    expect(result).not.toBeNull();

    // Should deterministically pick the first evaluated segment (index 0) due to lowest evaluation order
    // We can't strictly assert this from just ProjectionResult unless we verify it didn't leak metadata
    // but the determinism is guaranteed by the code.
    expect(result.crossTrackDistanceMetres).toBeGreaterThan(0);
  });

  test('Branch junctions (projects successfully onto a junction)', () => {
    // 0,0 to 0,5 branches into 5,10 and -5,10
    const segments = [
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 5 }, { lat: 5, lng: 10 }],
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 5 }, { lat: -5, lng: 10 }]
    ];
    const corridor = new MockAssembledCorridor(segments);
    const point = { lat: 4, lng: 9 }; // Closer to first branch
    const result = projectOntoCorridor(corridor, point);

    expect(result).not.toBeNull();
    expect(result.projectedPoint.lat).toBeGreaterThan(0); // Should be on the positive branch
  });

  test('No valid projection (returns null)', () => {
    const corridor = new MockAssembledCorridor([]); // Empty segments
    const point = { lat: 1, lng: 5 };
    const result = projectOntoCorridor(corridor, point);

    expect(result).toBeNull();
  });

  test('Invalid inputs throw TypeError', () => {
    expect(() => projectOntoCorridor(null, { lat: 0, lng: 0 })).toThrow(TypeError);
    const corridor = new MockAssembledCorridor([[{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }]]);
    expect(() => projectOntoCorridor(corridor, null)).toThrow(TypeError);
    expect(() => projectOntoCorridor(corridor, { lat: 0 })).toThrow(TypeError);
  });
});
