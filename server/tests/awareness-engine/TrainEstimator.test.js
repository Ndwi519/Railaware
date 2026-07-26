var _TrainEstimator = require("../../awareness-engine/TrainEstimator.js");
var _enums = require("../../domain/types/enums.js");
describe('TrainEstimator', () => {
  const mockJourney = {
    targetStation: {
      code: 'B'
    }
  };
  const mockConfidence = {
    level: _enums.ConfidenceLevel.HIGH
  };
  const mockObservation = {
    status: _enums.TrainStatus.RUNNING,
    segmentProgress: 0.5,
    recordedAt: new Date('2026-07-08T10:00:00Z'),
    currentSegment: {
      previousStation: {
        code: 'A'
      },
      nextStation: {
        code: 'C'
      }
    }
  };
  const mockCorridor = {
    stations: [{
      feature: {
        station: {
          code: 'A'
        }
      },
      alongTrackDistanceMetres: 1000
    }, {
      feature: {
        station: {
          code: 'B'
        }
      },
      alongTrackDistanceMetres: 5000
    }, {
      feature: {
        station: {
          code: 'C'
        }
      },
      alongTrackDistanceMetres: 9000
    }]
  };
  it('Edge Case 1: No train available (0 trains on verified topology)', () => {
    const result = (0, _TrainEstimator.estimateTrainAwareness)(null, mockObservation, mockCorridor, mockConfidence);
    expect(result.distanceMetres).toBeNull();
  });
  it('Edge Case 7: Missing geometry', () => {
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, mockObservation, null, mockConfidence);
    expect(result.distanceMetres).toBeNull();
  });
  it('Missing target station in corridor', () => {
    const badJourney = {
      targetStation: {
        code: 'Z'
      }
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(badJourney, mockObservation, mockCorridor, mockConfidence);
    expect(result.distanceMetres).toBeNull();
  });
  it('Normal operation: train approaching', () => {
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, mockObservation, mockCorridor, mockConfidence);

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
        previousStation: {
          code: 'B'
        },
        nextStation: {
          code: 'C'
        }
      }
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, obs, mockCorridor, mockConfidence);
    expect(result.distanceMetres).toBe(2000);
    expect(result.approaching).toBe(false);
  });
  it('Defensive Case: segmentProgress < 0 is clamped to 0', () => {
    const obs = {
      ...mockObservation,
      segmentProgress: -0.5
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, obs, mockCorridor, mockConfidence);
    // Clamped progress = 0. Train is at previous station A (1000). Distance to target B (5000) is 4000.
    expect(result.trainAlongTrackDistanceMetres).toBe(1000);
    expect(result.distanceMetres).toBe(4000);
  });
  it('Defensive Case: segmentProgress > 1 is clamped to 1', () => {
    const obs = {
      ...mockObservation,
      segmentProgress: 1.5
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, obs, mockCorridor, mockConfidence);
    // Clamped progress = 1. Train is at next station C (9000). Distance to target B (5000) is 4000.
    expect(result.trainAlongTrackDistanceMetres).toBe(9000);
    expect(result.distanceMetres).toBe(4000);
  });
  it('Defensive Case: non-numeric segmentProgress defaults to 0', () => {
    const obs = {
      ...mockObservation,
      segmentProgress: 'invalid-string'
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, obs, mockCorridor, mockConfidence);
    // Progress defaults to 0. Train is at previous station A (1000).
    expect(result.trainAlongTrackDistanceMetres).toBe(1000);
    expect(result.distanceMetres).toBe(4000);
  });
  it('Defensive Case: non-finite station alongTrackDistanceMetres returns fallback nulls', () => {
    const badCorridor = {
      stations: [{
        feature: {
          station: {
            code: 'A'
          }
        },
        alongTrackDistanceMetres: 1000
      }, {
        feature: {
          station: {
            code: 'B'
          }
        },
        alongTrackDistanceMetres: NaN
      }, {
        feature: {
          station: {
            code: 'C'
          }
        },
        alongTrackDistanceMetres: 9000
      }]
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, mockObservation, badCorridor, mockConfidence);
    expect(result.trainAlongTrackDistanceMetres).toBeNull();
    expect(result.userAlongTrackDistanceMetres).toBeNull();
    expect(result.distanceMetres).toBeNull();
  });

  it('Defensive Case: zero-length segment (identical alongTrackDistanceMetres) is mathematically safe', () => {
    // If next station has same distance as previous, segmentLength is 0.
    // The estimator should safely evaluate without NaN or divide-by-zero.
    const zeroLengthCorridor = {
      stations: [{
        feature: {
          station: {
            code: 'A'
          }
        },
        alongTrackDistanceMetres: 1000
      }, {
        feature: {
          station: {
            code: 'B'
          }
        },
        alongTrackDistanceMetres: 5000
      }, {
        feature: {
          station: {
            code: 'C'
          }
        },
        alongTrackDistanceMetres: 1000 // Same distance as A!
      }]
    };
    const obs = {
      ...mockObservation,
      segmentProgress: 0.8
    };
    const result = (0, _TrainEstimator.estimateTrainAwareness)(mockJourney, obs, zeroLengthCorridor, mockConfidence);

    // Train distance = A (1000) + (C(1000) - A(1000)) * 0.8 = 1000 + 0 = 1000.
    expect(result.trainAlongTrackDistanceMetres).toBe(1000);
    // User at B (5000), so distance to train is 4000.
    expect(result.distanceMetres).toBe(4000);
    // Since C >= A (1000 >= 1000), direction defaults to TOWARDS_END.
    expect(result.direction).toBe('TOWARDS_END');
  });
});