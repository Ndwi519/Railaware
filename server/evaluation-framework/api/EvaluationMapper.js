class EvaluationMapper {
  /**
   * Structurally sanitizes the pipelineResult, explicitly whitelisting
   * fields to enforce the Evaluation Framework trust boundary.
   *
   * @param {Object} pipelineResult The raw ApplicationResult from RailAwareService
   * @returns {Object} Safely mapped Evaluation DTO
   */
  static mapResult(pipelineResult) {
    if (!pipelineResult) {
      return null;
    }

    if (pipelineResult.error) {
      return {
        error: pipelineResult.error
      };
    }

    // Explicitly construct the DTO to avoid spreading unexpected/internal structures
    const dto = {
      observation: null,
      confidence: null,
      awareness: null,
      assistance: null,
      discoveryContext: null
    };

    if (pipelineResult.observation) {
      dto.observation = {
        latitude: pipelineResult.observation.latitude,
        longitude: pipelineResult.observation.longitude,
        timestamp: pipelineResult.observation.timestamp,
        speedKmph: pipelineResult.observation.speedKmph
      };
    }

    if (pipelineResult.confidence) {
      dto.confidence = {
        level: pipelineResult.confidence.level,
        topologyConfidence: pipelineResult.confidence.topologyConfidence,
        observationConfidence: pipelineResult.confidence.observationConfidence,
        providerReliability: pipelineResult.confidence.providerReliability,
        reasons: pipelineResult.confidence.reasons ? [...pipelineResult.confidence.reasons] : [],
        assessedAt: pipelineResult.confidence.assessedAt
      };
    }

    if (pipelineResult.awareness) {
      dto.awareness = {
        status: pipelineResult.awareness.status,
        trainAlongTrackDistanceMetres: pipelineResult.awareness.trainAlongTrackDistanceMetres,
        userAlongTrackDistanceMetres: pipelineResult.awareness.userAlongTrackDistanceMetres,
        distanceMetres: pipelineResult.awareness.distanceMetres,
        direction: pipelineResult.awareness.direction,
        approaching: pipelineResult.awareness.approaching,
        observationConfidence: pipelineResult.awareness.observationConfidence,
        providerReliability: pipelineResult.awareness.providerReliability,
        lastUpdatedAt: pipelineResult.awareness.lastUpdatedAt,
        explanation: pipelineResult.awareness.explanation,
        requiresProminentDisplay: pipelineResult.awareness.requiresProminentDisplay
      };
    }

    if (pipelineResult.assistance) {
      dto.assistance = {
        type: pipelineResult.assistance.type,
        message: pipelineResult.assistance.message,
        actions: pipelineResult.assistance.actions ? [...pipelineResult.assistance.actions] : []
      };
    }

    if (pipelineResult.discoveryContext) {
      dto.discoveryContext = {
        trainTarget: pipelineResult.discoveryContext.trainTarget,
        providerError: pipelineResult.discoveryContext.providerError,
        discoveredTrains: pipelineResult.discoveryContext.discoveredTrains ? [...pipelineResult.discoveryContext.discoveredTrains] : [],
        strategyDiagnostics: pipelineResult.discoveryContext.strategyDiagnostics ? [...pipelineResult.discoveryContext.strategyDiagnostics] : [],
        trace: pipelineResult.discoveryContext.trace || null
      };

      if (pipelineResult.discoveryContext.journey) {
        dto.discoveryContext.journey = {
          targetStation: pipelineResult.discoveryContext.journey.targetStation,
          route: pipelineResult.discoveryContext.journey.route ? [...pipelineResult.discoveryContext.journey.route] : []
        };
      }
    }

    return dto;
  }
}

module.exports = EvaluationMapper;
