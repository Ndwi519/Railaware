var _stationSelection = require("../../calculations/station-selection.js");
describe('selectBoundingStations', () => {
  const index = [{
    station: {
      code: 'A'
    },
    alongTrackDistanceMetres: 100
  }, {
    station: {
      code: 'B'
    },
    alongTrackDistanceMetres: 200
  }, {
    station: {
      code: 'C'
    },
    alongTrackDistanceMetres: 300
  }];
  it('returns null if projection is missing or malformed', () => {
    expect((0, _stationSelection.selectBoundingStations)(null, index)).toBeNull();
    expect((0, _stationSelection.selectBoundingStations)({}, index)).toBeNull();
  });
  it('returns null if station index has fewer than two stations', () => {
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, null)).toBeNull();
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, [])).toBeNull();
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, [{
      station: {
        code: 'A'
      },
      alongTrackDistanceMetres: 100
    }])).toBeNull();
  });
  it('returns null if any station index entry is malformed', () => {
    // Missing station
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, [{
      alongTrackDistanceMetres: 100
    }, {
      station: {
        code: 'B'
      },
      alongTrackDistanceMetres: 200
    }])).toBeNull();

    // Missing alongTrackDistanceMetres
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, [{
      station: {
        code: 'A'
      }
    }, {
      station: {
        code: 'B'
      },
      alongTrackDistanceMetres: 200
    }])).toBeNull();

    // Null entry
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, [{
      station: {
        code: 'A'
      },
      alongTrackDistanceMetres: 100
    }, null, {
      station: {
        code: 'B'
      },
      alongTrackDistanceMetres: 200
    }])).toBeNull();
  });
  it('returns null if station index is not monotonically sorted', () => {
    const unsortedIndex = [{
      station: {
        code: 'A'
      },
      alongTrackDistanceMetres: 200
    }, {
      station: {
        code: 'B'
      },
      alongTrackDistanceMetres: 100
    }];
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, unsortedIndex)).toBeNull();
  });
  it('handles duplicate alongTrackDistance values deterministically', () => {
    const duplicateIndex = [{
      station: {
        code: 'A'
      },
      alongTrackDistanceMetres: 100
    }, {
      station: {
        code: 'B'
      },
      alongTrackDistanceMetres: 100
    }, {
      station: {
        code: 'C'
      },
      alongTrackDistanceMetres: 300
    }];

    // Projection at 100:
    // It scans: 100 <= 100 (prev = 0), 100 <= 100 (prev = 1), 300 > 100 (break)
    // So prev is B (index 1), next is C (index 2).
    const result = (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 100
    }, duplicateIndex);
    expect(result).not.toBeNull();
    expect(result.previousStation.station.code).toBe('B');
    expect(result.nextStation.station.code).toBe('C');
    expect(result.previousIndex).toBe(1);
    expect(result.nextIndex).toBe(2);
  });
  it('returns null if projection is before the first station', () => {
    // Exactly at 50, first station is at 100
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 50
    }, index)).toBeNull();
  });
  it('returns null if projection is after the final station', () => {
    // Exactly at 350, last station is at 300
    expect((0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 350
    }, index)).toBeNull();
  });
  it('returns bounding stations exactly on the first station', () => {
    const result = (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 100
    }, index);
    expect(result).not.toBeNull();
    expect(result.previousStation.station.code).toBe('A');
    expect(result.nextStation.station.code).toBe('B');
    expect(result.previousIndex).toBe(0);
    expect(result.nextIndex).toBe(1);
  });
  it('returns bounding stations exactly on a middle station', () => {
    const result = (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 200
    }, index);
    expect(result).not.toBeNull();
    expect(result.previousStation.station.code).toBe('B');
    expect(result.nextStation.station.code).toBe('C');
    expect(result.previousIndex).toBe(1);
    expect(result.nextIndex).toBe(2);
  });
  it('returns bounding stations exactly between two stations', () => {
    const result = (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, index);
    expect(result).not.toBeNull();
    expect(result.previousStation.station.code).toBe('A');
    expect(result.nextStation.station.code).toBe('B');
    expect(result.previousIndex).toBe(0);
    expect(result.nextIndex).toBe(1);
  });
  it('returns bounding stations deterministically with floating point tolerance', () => {
    // 100.0000000001 is functionally 100 due to EPSILON tie-breaking.
    // So it should still snap A as previous and B as next.
    const result = (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 100 + 1e-10
    }, index);
    expect(result).not.toBeNull();
    expect(result.previousStation.station.code).toBe('A');
    expect(result.nextStation.station.code).toBe('B');
    expect(result.previousIndex).toBe(0);
    expect(result.nextIndex).toBe(1);
  });
  it('returns an immutable frozen object', () => {
    const result = (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, index);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.previousStation)).toBe(true); // Should inherently be frozen from input, but verified
  });
  it('does not mutate the original array inputs', () => {
    const originalIndex = [...index];
    (0, _stationSelection.selectBoundingStations)({
      alongTrackDistanceMetres: 150
    }, index);
    expect(index).toEqual(originalIndex);
  });
});