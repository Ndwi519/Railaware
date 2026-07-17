class LegacyApiMapper {
  /**
   * Translates the strictly bounded application result back into the 
   * JSON format expected by the legacy frontend.
   */
  map(applicationResult) {
    const { observation, risk, recommendation, discoveryContext } = applicationResult;
    
    // Extract new situational awareness payload defensively
    const awareness =
      applicationResult.awareness ??
      applicationResult.risk?.awareness ??
      null;

    // Legacy Risk Fallback
    let legacyRisk = null;
    if (risk) {
        legacyRisk = {
            level: risk.level.toLowerCase(),
            reasons: risk.reasons || []
        };
        if (recommendation) {
            legacyRisk.explanation = recommendation.directive;
            legacyRisk.recommendedAction = recommendation.userAction;
        }
    }

    // Legacy Observation Fallback
    let legacyObservation = null;

    if (observation) {
        legacyObservation = {
            trainId: observation.train.number,
            status: observation.status,
            segmentProgress: observation.segmentProgress,
            previousStation: observation.currentSegment ? observation.currentSegment.previousStation.code : null,
            nextStation: (observation.currentSegment && observation.currentSegment.nextStation) ? observation.currentSegment.nextStation.code : null,
            delayMinutes: observation.delayMinutes,
            lastUpdatedAt: observation.lastUpdatedAt,
            nearbyTrains: discoveryContext ? discoveryContext.discoveredTrains : []
        };
    }

    // Extract canonical diagnostics from the StrategyManager
    const diagnostics = discoveryContext?.strategyDiagnostics || [];
    
    // Group them for legacy fallback format if required by UI, but do not invent any data
    const providerRequests = diagnostics
      .filter(d => d.stage === 'Provider Request')
      .map(d => ({
        endpoint: d.providerRequest?.endpoint || null,
        status: d.status,
        responseSummary: d.providerRequest?.summary || d.reason || null
      }));

    // The legacy UI expects stationResolution to contain status and attempts
    const stationResolution = discoveryContext?.corridor?.stationResolutionDetails || null;

    return {
      observation: legacyObservation,
      risk: legacyRisk,
      awareness,
      corridor: discoveryContext ? discoveryContext.corridor : null,
      trains: discoveryContext ? discoveryContext.discoveredTrains : [],
      metadata: { 
        providerError: (discoveryContext && discoveryContext.providerError) ? discoveryContext.providerError : null,
        executionTrace: { stages: diagnostics },
        diagnostics: {
          providerRequests,
          stationResolution,
          riskReasons: risk ? risk.reasons : []
        }
      }
    };
  }
}

module.exports = LegacyApiMapper;
