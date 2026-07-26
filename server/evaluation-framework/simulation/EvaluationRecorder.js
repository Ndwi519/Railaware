class EvaluationRecorder {
  constructor() {
    this.records = [];
  }

  /**
   * Records a snapshot of objective truth alongside the system's subjective interpretation.
   * Does NOT compute metrics; only acts as a ledger.
   * @param {Object} tick The simulation tick (contains scenario truth and simulated provider payload)
   * @param {Object} pipelineResult The ApplicationResult produced by RailAwareService
   */
  record(tick, pipelineResult) {
    this.records.push({
      timeOffsetMs: tick.timeOffsetMs,
      truth: tick.truth,
      providerData: tick.providerData,
      userLocation: tick.userLocation,
      pipelineResult // contains { observation, confidence, awareness, assistance, discoveryContext }
    });
  }

  getRecords() {
    return this.records;
  }
}

module.exports = EvaluationRecorder;
