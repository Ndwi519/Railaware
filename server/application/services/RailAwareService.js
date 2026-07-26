const {
  estimateTrainAwareness
} = require('../../awareness-engine/TrainEstimator.js');

const {
  createTrainObservation
} = require('../../domain/models/TrainObservation.js');
const {
  createTrain
} = require('../../domain/models/Train.js');
const {
  createConfidenceAssessment
} = require('../../domain/models/ConfidenceAssessment.js');
const {
  ConfidenceLevel,
  TrainStatus
} = require('../../domain/types/enums.js');
class RailAwareService {
  constructor({
    discoveryService,
    provider,
    interpreter,
    store,
    confidenceEngine,
    awarenessEngine,
    assistanceEngine,
    trajectoryManager
  }) {
    this.discoveryService = discoveryService;
    this.provider = provider;
    this.store = store;
    this.confidenceEngine = confidenceEngine;
    this.awarenessEngine = awarenessEngine;
    this.assistanceEngine = assistanceEngine;
    this.trajectoryManager = trajectoryManager;
  }

  /**
   * Orchestrates the evaluation of a location through the independent domain engines.
   */
  async evaluateLocation(sessionId, lat, lng) {
    const trace = {
      stages: [],
      startTime: Date.now()
    };
    const addTrace = (stage, status, decision, reason, metadata = {}) => {
      trace.stages.push({
        stage,
        status,
        elapsedTimeMs: Date.now() - trace.startTime,
        decision,
        reason,
        ...metadata
      });
    };
    addTrace('GPS Acquisition', 'SUCCESS', 'Proceed', 'Coordinates received', {
      input: {
        lat,
        lng
      }
    });

    // 1. Discover Context (Train/Journey)
    let discoveryContext;
    let trainTarget = null;
    let journey = null;
    try {
      const { DiscoveryContext } = require('../models/DiscoveryContext.js');
      const { observation: currentObs, sessionTrajectory } = this.trajectoryManager.recordObservation(sessionId, lat, lng);
      const routingState = this.trajectoryManager.getRoutingState(sessionId);
      const context = new DiscoveryContext({ observation: currentObs, sessionTrajectory, routingState });

      discoveryContext = await this.discoveryService.discoverTrain(context);

      if (discoveryContext.routingResult && discoveryContext.routingResult.projectionResult) {
        this.trajectoryManager.saveRoutingState(sessionId, {
          lastProjectedSegmentIndex: discoveryContext.routingResult.projectionResult.corridorSegmentIndex
        });
      }

      addTrace('Corridor Resolution', discoveryContext.corridor ? 'SUCCESS' : 'FAILED', discoveryContext.corridor ? 'Proceed' : 'Halt', discoveryContext.corridor ? 'Corridor found' : 'No track nearby');
      if (discoveryContext.corridor) {
        addTrace('Station Resolution', discoveryContext.corridor.stationResolutionDetails?.status === 'RESOLVED' ? 'SUCCESS' : 'FAILED', discoveryContext.corridor.stationResolutionDetails?.status === 'RESOLVED' ? 'Proceed' : 'Halt Train Discovery', discoveryContext.corridor.stationResolutionDetails?.status === 'RESOLVED' ? 'Stations bounded' : 'Provider/dataset limit prevents topological bounding');
      }
      trainTarget = discoveryContext.trainTarget;
      journey = discoveryContext.journey;
    } catch (e) {
      // Overpass 429/504 or other discovery failure
      const awareness = Object.freeze({
        status: 'UNKNOWN',
        trainAlongTrackDistanceMetres: null,
        userAlongTrackDistanceMetres: null,
        distanceMetres: null,
        direction: null,
        approaching: null,
        observationConfidence: ConfidenceLevel.UNKNOWN,
        providerReliability: ConfidenceLevel.UNASSESSED,
        lastUpdatedAt: new Date(),
        explanation: '[Engineering decision] API unavailable, cannot resolve topology.',
        requiresProminentDisplay: false
      });
      const confidence = createConfidenceAssessment({
        level: ConfidenceLevel.UNKNOWN,
        topologyConfidence: ConfidenceLevel.UNKNOWN,
        observationConfidence: ConfidenceLevel.UNKNOWN,
        providerReliability: ConfidenceLevel.UNASSESSED,
        reasons: ['[Engineering decision] Provider discovery timeout/rate limit'],
        assessedAt: new Date()
      });
      if (discoveryContext && discoveryContext.strategyDiagnostics) {
        discoveryContext.strategyDiagnostics.forEach(d => addTrace(d.strategy, d.status, 'Discovery', d.reason, {
          elapsedTimeMs: d.elapsedTimeMs,
          providerRequests: d.providerRequests
        }));
      }
      return {
        observation: null,
        confidence,
        awareness,
        assistance: this.assistanceEngine.generateAssistance(awareness),
        discoveryContext: {
          trainTarget: null,
          journey: null,
          corridor: null,
          discoveredTrains: null,
          providerError: e.message,
          strategyDiagnostics: [],
          trace
        }
      };
    }
    if (!trainTarget) {
      // Early exit if no trains found or off-corridor
      if (discoveryContext && discoveryContext.strategyDiagnostics) {
        discoveryContext.strategyDiagnostics.forEach(d => addTrace(d.strategy, d.status, 'Discovery', d.reason, {
          elapsedTimeMs: d.elapsedTimeMs,
          providerRequests: d.providerRequests
        }));
      }
      discoveryContext.trace = trace;
      if (!discoveryContext.corridor) {
        // Correctly return null awareness if user is not on a corridor (trackPresence == false)
        return {
          observation: null,
          confidence: null,
          awareness: null,
          assistance: this.assistanceEngine.generateAssistance(null),
          discoveryContext
        };
      }

      // We have a track (corridor present) but no train. We must not return awareness: null.
      // ADR-002: a lack of evidence of a train is never interpreted as an all-clear awareness state.
      // Zero trains returned by the provider is a negative result, not a positive confirmation of an empty track.
      // Both UNRESOLVED topology and RESOLVED+zero-trains must therefore produce UNKNOWN awareness.
      // The two states are distinguished via confidence and observation.status.
      const isResolved = discoveryContext.corridor.stationResolutionDetails?.status === 'RESOLVED';
      const topologyConfidence = discoveryContext.corridor.stationResolutionDetails?.confidence || ConfidenceLevel.UNKNOWN;
      const observationConfidence = ConfidenceLevel.NOT_APPLICABLE;
      const observation = createTrainObservation({
        id: 'no-train-discovered',
        train: createTrain({
          number: isResolved ? 'NONE' : 'UNKNOWN',
          name: 'UNKNOWN',
          startDate: 'UNKNOWN'
        }),
        status: isResolved ? TrainStatus.NOT_STARTED : TrainStatus.UNKNOWN,
        recordedAt: new Date(),
        validationErrors: isResolved ? [] : ['[Engineering decision] No train target identified on the requested corridor']
      });
      const confidence = createConfidenceAssessment({
        level: isResolved ? ConfidenceLevel.HIGH : ConfidenceLevel.UNKNOWN,
        topologyConfidence,
        observationConfidence,
        providerReliability: ConfidenceLevel.UNASSESSED,
        reasons: isResolved ? ['[Implementation policy] Track resolved with empty result set returned'] : ['[Engineering decision] No train target identified'],
        assessedAt: new Date()
      });

      // Integrate TrainEstimator for Case A / Case B
      const estimation = estimateTrainAwareness(journey, observation, discoveryContext.corridor);

      // The AwarenessEngine enforces UNKNOWN confidence → UNKNOWN awareness.
      // Both paths correctly produce UNKNOWN awareness, satisfying ADR-002 and AGENTS.md Rule 10.
      const awareness = this.awarenessEngine.evaluate(journey, observation, confidence, estimation);
      return {
        observation,
        confidence,
        awareness,
        assistance: this.assistanceEngine.generateAssistance(awareness),
        discoveryContext
      };
    }

    // 2. Fetch Live Status Payload
    let observation = null;
    try {
      if (discoveryContext && discoveryContext.strategyDiagnostics) {
        discoveryContext.strategyDiagnostics.forEach(d => addTrace(d.strategy, d.status, 'Discovery', d.reason, {
          elapsedTimeMs: d.elapsedTimeMs,
          providerRequests: d.providerRequests
        }));
      }
      observation = await this.provider.getTrainObservation(trainTarget);
      addTrace('ObservationProvider', 'SUCCESS', 'Proceed', 'Fetched TrainObservation');
    } catch (e) {
      addTrace('ObservationProvider', 'FAILED', 'Fallback', e.message);
      // Fallback observation tracking explicit validation errors
      observation = createTrainObservation({
        id: `fallback-${Date.now()}`,
        train: createTrain({
          number: trainTarget,
          name: 'UNKNOWN',
          startDate: 'UNKNOWN'
        }),
        status: 'unknown',
        recordedAt: new Date(),
        validationErrors: [e.message]
      });
    }

    // 4. Update and Retrieve Store History
    await this.store.save(observation);
    const history = await this.store.history(observation.train.number);

    // 5. Evaluate Confidence
    const obsConfAssessment = this.confidenceEngine.evaluate(observation, history);
    const observationConfidence = obsConfAssessment.level;
    const topologyConfidence = discoveryContext.corridor?.stationResolutionDetails?.confidence || ConfidenceLevel.UNKNOWN;

    // We update the topologyConfidence in the final assessment
    const confidence = createConfidenceAssessment({
      level: observationConfidence,
      topologyConfidence,
      observationConfidence,
      providerReliability: obsConfAssessment.providerReliability || ConfidenceLevel.UNASSESSED,
      reasons: obsConfAssessment.reasons,
      assessedAt: new Date()
    });

    // Integrate TrainEstimator for Case C
    const estimation = estimateTrainAwareness(journey, observation, discoveryContext.corridor);

    // 6. Evaluate Awareness
    const awareness = this.awarenessEngine.evaluate(journey, observation, confidence, estimation);
    addTrace('Awareness Engine', 'SUCCESS', 'Finalize', 'Evaluated awareness', {
      status: awareness ? awareness.status : 'UNKNOWN'
    });
    discoveryContext.trace = trace;

    // 7. Return strictly bounded ApplicationResult
    return {
      observation,
      confidence,
      awareness,
      assistance: this.assistanceEngine.generateAssistance(awareness),
      discoveryContext
    };
  }
}
module.exports = RailAwareService;