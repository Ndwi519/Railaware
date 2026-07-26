/**
 * @module domain/contracts/ObservationProvider
 * @responsibility Strictly defines the boundary for all data providers.
 *
 * Providers must acquire data, parse it, and map it exactly into a TrainObservation.
 * They are forbidden from performing estimation, awareness generation, or confidence assessment.
 */
class ObservationProvider {
  /**
   * Acquires the current state of a train and maps it to a canonical TrainObservation.
   * @param {string} trainTarget - The target train identifier.
   * @returns {Promise<Object>} A Promise resolving to a valid TrainObservation object.
   */
  async getTrainObservation(trainTarget) {
    throw new Error('Not implemented: getTrainObservation');
  }
}

module.exports = ObservationProvider;
