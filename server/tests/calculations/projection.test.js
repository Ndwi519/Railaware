import { projectPointOntoCorridor } from '../../calculations/projection.js';
import { haversineMetres } from '../../calculations/haversine.js';

describe('projectPointOntoCorridor', () => {
  const EPSILON = 1e-6;

  describe('Invalid Geometry', () => {
    it('returns null if point is missing or malformed', () => {
      expect(projectPointOntoCorridor(null, [{lat: 1, lng: 1}, {lat: 2, lng: 2}])).toBeNull();
      expect(projectPointOntoCorridor({lat: 1}, [{lat: 1, lng: 1}, {lat: 2, lng: 2}])).toBeNull();
      expect(projectPointOntoCorridor({lat: '1', lng: 1}, [{lat: 1, lng: 1}, {lat: 2, lng: 2}])).toBeNull();
    });

    it('returns null if polyline is empty or missing', () => {
      expect(projectPointOntoCorridor({lat: 1, lng: 1}, null)).toBeNull();
      expect(projectPointOntoCorridor({lat: 1, lng: 1}, [])).toBeNull();
    });

    it('returns null if polyline has less than 2 coordinates (single coordinate)', () => {
      expect(projectPointOntoCorridor({lat: 1, lng: 1}, [{lat: 2, lng: 2}])).toBeNull();
    });

    it('returns null if polyline coordinates are malformed', () => {
      expect(projectPointOntoCorridor({lat: 1, lng: 1}, [{lat: 1, lng: 1}, {lat: 2}])).toBeNull();
    });
  });

  describe('Mathematical Projection', () => {
    const corridor = [
      { lat: 10.0, lng: 20.0 },
      { lat: 10.0, lng: 20.1 },
      { lat: 10.1, lng: 20.1 }
    ];

    it('projects point directly on a node exactly', () => {
      const result = projectPointOntoCorridor({ lat: 10.0, lng: 20.1 }, corridor);
      expect(result).not.toBeNull();
      expect(result.interpolationRatio).toBeCloseTo(1, 5); // at end of first segment
      expect(result.segmentIndex).toBe(0);
      expect(result.crossTrackDistanceMetres).toBeCloseTo(0, 5);
      
      const expectedAlongTrack = haversineMetres(corridor[0].lat, corridor[0].lng, corridor[1].lat, corridor[1].lng);
      expect(result.alongTrackDistanceMetres).toBeCloseTo(expectedAlongTrack, 5);
      
      expect(result.projectedPoint.lat).toBeCloseTo(10.0, 5);
      expect(result.projectedPoint.lng).toBeCloseTo(20.1, 5);
    });

    it('projects point perfectly in the middle of a segment', () => {
      const result = projectPointOntoCorridor({ lat: 10.0, lng: 20.05 }, corridor);
      expect(result).not.toBeNull();
      expect(result.interpolationRatio).toBeCloseTo(0.5, 5);
      expect(result.segmentIndex).toBe(0);
      expect(result.crossTrackDistanceMetres).toBeCloseTo(0, 5);
      expect(result.projectedPoint.lat).toBeCloseTo(10.0, 5);
      expect(result.projectedPoint.lng).toBeCloseTo(20.05, 5);
    });

    it('projects an offset point correctly via equirectangular approx', () => {
      // Offset purely in latitude from the middle of the first segment (which goes east)
      const offsetLat = 10.01;
      const result = projectPointOntoCorridor({ lat: offsetLat, lng: 20.05 }, corridor);
      
      expect(result).not.toBeNull();
      expect(result.segmentIndex).toBe(0);
      // Because it's a perpendicular offset to a horizontal line segment, 
      // the projection should still be at the midpoint (lng=20.05).
      expect(result.interpolationRatio).toBeCloseTo(0.5, 5);
      expect(result.projectedPoint.lat).toBeCloseTo(10.0, 5);
      expect(result.projectedPoint.lng).toBeCloseTo(20.05, 5);
      
      const expectedCrossTrack = haversineMetres(offsetLat, 20.05, 10.0, 20.05);
      expect(result.crossTrackDistanceMetres).toBeCloseTo(expectedCrossTrack, 5);
    });

    it('clamps projection to segment endpoints when point is outside bounds', () => {
      // Point is further west than the start of the corridor
      const result = projectPointOntoCorridor({ lat: 10.0, lng: 19.9 }, corridor);
      expect(result).not.toBeNull();
      expect(result.interpolationRatio).toBe(0);
      expect(result.segmentIndex).toBe(0);
      expect(result.projectedPoint.lat).toBe(10.0);
      expect(result.projectedPoint.lng).toBe(20.0);
      expect(result.alongTrackDistanceMetres).toBe(0);
      
      const expectedCrossTrack = haversineMetres(10.0, 19.9, 10.0, 20.0);
      expect(result.crossTrackDistanceMetres).toBeCloseTo(expectedCrossTrack, 5);
    });

    it('calculates cumulative alongTrack distance for multi-segment corridors', () => {
      // Midpoint of the SECOND segment (which goes north)
      const result = projectPointOntoCorridor({ lat: 10.05, lng: 20.1 }, corridor);
      expect(result).not.toBeNull();
      expect(result.segmentIndex).toBe(1);
      expect(result.interpolationRatio).toBeCloseTo(0.5, 5);
      
      const seg1Len = haversineMetres(corridor[0].lat, corridor[0].lng, corridor[1].lat, corridor[1].lng);
      const halfSeg2Len = haversineMetres(corridor[1].lat, corridor[1].lng, corridor[2].lat, corridor[2].lng) / 2;
      
      expect(result.alongTrackDistanceMetres).toBeCloseTo(seg1Len + halfSeg2Len, 3);
    });
    
    it('handles zero-length segments and duplicate coordinates safely', () => {
      const dupCorridor = [
        { lat: 10.0, lng: 20.0 },
        { lat: 10.0, lng: 20.0 }, // Duplicate
        { lat: 10.1, lng: 20.0 }
      ];
      const result = projectPointOntoCorridor({ lat: 10.05, lng: 20.0 }, dupCorridor);
      
      expect(result).not.toBeNull();
      expect(result.segmentIndex).toBe(1); // The second segment (10.0 to 10.1)
      expect(result.interpolationRatio).toBeCloseTo(0.5, 5);
      
      const halfLen = haversineMetres(10.0, 20.0, 10.1, 20.0) / 2;
      expect(result.alongTrackDistanceMetres).toBeCloseTo(halfLen, 3);
      
      // If we ask for projection strictly on the duplicate node
      const dupResult = projectPointOntoCorridor({ lat: 10.0, lng: 20.0 }, dupCorridor);
      expect(dupResult.segmentIndex).toBe(0); // tie-breaking should pick the first segment!
      expect(dupResult.interpolationRatio).toBe(0);
      expect(dupResult.alongTrackDistanceMetres).toBe(0);
    });

    it('uses deterministic tie-breaking to pick the earliest segment', () => {
      // Consider a U-shaped corridor where two segments might be equally close to a point.
      const uCorridor = [
        { lat: 10.0, lng: 20.0 },
        { lat: 10.1, lng: 20.0 },
        { lat: 10.1, lng: 20.1 },
        { lat: 10.0, lng: 20.1 }
      ];
      
      // A point exactly in the middle between the two vertical legs
      const middlePoint = { lat: 10.05, lng: 20.05 };
      const result = projectPointOntoCorridor(middlePoint, uCorridor);
      
      // The distance to segment 0 (lng 20.0) and segment 2 (lng 20.1) is identical.
      // Tie-breaking must select segment 0 because it appears first.
      expect(result.segmentIndex).toBe(0);
      expect(result.interpolationRatio).toBeCloseTo(0.5, 5);
      expect(result.projectedPoint.lng).toBe(20.0);
    });

    it('returns an immutable Result object', () => {
      const result = projectPointOntoCorridor({ lat: 10.0, lng: 20.0 }, corridor);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.projectedPoint)).toBe(true);
    });
  });
});
