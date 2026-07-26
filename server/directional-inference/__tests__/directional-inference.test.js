"use strict";

const {
  SessionTrajectory,
  TrajectoryObservation,
  inferDirection,
  DirectionInferenceResult,
  MovementState,
  ValidationError
} = require('../index.js');

describe('Directional Inference Domain Model', () => {
  describe('TrajectoryObservation', () => {
    it('requires numeric timestamp', () => {
      expect(() => new TrajectoryObservation({ latitude: 0, longitude: 0 })).toThrow(ValidationError);
      expect(() => new TrajectoryObservation({ timestamp: '123', latitude: 0, longitude: 0 })).toThrow(ValidationError);
    });

    it('requires numeric coordinates', () => {
      expect(() => new TrajectoryObservation({ timestamp: 123, longitude: 0 })).toThrow(ValidationError);
      expect(() => new TrajectoryObservation({ timestamp: 123, latitude: 0 })).toThrow(ValidationError);
      expect(() => new TrajectoryObservation({ timestamp: 123, latitude: '0', longitude: 0 })).toThrow(ValidationError);
    });

    it('creates immutable object', () => {
      const obs = new TrajectoryObservation({ timestamp: 123, latitude: 0, longitude: 0 });
      expect(() => { obs.timestamp = 456; }).toThrow();
    });
  });

  describe('SessionTrajectory', () => {
    it('creates immutable object', () => {
      const traj = new SessionTrajectory();
      expect(() => { traj.maxHistory = 20; }).toThrow();
    });

    it('validates observations format', () => {
      expect(() => new SessionTrajectory([{ timestamp: 123, latitude: 0, longitude: 0 }])).toThrow(ValidationError); // Plain object, not instance
      const obs = new TrajectoryObservation({ timestamp: 123, latitude: 0, longitude: 0 });
      expect(() => new SessionTrajectory([obs])).not.toThrow();
    });

    it('enforces chronological ordering', () => {
      const obs1 = new TrajectoryObservation({ timestamp: 200, latitude: 0, longitude: 0 });
      const obs2 = new TrajectoryObservation({ timestamp: 100, latitude: 0, longitude: 0 });
      expect(() => new SessionTrajectory([obs1, obs2])).toThrow(ValidationError);
    });

    it('respects maxHistory constraint and maintains immutability on append', () => {
      const traj = new SessionTrajectory([], 2);
      const obs1 = new TrajectoryObservation({ timestamp: 100, latitude: 0, longitude: 0 });
      const obs2 = new TrajectoryObservation({ timestamp: 200, latitude: 0, longitude: 0 });
      const obs3 = new TrajectoryObservation({ timestamp: 300, latitude: 0, longitude: 0 });

      const traj2 = traj.append(obs1).append(obs2);
      const traj3 = traj2.append(obs3);

      expect(traj2.observations).toHaveLength(2);
      expect(traj3.observations).toHaveLength(2);
      expect(traj3.observations[0].timestamp).toBe(200);
      expect(traj3.observations[1].timestamp).toBe(300);
    });
  });

  describe('DirectionInferenceResult', () => {
    it('validates movement state', () => {
      expect(() => new DirectionInferenceResult({ movementState: 'INVALID' })).toThrow(ValidationError);
    });

    it('throws if movement state is mutated', () => {
      const result = new DirectionInferenceResult({ movementState: MovementState.STATIONARY });
      expect(() => { result.movementState = MovementState.MOVING; }).toThrow();
    });
  });

  describe('DirectionalInference (inferDirection)', () => {
    it('returns INSUFFICIENT_HISTORY for single observation', () => {
      const obs1 = new TrajectoryObservation({ timestamp: 100, latitude: 0, longitude: 0 });
      const traj = new SessionTrajectory([obs1]);
      const result = inferDirection({ sessionTrajectory: traj });
      expect(result.movementState).toBe(MovementState.INSUFFICIENT_HISTORY);
    });

    it('returns STATIONARY for minor jitter', () => {
      // Very close points (~1.1 meters apart)
      const obs1 = new TrajectoryObservation({ timestamp: 100, latitude: 0, longitude: 0 });
      const obs2 = new TrajectoryObservation({ timestamp: 200, latitude: 0.00001, longitude: 0 });
      const traj = new SessionTrajectory([obs1, obs2]);
      const result = inferDirection({ sessionTrajectory: traj });
      expect(result.movementState).toBe(MovementState.STATIONARY);
      expect(result.isStable).toBe(true);
    });

    it('returns NOISY for impossible jumps', () => {
      // 10 degrees is thousands of kilometers
      const obs1 = new TrajectoryObservation({ timestamp: 100, latitude: 0, longitude: 0 });
      const obs2 = new TrajectoryObservation({ timestamp: 200, latitude: 10, longitude: 0 });
      const traj = new SessionTrajectory([obs1, obs2]);
      const result = inferDirection({ sessionTrajectory: traj });
      expect(result.movementState).toBe(MovementState.NOISY);
    });

    it('returns MOVING for clear movement', () => {
      // ~1.1km apart
      const obs1 = new TrajectoryObservation({ timestamp: 100, latitude: 0, longitude: 0 });
      const obs2 = new TrajectoryObservation({ timestamp: 200, latitude: 0.01, longitude: 0 });
      const traj = new SessionTrajectory([obs1, obs2]);
      const result = inferDirection({ sessionTrajectory: traj });
      expect(result.movementState).toBe(MovementState.MOVING);
      expect(result.headingDegrees).toBeCloseTo(0); // moving North
    });

    it('throws on invalid trajectory', () => {
      expect(() => inferDirection(null)).toThrow(ValidationError);
      expect(() => inferDirection({})).toThrow(ValidationError);
    });
  });
});
