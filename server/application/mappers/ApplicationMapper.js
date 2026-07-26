class ApplicationMapper {
  static toObservationResponse(pipelineResult) {
    if (!pipelineResult) return null;

    const { observation, confidence, awareness, assistance, discoveryContext } = pipelineResult;

    let trains = null;
    let error = null;

    if (discoveryContext) {
      if (discoveryContext.providerError) {
        error = discoveryContext.providerError;
      }

      if (discoveryContext.discoveredTrains) {
        trains = discoveryContext.discoveredTrains.map(t => ({
          trainNumber: t.trainNumber,
          trainName: t.trainName,
          status: t.status,
          distance: t.distance,
          lastUpdated: t.lastUpdated
        }));
      }
    }

    return {
      observation: observation ? {
        lat: observation.lat,
        lng: observation.lng,
        timestamp: observation.timestamp,
        sessionId: observation.sessionId
      } : null,
      confidence: confidence ? {
        level: confidence.level,
        score: confidence.score,
        reasons: confidence.reasons || []
      } : null,
      awareness: awareness ? {
        level: awareness.level,
        description: awareness.description
      } : null,
      assistance: assistance ? {
        instruction: assistance.instruction,
        urgency: assistance.urgency,
        emergencyMode: assistance.emergencyMode || false
      } : null,
      trains,
      error
    };
  }
}

module.exports = ApplicationMapper;
