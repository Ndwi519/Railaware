const RailAwareService = require('../../application/services/RailAwareService.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');
const ConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const AwarenessEngine = require('../../awareness-engine/RailAwareAwarenessEngine.js');
const AssistanceEngine = require('../../assistance-engine/RailAwareAssistanceEngine.js');
const MockObservationProvider = require('./MockObservationProvider.js');
const MockDiscoveryService = require('./MockDiscoveryService.js');
const EvaluationRecorder = require('./EvaluationRecorder.js');

class SimulationRunner {
  constructor() {
    this.provider = new MockObservationProvider();
    this.discoveryService = new MockDiscoveryService();
    this.store = new InMemoryObservationStore(100);

    // We instantiate the engines directly to ensure isolation from production instance
    this.confidenceEngine = new ConfidenceEngine();
    this.awarenessEngine = new AwarenessEngine();
    this.assistanceEngine = new AssistanceEngine();

    this.railAwareService = new RailAwareService({
      discoveryService: this.discoveryService,
      provider: this.provider,
      store: this.store,
      confidenceEngine: this.confidenceEngine,
      awarenessEngine: this.awarenessEngine,
      assistanceEngine: this.assistanceEngine,
      interpreter: null // Will be handled internally if needed, or by MockProvider
    });
  }

  /**
   * Executes a scenario deterministically.
   * Orchestration only; does not record results.
   * @param {Object} scenario The scenario definition
   * @param {EvaluationRecorder} recorder The injected recorder
   */
  async executeScenario(scenario, recorder) {
    this.discoveryService.setContext(scenario.trainTarget, scenario.corridorData);

    for (const tick of scenario.ticks) {
      // Set the provider's mock data for this tick
      if (tick.providerData) {
        this.provider.setProviderData(scenario.trainTarget, tick.providerData);
      } else {
        this.provider.setProviderData(scenario.trainTarget, null);
      }

      // Execute the production pipeline
      let pipelineResult;
      try {
        pipelineResult = await this.railAwareService.evaluateLocation('sim-session', tick.userLocation.lat, tick.userLocation.lng);
      } catch (error) {
        pipelineResult = { error: error.message };
      }

      // Pass the objective truth and the subjective pipeline result to the recorder
      recorder.record(tick, pipelineResult);
    }
  }
}

module.exports = SimulationRunner;
