'use strict';
var _geometricProjection = require("./geometric-projection.js");
var _enums = require("../../domain/types/enums.js");
describe('GeometricProjectionStrategy', () => {
  const validConfig = {
    maximumProjectionDistanceMetres: 100,
    maximumAlongTrackGapMetres: 1000,
    // 1km
    minimumStationCount: 2,
    minimumCorridorCoverage: 0.5
  };
  const validGps = {
    lat: 10.0000,
    lng: 20.0005
  }; // Midpoint of first segment
  const validCorridor = [{
    lat: 10.0000,
    lng: 20.0000
  }, {
    lat: 10.0000,
    lng: 20.0010
  },
  // ~111m
  {
    lat: 10.0000,
    lng: 20.0020
  } // ~222m
  ];
  const validStations = [{
    station: {
      code: 'A',
      source: 'osm'
    },
    lat: 10.0000,
    lng: 20.0000
  }, {
    station: {
      code: 'B',
      source: 'osm'
    },
    lat: 10.0000,
    lng: 20.0020
  }];
  const validSnappedGeometry = {
    corridorGeometry: validCorridor,
    stations: validStations
  };
  it('should initialize with correct name and configuration', () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    expect(strategy.name).toBe('Geometric Projection');
    expect(strategy.config).toEqual(validConfig);
  });
  it('returns false for invalid gps', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    expect((await strategy.resolve(null, validSnappedGeometry)).success).toBe(false);
    expect((await strategy.resolve({
      lat: '10',
      lng: 20
    }, validSnappedGeometry)).success).toBe(false);
  });
  it('returns false for invalid corridor geometry', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    expect((await strategy.resolve(validGps, null)).success).toBe(false);
    expect((await strategy.resolve(validGps, {
      corridorGeometry: null,
      stations: []
    })).success).toBe(false);
    expect((await strategy.resolve(validGps, {
      corridorGeometry: validCorridor,
      stations: null
    })).success).toBe(false);
  });
  it('returns false for insufficient stations', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    const result = await strategy.resolve(validGps, {
      corridorGeometry: validCorridor,
      stations: [validStations[0]]
    });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Insufficient valid stations');
  });
  it('returns false for projection failure', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    // Invalid geometry points causing projection failure
    const badCorridor = [{
      lat: 'a',
      lng: 'b'
    }];
    const result = await strategy.resolve(validGps, {
      corridorGeometry: badCorridor,
      stations: validStations
    });
    expect(result.success).toBe(false);
  });
  it('returns false for bounding failure', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    // Let's create a scenario where the station is midway, and GPS is before it.
    const lateStations = [{
      station: {
        code: 'A',
        source: 'osm'
      },
      lat: 10.0000,
      lng: 20.0010
    }, {
      station: {
        code: 'B',
        source: 'osm'
      },
      lat: 10.0000,
      lng: 20.0020
    }];
    // Projecting at the very start of the corridor (0m). Station A is at ~111m.
    const startGps = {
      lat: 10.0000,
      lng: 20.0000
    };
    const result = await strategy.resolve(startGps, {
      corridorGeometry: validCorridor,
      stations: lateStations
    });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('outside the bounds');
  });
  it('returns false for uncalibrated constraints', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy({}); // uncalibrated
    const result = await strategy.resolve(validGps, validSnappedGeometry);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('not calibrated');
  });
  it('returns false if cross-track distance exceeds threshold', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy({
      ...validConfig,
      maximumProjectionDistanceMetres: 1 // Extremely tight constraint
    });
    // GPS is far away from corridor lat: 10
    const farGps = {
      lat: 15,
      lng: 20.0005
    };
    const result = await strategy.resolve(farGps, validSnappedGeometry);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Cross-track projection distance exceeds configured limit');
  });
  it('returns false if along-track gap exceeds threshold', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy({
      ...validConfig,
      maximumAlongTrackGapMetres: 10 // Threshold is 10m, gap is ~222m
    });
    // GPS midway between A and B
    const midGps = {
      lat: 10.0000,
      lng: 20.0010
    };
    const result = await strategy.resolve(midGps, validSnappedGeometry);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Along-track gap between bounding stations exceeds configured limit');
  });
  it('returns false if minimum station count is not met', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy({
      ...validConfig,
      minimumStationCount: 5 // We only have 2
    });
    const result = await strategy.resolve(validGps, validSnappedGeometry);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Total valid stations is below minimum required');
  });
  it('returns false if minimum corridor coverage is not met', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy({
      ...validConfig,
      minimumCorridorCoverage: 0.99 // Require 99% coverage, but stations might not span that much if points differ slightly
    });
    // Let's create a corridor that is much longer than the station span
    const longCorridor = [{
      lat: 10,
      lng: 15
    }, ...validCorridor, {
      lat: 10,
      lng: 25
    }];
    const result = await strategy.resolve(validGps, {
      corridorGeometry: longCorridor,
      stations: validStations
    });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Station coverage is below minimum required');
  });
  it('returns successful resolution with correct properties when valid', async () => {
    const strategy = new _geometricProjection.GeometricProjectionStrategy(validConfig);
    // Projecting exactly onto A
    const result = await strategy.resolve(validGps, validSnappedGeometry);
    expect(result.success).toBe(true);
    expect(result.previousStation).toEqual({
      code: 'A',
      source: 'osm'
    });
    expect(result.nextStation).toEqual({
      code: 'B',
      source: 'osm'
    });

    // Verify entire root result is deeply frozen
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.previousStation)).toBe(true);
    expect(Object.isFrozen(result.nextStation)).toBe(true);
    expect(Object.isFrozen(result.confidenceReasons)).toBe(true);
    expect(Object.isFrozen(result.evidenceSources)).toBe(true);

    // Attempt mutation and verify it fails/doesn't change
    expect(() => {
      result.method = 'HACKED';
    }).toThrow();
    expect(result.method).toBe(_enums.ResolutionMethod.GEOMETRIC_PROJECTION);
    expect(() => {
      result.confidenceReasons.push("Fake reason");
    }).toThrow();
    expect(result.confidenceReasons.length).toBe(3);
    expect(result.method).toBe(_enums.ResolutionMethod.GEOMETRIC_PROJECTION);
    expect(result.confidence).toBe(_enums.ConfidenceLevel.LOW);
    expect(result.evidenceSources).toEqual([_enums.EvidenceSource.GEOMETRIC_PROJECTION]);
    expect(result.confidenceReasons).toEqual(["Projected onto corridor geometry.", "Bounding stations determined geometrically.", "No authoritative topology available."]);
  });
});