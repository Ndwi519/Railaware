"use strict";

const MovementState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  STATIONARY: 'STATIONARY',
  MOVING: 'MOVING',
  INSUFFICIENT_HISTORY: 'INSUFFICIENT_HISTORY',
  NOISY: 'NOISY'
});

module.exports = {
  MovementState
};
