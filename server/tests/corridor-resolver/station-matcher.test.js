var _globals = require("@jest/globals");
var _stationMatcher = require("../../corridor-resolver/station-matcher.js");
describe('Station Matcher Pure Pipeline', () => {
  describe('shouldReplaceStation', () => {
    it('prefers ref:IR', () => {
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: true
      }, {
        hasRefIR: false
      })).toBe(true);
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: false
      }, {
        hasRefIR: true
      })).toBe(false);
    });
    it('prefers name if ref:IR ties', () => {
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: true,
        hasName: true
      }, {
        hasRefIR: true,
        hasName: false
      })).toBe(true);
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: false,
        hasName: true
      }, {
        hasRefIR: false,
        hasName: false
      })).toBe(true);
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: false,
        hasName: false
      }, {
        hasRefIR: false,
        hasName: true
      })).toBe(false);
    });
    it('prefers smallest node ID if name and ref:IR tie', () => {
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: true,
        hasName: true,
        id: 100
      }, {
        hasRefIR: true,
        hasName: true,
        id: 200
      })).toBe(true);
      expect((0, _stationMatcher.shouldReplaceStation)({
        hasRefIR: true,
        hasName: true,
        id: 300
      }, {
        hasRefIR: true,
        hasName: true,
        id: 200
      })).toBe(false);
    });
  });
  describe('compareStationsAlongTrack', () => {
    it('orders by alongTrackDistanceMetres', () => {
      expect((0, _stationMatcher.compareStationsAlongTrack)({
        alongTrackDistanceMetres: 100
      }, {
        alongTrackDistanceMetres: 200
      })).toBeLessThan(0);
      expect((0, _stationMatcher.compareStationsAlongTrack)({
        alongTrackDistanceMetres: 200
      }, {
        alongTrackDistanceMetres: 100
      })).toBeGreaterThan(0);
    });
    it('orders by node ID if distances tie', () => {
      expect((0, _stationMatcher.compareStationsAlongTrack)({
        alongTrackDistanceMetres: 100,
        id: 50
      }, {
        alongTrackDistanceMetres: 100,
        id: 100
      })).toBeLessThan(0);
      expect((0, _stationMatcher.compareStationsAlongTrack)({
        alongTrackDistanceMetres: 100,
        id: 150
      }, {
        alongTrackDistanceMetres: 100,
        id: 100
      })).toBeGreaterThan(0);
    });
  });
  describe('deduplicateStations', () => {
    it('deduplicates based on priority rules keeping only the best match per code', () => {
      const raw = [{
        id: 1,
        hasRefIR: false,
        feature: {
          station: {
            code: 'A'
          }
        }
      }, {
        id: 2,
        hasRefIR: true,
        feature: {
          station: {
            code: 'A'
          }
        }
      },
      // Should win for A
      {
        id: 3,
        hasRefIR: true,
        feature: {
          station: {
            code: 'B'
          }
        }
      }];
      const deduped = (0, _stationMatcher.deduplicateStations)(raw);
      expect(deduped.length).toBe(2);
      expect(deduped.find(s => s.feature.station.code === 'A').id).toBe(2);
    });
    it('preserves unique stations', () => {
      const raw = [{
        id: 1,
        hasRefIR: true,
        feature: {
          station: {
            code: 'A'
          }
        }
      }, {
        id: 2,
        hasRefIR: true,
        feature: {
          station: {
            code: 'B'
          }
        }
      }, {
        id: 3,
        hasRefIR: true,
        feature: {
          station: {
            code: 'C'
          }
        }
      }];
      const deduped = (0, _stationMatcher.deduplicateStations)(raw);
      expect(deduped.length).toBe(3);
    });
  });
  describe('matchStationsToCorridor pipeline isolation', () => {
    it('returns deterministic results with injected dependency and assembledCorridor', () => {
      const assembledCorridor = Object.freeze({}); // mock
      const stations = [{
        id: 100,
        feature: {
          station: {
            code: 'A'
          },
          lat: 10,
          lng: 10
        }
      },
      {
        id: 200,
        feature: {
          station: {
            code: 'B'
          },
          lat: 20,
          lng: 20
        }
      }];
      const mockProjection = _globals.jest.fn();
      mockProjection.mockImplementation((corridor, point) => {
        if (point.station.code === 'A') {
          return { crossTrackDistanceMetres: 50, alongTrackDistanceMetres: 150, corridorSegmentIndex: 0, segmentIndex: 1 };
        } else {
          return { crossTrackDistanceMetres: 50, alongTrackDistanceMetres: 200, corridorSegmentIndex: 0, segmentIndex: 2 };
        }
      });
      const results = (0, _stationMatcher.matchStationsToCorridor)({
        assembledCorridor,
        stations,
        thresholdMetres: 100,
        projectOntoCorridor: mockProjection
      });
      expect(mockProjection).toHaveBeenCalledTimes(2);
      expect(results.length).toBe(2);
      expect(results[0].station.code).toBe('A'); // 150m
      expect(results[1].station.code).toBe('B'); // 200m
    });

    it('safely skips stations outside the threshold', () => {
      const assembledCorridor = Object.freeze({});
      const stations = [{
        id: 100,
        feature: {
          station: {
            code: 'A'
          },
          lat: 10,
          lng: 10
        }
      }, {
        id: 300,
        feature: {
          station: {
            code: 'C'
          },
          lat: 30,
          lng: 30
        }
      }];
      const mockProjection = _globals.jest.fn();
      mockProjection.mockImplementation((corridor, point) => {
        if (point.station.code === 'A') {
          return { crossTrackDistanceMetres: 50, alongTrackDistanceMetres: 150, corridorSegmentIndex: 0, segmentIndex: 1 };
        } else {
          return { crossTrackDistanceMetres: 150, alongTrackDistanceMetres: 200, corridorSegmentIndex: 0, segmentIndex: 2 };
        }
      });

      const results = (0, _stationMatcher.matchStationsToCorridor)({
        assembledCorridor,
        stations,
        thresholdMetres: 100,
        projectOntoCorridor: mockProjection
      });
      expect(mockProjection).toHaveBeenCalledTimes(2);
      expect(results.length).toBe(1);
      expect(results[0].station.code).toBe('A');
    });
  });
});