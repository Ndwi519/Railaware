const ProviderInterpreter = require('../domain/contracts/ProviderInterpreter.js');
const { createObservation } = require('../domain/models/Observation.js');
const { createTrain } = require('../domain/models/Train.js');
const { createStation } = require('../domain/models/Station.js');
const { createSegment } = require('../domain/models/Segment.js');
const { TrainStatus } = require('../domain/types/enums.js');

class RailRadarProviderInterpreter extends ProviderInterpreter {
  /**
   * Translates a raw provider payload into a normalized Observation.
   * Enforces strict schema mapping without inference or smoothing.
   * 
   * @param {import('../domain/models/ProviderSnapshot').ProviderSnapshot} snapshot
   * @returns {import('../domain/models/Observation').Observation}
   */
  interpret(snapshot) {
    if (!snapshot || !snapshot.rawJson || typeof snapshot.rawJson !== 'object') {
      throw new Error('Invalid or missing snapshot payload');
    }

    const payload = snapshot.rawJson;

    // Train Mapping
    const trainData = payload.train || {};
    const train = createTrain({
      number: trainData.number || 'UNKNOWN',
      name: trainData.name || 'UNKNOWN',
      startDate: trainData.startDate || 'UNKNOWN'
    });

    // Status Mapping (strictly from enum or default to UNKNOWN)
    let status = TrainStatus.UNKNOWN;
    if (payload.status) {
      const normalizedStatus = payload.status.toLowerCase().trim();
      if (Object.values(TrainStatus).includes(normalizedStatus)) {
        status = normalizedStatus;
      }
    }

    // Topology Mapping
    const currentLocation = payload.currentLocation || {};
    
    // Explicitly prohibit smoothing or inference. If absent, set null.
    let segmentProgress = null;
    if (typeof currentLocation.segmentProgress === 'number') {
      segmentProgress = currentLocation.segmentProgress;
    }

    let currentSegment = null;
    if (currentLocation.previousStation) {
      const prevStation = createStation({ 
        code: currentLocation.previousStation,
        name: currentLocation.previousStationName || currentLocation.previousStation
      });
      
      const nextStation = currentLocation.nextStation ? createStation({
        code: currentLocation.nextStation,
        name: currentLocation.nextStationName || currentLocation.nextStation
      }) : null;
      
      currentSegment = createSegment({
        previousStation: prevStation,
        nextStation: nextStation
      });
    }

    // Delay Mapping
    let delayMinutes = null;
    if (typeof payload.delayMinutes === 'number') {
      delayMinutes = payload.delayMinutes;
    }

    // Time Mapping
    let lastUpdatedAt = null;
    if (payload.lastUpdatedAt) {
      const parsedDate = new Date(payload.lastUpdatedAt);
      if (!isNaN(parsedDate.getTime())) {
        lastUpdatedAt = parsedDate;
      }
    }

    // Return the immutable Observation model directly.
    return createObservation({
      id: snapshot.id,
      train,
      status,
      segmentProgress,
      currentSegment,
      delayMinutes,
      lastUpdatedAt,
      recordedAt: snapshot.capturedAt || new Date()
    });
  }
}

module.exports = RailRadarProviderInterpreter;
