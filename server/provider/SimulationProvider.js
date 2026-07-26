const ObservationProvider = require('../domain/contracts/ObservationProvider.js');
const { createTrainObservation } = require('../domain/models/TrainObservation.js');
const { createTrain } = require('../domain/models/Train.js');
const { TrainStatus } = require('../domain/types/enums.js');

/**
 * @module provider/SimulationProvider
 * @responsibility Simulates train movements and produces strictly compliant TrainObservation objects for evaluation.
 */
class SimulationProvider extends ObservationProvider {
  constructor(initialState = {}) {
    super();
    this.state = {
      status: TrainStatus.RUNNING,
      previousStationCode: 'SIM_A',
      nextStationCode: 'SIM_B',
      segmentProgress: 0.5,
      ...initialState
    };
  }

  /**
   * Configures the internal simulation state.
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  async getTrainObservation(trainTarget) {
    return createTrainObservation({
      id: `sim-${Date.now()}`,
      train: createTrain({
        number: trainTarget,
        name: 'Simulated Train',
        startDate: new Date().toISOString().split('T')[0]
      }),
      status: this.state.status,
      recordedAt: new Date(),
      currentSegment: {
        previousStation: { code: this.state.previousStationCode },
        nextStation: { code: this.state.nextStationCode },
      },
      segmentProgress: this.state.segmentProgress,
      delayMinutes: 0,
      validationErrors: []
    });
  }
}

module.exports = SimulationProvider;
