class ReportGenerator {
  /**
   * Generates a structured evaluation report from raw metrics
   * @param {Object} scenario The scenario that was executed
   * @param {Object} metrics The raw metrics from MetricsEngine
   * @returns {Object} Structured report suitable for API or markdown
   */
  generate(scenario, metrics) {
    const calcMean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const calcMax = (arr) => arr.length ? Math.max(...arr) : null;

    const report = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      timestamp: new Date().toISOString(),
      summary: {
        performance: {
          meanObservationAgeSec: calcMean(metrics.performance.observationAge),
          maxObservationAgeSec: calcMax(metrics.performance.observationAge),
          meanAwarenessLatencySec: calcMean(metrics.performance.awarenessLatency)
        },
        accuracy: {
          meanPositionErrorMetres: calcMean(metrics.accuracy.positionError),
          maxPositionErrorMetres: calcMax(metrics.accuracy.positionError)
        },
        behaviour: {
          falsePositives: metrics.behaviour.falsePositives,
          falseNegatives: metrics.behaviour.falseNegatives
        }
      },
      raw: metrics
    };

    return report;
  }

  /**
   * Converts a structured report into markdown
   */
  toMarkdown(report) {
    return `
# Evaluation Report: ${report.scenarioName}
**Date:** ${report.timestamp}

## Performance Metrics
- **Mean Observation Age:** ${report.summary.performance.meanObservationAgeSec !== null ? report.summary.performance.meanObservationAgeSec.toFixed(2) + 's' : 'N/A'}
- **Max Observation Age:** ${report.summary.performance.maxObservationAgeSec !== null ? report.summary.performance.maxObservationAgeSec.toFixed(2) + 's' : 'N/A'}
- **Mean Awareness Latency:** ${report.summary.performance.meanAwarenessLatencySec !== null ? report.summary.performance.meanAwarenessLatencySec.toFixed(3) + 's' : 'N/A'}

## Accuracy Metrics
- **Mean Position Error:** ${report.summary.accuracy.meanPositionErrorMetres !== null ? report.summary.accuracy.meanPositionErrorMetres.toFixed(1) + 'm' : 'N/A'}
- **Max Position Error:** ${report.summary.accuracy.maxPositionErrorMetres !== null ? report.summary.accuracy.maxPositionErrorMetres.toFixed(1) + 'm' : 'N/A'}

## Behaviour Metrics
- **False Negatives (Missed Awareness):** ${report.summary.behaviour.falseNegatives}
- **False Positives (Nuisance Alerts):** ${report.summary.behaviour.falsePositives}
    `.trim();
  }
}

module.exports = ReportGenerator;
