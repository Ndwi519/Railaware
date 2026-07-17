/**
 * @module awareness-engine/TrainEstimator
 * @responsibility Calculate geographic distance and approach estimations for a train relative to a target station.
 * 
 * INPUTS:
 * 1. journey (Object): The user's active journey context.
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

import { ConfidenceLevel, TrainStatus } from '../domain/types/enums.js';

/**
 * Pure function to estimate train spatial properties.
 * Deterministic and fully unit-testable.
 */
function estimateTrainAwareness(journey, observation, corridor) {
  const estimation = {
    trainAlongTrackDistanceMetres: null,
    userAlongTrackDistanceMetres: null,
    distanceMetres: null,
    direction: null,
    approaching: null,
    lastUpdatedAt: observation ? observation.recordedAt : null
  };

  if (!observation || !journey) {
    return Object.freeze(estimation);
  }

  // If we have a dummy observation indicating zero trains, yield no spatial estimation
  if (!observation.currentSegment && observation.status === TrainStatus.NOT_STARTED) {
    return Object.freeze(estimation);
  }

  // Cancelled train yields no spatial estimation
  if (observation.status === TrainStatus.CANCELLED) {
    return Object.freeze(estimation);
  }

  // Missing topology / geometry
  if (!observation.currentSegment || !corridor || !corridor.stations || !Array.isArray(corridor.stations)) {
    return Object.freeze(estimation);
  }

  // Find user's station
  const targetCode = journey.targetStation.code;
  const userStationData = corridor.stations.find(s => s.feature && s.feature.station && s.feature.station.code === targetCode);
  if (!userStationData) {
    return Object.freeze(estimation);
  }
  
  const userDistance = userStationData.alongTrackDistanceMetres;
  estimation.userAlongTrackDistanceMetres = userDistance;

  // Find train's location
  const prevCode = observation.currentSegment.previousStation.code;
  const nextCode = observation.currentSegment.nextStation ? observation.currentSegment.nextStation.code : null;
  
  const prevData = corridor.stations.find(s => s.feature && s.feature.station && s.feature.station.code === prevCode);
  const nextData = nextCode ? corridor.stations.find(s => s.feature && s.feature.station && s.feature.station.code === nextCode) : null;

  if (!prevData) {
    return Object.freeze(estimation);
  }

  let trainDistance = prevData.alongTrackDistanceMetres;
  let direction = null;

  if (nextData) {
    direction = nextData.alongTrackDistanceMetres >= prevData.alongTrackDistanceMetres ? 'TOWARDS_END' : 'TOWARDS_START';
    const progress = (typeof observation.segmentProgress === 'number') ? observation.segmentProgress : 0;
    const segmentLength = nextData.alongTrackDistanceMetres - prevData.alongTrackDistanceMetres;
    trainDistance = prevData.alongTrackDistanceMetres + (segmentLength * progress);
  } else {
    direction = 'UNKNOWN'; 
  }

  estimation.trainAlongTrackDistanceMetres = Math.round(trainDistance);
  estimation.direction = direction;
  estimation.distanceMetres = Math.round(Math.abs(userDistance - trainDistance));

  if (direction === 'TOWARDS_END') {
    estimation.approaching = userDistance >= trainDistance;
  } else if (direction === 'TOWARDS_START') {
    estimation.approaching = userDistance <= trainDistance;
  } else {
    estimation.approaching = null;
  }

  return Object.freeze(estimation);
}

export { estimateTrainAwareness };
