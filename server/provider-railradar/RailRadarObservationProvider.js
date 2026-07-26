const ObservationProvider = require('../domain/contracts/ObservationProvider.js');
const { createProviderSnapshot } = require('../domain/models/ProviderSnapshot.js');

/**
 * @module provider-railradar/RailRadarObservationProvider
 * @responsibility Adapts the RailRadar API client to the canonical ObservationProvider contract.
 */
class RailRadarObservationProvider extends ObservationProvider {
  constructor(railRadarProvider, interpreter) {
    super();
    this.provider = railRadarProvider;
    this.interpreter = interpreter;
  }

  async getTrainObservation(trainTarget) {
    try {
      const liveData = await this.provider.getLiveTrainProgress(trainTarget);

      const snapshot = createProviderSnapshot({
        id: `snap-${Date.now()}`,
        rawJson: liveData ? {
          train: { number: liveData.id },
          status: liveData.status,
          currentLocation: {
            previousStation: liveData.previousStation,
            nextStation: liveData.nextStation,
            segmentProgress: liveData.segmentProgress
          },
          isActualPosition: liveData.isActualPosition,
          lastUpdatedAt: liveData.lastUpdatedAt
        } : {},
        metadata: { httpStatusCode: 200, timestamp: new Date().toISOString() },
        capturedAt: new Date()
      });

      return this.interpreter.interpret(snapshot);
    } catch (e) {
      throw e;
    }
  }
}

module.exports = RailRadarObservationProvider;
