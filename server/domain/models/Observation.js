/**
 * The normalized snapshot containing strictly typed fields.
 * No inference or mathematical smoothing occurs here.
 */
function createObservation({ id, train, status, segmentProgress = null, currentSegment = null, delayMinutes = null, lastUpdatedAt = null, recordedAt, validationErrors = [] }) {
  return Object.freeze({
    id,
    train,
    status,
    segmentProgress,
    currentSegment,
    delayMinutes,
    lastUpdatedAt,
    recordedAt,
    validationErrors: Object.freeze([...validationErrors])
  });
}

module.exports = { createObservation };
