const ObservationProvider = require('../../domain/contracts/ObservationProvider.js');
const { createTrainObservation } = require('../../domain/models/TrainObservation.js');
const { createTrain } = require('../../domain/models/Train.js');

class MockObservationProvider extends ObservationProvider {
  constructor() {
    super();
    this.currentData = null;
    this.trainTarget = null;
  }

  setProviderData(trainTarget, data) {
    this.trainTarget = trainTarget;
    this.currentData = data;
  }

  async getTrainObservation(trainTarget) {
    if (trainTarget !== this.trainTarget || !this.currentData) {
      throw new Error(`Provider explicitly unavailable or no data mocked for train ${trainTarget}`);
    }

    const { status, currentLocation, previousHalt, nextHalt, segmentProgress, delayMinutes, validationErrors } = this.currentData;

    let currentSegment = null;
    if (previousHalt || nextHalt) {
      currentSegment = {
        previousStation: previousHalt ? { code: previousHalt.stationCode } : null,
        nextStation: nextHalt ? { code: nextHalt.stationCode } : null
      };
    } else if (currentLocation) {
      // Degenerate segment pointing to current location
      currentSegment = {
        previousStation: { code: currentLocation.stationCode },
        nextStation: { code: currentLocation.stationCode }
      };
    }

    return createTrainObservation({
      id: `mock-${Date.now()}`,
      train: createTrain({
        number: trainTarget,
        name: 'Simulated Train',
        startDate: new Date().toISOString().split('T')[0]
      }),
      status,
      recordedAt: new Date(),
      currentSegment,
      segmentProgress: segmentProgress || (currentLocation ? 0 : null),
      delayMinutes,
      validationErrors
    });
  }
}

module.exports = MockObservationProvider;
