Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.estimateTrainAwareness = estimateTrainAwareness;
var _enums = require("../domain/types/enums.js");
const { createEstimatedTrainState } = require("../domain/models/EstimatedTrainState.js");
/**
 * @module awareness-engine/TrainEstimator
 * @responsibility Calculate geographic distance and approach estimations for a train relative to a target station.
 * 
 * INPUTS:
 * 1. journey (Object): The user's active journey context containing target station.
 * 2. observation (Object): The normalized factual state of the train.
 * 3. corridor (Object): The geographic track and resolved stations.
 * 
 * OUTPUTS:
 * - trainAlongTrackDistanceMetres (Number|null): Train's absolute distance from corridor start in metres.
 * - userAlongTrackDistanceMetres (Number|null): User/target station's absolute distance from corridor start in metres.
 * - distanceMetres (Number|null): Absolute distance between train and user in metres.
 * - direction (String|null): 'TOWARDS_END' or 'TOWARDS_START' based on train movement.
 * - approaching (Boolean|null): True if the train is moving towards the user, false if moving away.
 * - lastUpdatedAt (Date|null): Timestamp of the provider data.
 */

const DIRECTION = Object.freeze({
  TOWARDS_END: 'TOWARDS_END',
  TOWARDS_START: 'TOWARDS_START',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Pure function to estimate train spatial properties relative to a target user station.
 * Deterministic and fully unit-testable.
 * 
 * @param {Object} journey - The user's active journey context containing target station.
 * @param {Object} observation - The normalized factual state of the train.
 * @param {Object} corridor - The resolved railway corridor containing geo stations.
 * @returns {Readonly<Object>} The frozen estimation results.
 */
function estimateTrainAwareness(journey, observation, corridor) {
  const estimation = {
    trainAlongTrackDistanceMetres: null,
    userAlongTrackDistanceMetres: null,
    distanceMetres: null,
    direction: null,
    approaching: null,
    lastUpdatedAt: observation && observation.recordedAt instanceof Date ? observation.recordedAt : null
  };
  if (!observation || !journey) {
    return createEstimatedTrainState(estimation);
  }

  // If we have a dummy observation indicating zero trains, yield no spatial estimation
  if (!observation.currentSegment && observation.status === _enums.TrainStatus.NOT_STARTED) {
    return createEstimatedTrainState(estimation);
  }

  // Cancelled train yields no spatial estimation
  if (observation.status === _enums.TrainStatus.CANCELLED) {
    return createEstimatedTrainState(estimation);
  }

  // Missing topology / geometry
  if (!observation.currentSegment || !corridor || !Array.isArray(corridor.stations)) {
    return createEstimatedTrainState(estimation);
  }

  // Find user's station
  const targetCode = journey.targetStation?.code;
  if (!targetCode) {
    return createEstimatedTrainState(estimation);
  }
  const userStationData = corridor.stations.find(s => s?.feature?.station?.code === targetCode);
  if (!userStationData || !Number.isFinite(userStationData.alongTrackDistanceMetres)) {
    return createEstimatedTrainState(estimation);
  }
  const userDistance = userStationData.alongTrackDistanceMetres;
  estimation.userAlongTrackDistanceMetres = userDistance;

  // Find train's location
  const prevCode = observation.currentSegment.previousStation?.code;
  const nextCode = observation.currentSegment.nextStation?.code;
  if (!prevCode) {
    return createEstimatedTrainState(estimation);
  }
  const prevData = corridor.stations.find(s => s?.feature?.station?.code === prevCode);
  if (!prevData || !Number.isFinite(prevData.alongTrackDistanceMetres)) {
    return createEstimatedTrainState(estimation);
  }
  const nextData = nextCode ? corridor.stations.find(s => s?.feature?.station?.code === nextCode) : null;
  let trainDistance = prevData.alongTrackDistanceMetres;
  let direction = null;
  if (nextData && Number.isFinite(nextData.alongTrackDistanceMetres)) {
    direction = nextData.alongTrackDistanceMetres >= prevData.alongTrackDistanceMetres ? DIRECTION.TOWARDS_END : DIRECTION.TOWARDS_START;
    const progress = typeof observation.segmentProgress === 'number' && Number.isFinite(observation.segmentProgress) ? observation.segmentProgress : 0;

    // Clamp progress: 0 <= progress <= 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const segmentLength = nextData.alongTrackDistanceMetres - prevData.alongTrackDistanceMetres;
    trainDistance = prevData.alongTrackDistanceMetres + segmentLength * clampedProgress;
  } else {
    direction = DIRECTION.UNKNOWN;
  }
  estimation.trainAlongTrackDistanceMetres = Math.round(trainDistance);
  estimation.direction = direction;
  estimation.distanceMetres = Math.round(Math.abs(userDistance - trainDistance));
  if (direction === DIRECTION.TOWARDS_END) {
    estimation.approaching = userDistance >= trainDistance;
  } else if (direction === DIRECTION.TOWARDS_START) {
    estimation.approaching = userDistance <= trainDistance;
  } else {
    estimation.approaching = null;
  }
  return createEstimatedTrainState(estimation);
}