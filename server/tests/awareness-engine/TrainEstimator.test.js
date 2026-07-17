import { estimateTrainAwareness } from '../../awareness-engine/TrainEstimator.js';
import { ConfidenceLevel, TrainStatus } from '../../domain/types/enums.js';

describe('TrainEstimator', () => {
  const mockJourney = { targetStation: { code: 'B' } };
  const mockConfidence = { level: ConfidenceLevel.HIGH };
  const mockObservation = {
    status: TrainStatus.RUNNING,
    segmentProgress: 0.5,
    recordedAt: new Date('2026-07-08T10:00:00Z'),
    currentSegment: {
      previousStation: { code: 'A' },
      nextStation: { code: 'C' }
    }
  };
  const mockCorridor = {
    stations: [
      { feature: { station: { code: 'A' } }, alongTrackDistanceMetres: 1000 },
      { feature: { station: { code: 'B' } }, alongTrackDistanceMetres: 5000 },
      { feature: { station: { code: 'C' } }, alongTrackDistanceMetres: 9000 },
    ]
  };

  it('Edge Case 1: No train available (0 trains on verified topology)', () => {
    const result = estimateTrainAwareness(null, mockObservation, mockCorridor, mockConfidence);
    expect(result.distanceMetres).toBeNull();
  });


  it('Edge Case 7: Missing geometry', () => {
    const result = estimateTrainAwareness(mockJourney, mockObservation, null, mockConfidence);
    expect(result.distanceMetres).toBeNull();
  });

  it('Missing target station in corridor', () => {
    const badJourney = { targetStation: { code: 'Z' } };
    const result = estimateTrainAwareness(badJourney, mockObservation, mockCorridor, mockConfidence);
    expect(result.distanceMetres).toBeNull();
  });

  it('Normal operation: train approaching', () => {
    const result = estimateTrainAwareness(mockJourney, mockObservation, mockCorridor, mockConfidence);
    
    // Train at A (1000) + 0.5 * (9000 - 1000) = 1000 + 4000 = 5000
    // Wait, next is C(9000), previous is A(1000)
    expect(result.trainAlongTrackDistanceMetres).toBe(5000);
    expect(result.userAlongTrackDistanceMetres).toBe(5000);
    expect(result.distanceMetres).toBe(0); // Right at B
    expect(result.direction).toBe('TOWARDS_END');
    
    // Approaching? Yes because userDistance (5000) >= trainDistance (5000)
    expect(result.approaching).toBe(true);
  });

  it('Normal operation: departed', () => {
    const obs = {
        ...mockObservation,
        currentSegment: {
            previousStation: { code: 'B' },
            nextStation: { code: 'C' }
        }
    };
    const result = estimateTrainAwareness(mockJourney, obs, mockCorridor, mockConfidence);
    expect(result.distanceMetres).toBe(2000);
    expect(result.approaching).toBe(false);
  });
});
