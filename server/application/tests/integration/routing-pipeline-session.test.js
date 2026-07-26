"use strict";

const { TrajectoryManager } = require('../../services/TrajectoryManager.js');
const { MovementState } = require('../../../directional-inference/MovementState.js');
const { inferDirection } = require('../../../directional-inference/DirectionalInference.js');
const { DiscoveryContext } = require('../../models/DiscoveryContext.js');

describe('Session Ownership & Trajectory Manager Integration', () => {
  let trajectoryManager;

  beforeEach(() => {
    trajectoryManager = new TrajectoryManager(2); // small max for eviction tests
  });

  const getDirection = (sessionTrajectory) => {
    const context = new DiscoveryContext({ sessionTrajectory, observation: {} });
    return inferDirection(context);
  };

  test('Scenario A & B: Interleaved requests do not cross-contaminate', () => {
    // Session A obs 1
    const resA1 = trajectoryManager.recordObservation('session-a', 28.6139, 77.2090);
    expect(resA1.sessionTrajectory.observations).toHaveLength(1);
    expect(getDirection(resA1.sessionTrajectory).movementState).toBe(MovementState.INSUFFICIENT_HISTORY);

    // Session B obs 1
    const resB1 = trajectoryManager.recordObservation('session-b', 28.6140, 77.2091);
    expect(resB1.sessionTrajectory.observations).toHaveLength(1);
    expect(getDirection(resB1.sessionTrajectory).movementState).toBe(MovementState.INSUFFICIENT_HISTORY);

    // Session A obs 2 (should compute movement with A1)
    const resA2 = trajectoryManager.recordObservation('session-a', 28.6145, 77.2095);
    expect(resA2.sessionTrajectory.observations).toHaveLength(2);
    expect(resA2.sessionTrajectory.observations[0].latitude).toBe(28.6139);

    const dirA2 = getDirection(resA2.sessionTrajectory);
    expect(dirA2.movementState).toBe(MovementState.MOVING);

    // Session B obs 2 (should compute movement with B1)
    const resB2 = trajectoryManager.recordObservation('session-b', 28.6150, 77.2100);
    expect(resB2.sessionTrajectory.observations).toHaveLength(2);
    expect(resB2.sessionTrajectory.observations[0].latitude).toBe(28.6140);

    const dirB2 = getDirection(resB2.sessionTrajectory);
    expect(dirB2.movementState).toBe(MovementState.MOVING);
  });

  test('LRU eviction occurs correctly', () => {
    trajectoryManager.recordObservation('session-1', 1, 1);
    trajectoryManager.recordObservation('session-2', 2, 2);

    expect(trajectoryManager.sessions.has('session-1')).toBe(true);
    expect(trajectoryManager.sessions.has('session-2')).toBe(true);

    // Adding 3rd session should evict session-1
    trajectoryManager.recordObservation('session-3', 3, 3);

    expect(trajectoryManager.sessions.has('session-1')).toBe(false);
    expect(trajectoryManager.sessions.has('session-2')).toBe(true);
    expect(trajectoryManager.sessions.has('session-3')).toBe(true);

    // session-1 starts fresh
    const res1Again = trajectoryManager.recordObservation('session-1', 1.1, 1.1);
    expect(res1Again.sessionTrajectory.observations).toHaveLength(1);
    expect(getDirection(res1Again.sessionTrajectory).movementState).toBe(MovementState.INSUFFICIENT_HISTORY);
  });

  test('LRU refresh preserves session on access', () => {
    trajectoryManager.recordObservation('session-a', 1, 1);
    trajectoryManager.recordObservation('session-b', 2, 2);

    // Access session-a to refresh it
    trajectoryManager.recordObservation('session-a', 1.1, 1.1);

    // Create session-c which should evict session-b since max is 2 and session-a was just refreshed
    trajectoryManager.recordObservation('session-c', 3, 3);

    expect(trajectoryManager.sessions.has('session-a')).toBe(true);
    expect(trajectoryManager.sessions.has('session-c')).toBe(true);
    expect(trajectoryManager.sessions.has('session-b')).toBe(false);
  });

  test('Evicted session creates a fresh trajectory', () => {
    trajectoryManager.recordObservation('session-a', 1, 1);
    trajectoryManager.recordObservation('session-b', 2, 2);
    trajectoryManager.recordObservation('session-c', 3, 3); // evicts session-a

    expect(trajectoryManager.sessions.has('session-a')).toBe(false);

    // Reuse Session A identifier
    const resA = trajectoryManager.recordObservation('session-a', 10, 10);

    // Fresh trajectory -> INSUFFICIENT_HISTORY
    expect(resA.sessionTrajectory.observations).toHaveLength(1);
    expect(getDirection(resA.sessionTrajectory).movementState).toBe(MovementState.INSUFFICIENT_HISTORY);
  });
});
