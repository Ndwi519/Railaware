const turf = require('@turf/turf');

class MetricsEngine {
  /**
   * Calculates metrics for a scenario execution based on ADR 0007
   * @param {Object} scenario The scenario definition
   * @param {Array} records The recorded outputs from EvaluationRecorder
   * @returns {Object} The metrics report
   */
  calculate(scenario, records) {
    const report = {
      performance: {
        observationAge: [],
        awarenessLatency: []
      },
      accuracy: {
        positionError: []
      },
      behaviour: {
        falsePositives: 0,
        falseNegatives: 0
      }
    };

    // Build the turf linestring for geographic projection of along-track distance
    let trackLine = null;
    if (scenario.corridorData && scenario.corridorData.route && scenario.corridorData.route.length > 0) {
      // In turf, coords are [lng, lat]
      const coords = scenario.corridorData.route.map(pt => [pt.lng, pt.lat]);
      if (coords.length > 1) {
        trackLine = turf.lineString(coords);
      }
    }

    records.forEach(record => {
      const { truth, pipelineResult, providerData } = record;

      // 1. Performance Metrics
      if (providerData && providerData.delayMinutes !== undefined) {
        // Mock provider data uses delayMinutes directly, we simulate the ObservationAge metric
        report.performance.observationAge.push(providerData.delayMinutes * 60);
      }

      // We simulate awarenessLatency as the trace duration of the pipeline
      if (pipelineResult.discoveryContext && pipelineResult.discoveryContext.trace) {
        const trace = pipelineResult.discoveryContext.trace;
        const totalMs = trace.stages.reduce((acc, stage) => Math.max(acc, stage.elapsedTimeMs), 0);
        report.performance.awarenessLatency.push(totalMs / 1000); // Seconds
      }

      // 2. Accuracy Metrics
      const estState = pipelineResult.awareness?._internal_estimations; // We might need to fetch this or rely on distanceMetres
      // Let's get geographic estimation if available
      if (trackLine && pipelineResult.awareness && pipelineResult.awareness.trainAlongTrackDistanceMetres != null) {
        // Turf along expects kilometres
        const estPoint = turf.along(trackLine, pipelineResult.awareness.trainAlongTrackDistanceMetres / 1000, { units: 'kilometers' });
        const truthPoint = turf.point([truth.location.lng, truth.location.lat]);
        const positionError = turf.distance(truthPoint, estPoint, { units: 'kilometers' }) * 1000; // in metres
        report.accuracy.positionError.push(positionError);
      } else {
        // If we can't geographically project it, we can't calculate PositionError for this tick
      }

      // 3. Behaviour Metrics
      const truthState = truth.groundTruthAwarenessState;
      const sysState = pipelineResult.awareness ? pipelineResult.awareness.status : 'UNKNOWN';

      const isTruthDanger = ['APPROACHING_STATION', 'AT_STATION'].includes(truthState);
      const isSysDanger = ['APPROACHING_STATION', 'AT_STATION'].includes(sysState);

      if (isTruthDanger && !isSysDanger) {
        report.behaviour.falseNegatives++;
      }
      if (isSysDanger && !isTruthDanger) {
        report.behaviour.falsePositives++;
      }
    });

    return report;
  }
}

module.exports = MetricsEngine;
