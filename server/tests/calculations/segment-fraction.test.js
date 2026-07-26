var _segmentFraction = require("../../calculations/segment-fraction.js");
var _errors = require("../../utils/errors.js");
describe('calculateUserSegmentFraction', () => {
  it('returns 0 for zero-length corridor', () => {
    const topology = {
      totalLengthMetres: 0,
      cumulativeDistances: [0]
    };
    const result = (0, _segmentFraction.calculateUserSegmentFraction)(topology, 0);
    expect(result.totalLengthMetres).toBe(0);
    expect(result.userSegmentFraction).toBe(0);
  });
  it('returns 0 for the first point', () => {
    const topology = {
      totalLengthMetres: 1000,
      cumulativeDistances: [0, 500, 1000]
    };
    const result = (0, _segmentFraction.calculateUserSegmentFraction)(topology, 0);
    expect(result.userSegmentFraction).toBe(0);
  });
  it('returns exact fraction for a middle point', () => {
    const topology = {
      totalLengthMetres: 1000,
      cumulativeDistances: [0, 500, 1000]
    };
    const result = (0, _segmentFraction.calculateUserSegmentFraction)(topology, 1);
    expect(result.userSegmentFraction).toBe(0.5);
  });
  it('returns 1 for the last point', () => {
    const topology = {
      totalLengthMetres: 1000,
      cumulativeDistances: [0, 500, 1000]
    };
    const result = (0, _segmentFraction.calculateUserSegmentFraction)(topology, 2);
    expect(result.userSegmentFraction).toBe(1);
  });
  it('throws TopologyError for an invalid negative index', () => {
    const topology = {
      totalLengthMetres: 1000,
      cumulativeDistances: [0, 500, 1000]
    };
    expect(() => (0, _segmentFraction.calculateUserSegmentFraction)(topology, -1)).toThrow(_errors.TopologyError);
  });
  it('throws TopologyError for an invalid large index', () => {
    const topology = {
      totalLengthMetres: 1000,
      cumulativeDistances: [0, 500, 1000]
    };
    expect(() => (0, _segmentFraction.calculateUserSegmentFraction)(topology, 3)).toThrow(_errors.TopologyError);
  });
  it('throws TopologyError for non-integer index', () => {
    const topology = {
      totalLengthMetres: 1000,
      cumulativeDistances: [0, 500, 1000]
    };
    expect(() => (0, _segmentFraction.calculateUserSegmentFraction)(topology, 1.5)).toThrow(_errors.TopologyError);
  });
});