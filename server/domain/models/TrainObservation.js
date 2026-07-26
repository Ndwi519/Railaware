/**
 * @module domain/models/TrainObservation
 * @responsibility Immutable value object representing a single provider snapshot of a train's state.
 *
 * Mandatory invariants (enforced at construction):
 *   - id:         non-empty string — used for logging, deduplication, and store identity
 *   - train:      object with a non-empty string `number` — the store key for history lookup
 *   - status:     non-empty string — required by the awareness engine state machine
 *   - recordedAt: Date instance — required for chronological ordering in the store and
 *                 gap-detection in the confidence engine
 *
 * Optional fields default to null unless supplied:
 *   lastUpdatedAt, segmentProgress, currentSegment, delayMinutes, validationErrors, isActualPosition
 */
function createTrainObservation({ id, train, status, segmentProgress = null, currentSegment = null, delayMinutes = null, lastUpdatedAt = null, recordedAt, validationErrors = [], isActualPosition = false }) {
  if (!id || typeof id !== 'string') {
    throw new Error('TrainObservation invariant violated: id must be a non-empty string');
  }
  if (!train || typeof train.number !== 'string' || !train.number) {
    throw new Error('TrainObservation invariant violated: train must be an object with a non-empty string number');
  }
  if (!status || typeof status !== 'string') {
    throw new Error('TrainObservation invariant violated: status must be a non-empty string');
  }
  if (!(recordedAt instanceof Date) || isNaN(recordedAt.getTime())) {
    throw new Error('TrainObservation invariant violated: recordedAt must be a valid Date instance');
  }
  if (lastUpdatedAt !== null && (!(lastUpdatedAt instanceof Date) || isNaN(lastUpdatedAt.getTime()))) {
    throw new Error('TrainObservation invariant violated: lastUpdatedAt must be a valid Date instance if provided');
  }

  return Object.freeze({
    id,
    train,
    status,
    segmentProgress,
    currentSegment,
    delayMinutes,
    lastUpdatedAt,
    recordedAt,
    isActualPosition,
    validationErrors: Object.freeze([...validationErrors])
  });
}

module.exports = { createTrainObservation };
