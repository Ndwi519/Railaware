const TrainDiscoveryService = require('../services/TrainDiscoveryService.js');
const RailAwareService = require('../services/RailAwareService.js');

// Core Domain implementations
const RailRadarProviderInterpreter = require('../../provider-railradar/RailRadarProviderInterpreter.js');
const RailRadarObservationProvider = require('../../provider-railradar/RailRadarObservationProvider.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');
const RailAwareConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const RailAwareAwarenessEngine = require('../../awareness-engine/RailAwareAwarenessEngine.js');
const RailAwareAssistanceEngine = require('../../assistance-engine/RailAwareAssistanceEngine.js');

// Legacy infrastructural engines (required by TrainDiscoveryService)
const { SpatialProviderManager } = require('../../corridor-resolver/SpatialProviderManager.js');
const { CorridorResolver } = require('../../corridor-resolver/resolver.js');
const { RailRadarProvider } = require('../../provider/railradar.js');
const { StationResolutionEngine } = require('../../station-resolution-engine/index.js');
const { OsmRouteRelationsStrategy } = require('../../station-resolution-engine/strategies/osm-route-relations.js');
const { OsmRelationMembersStrategy } = require('../../station-resolution-engine/strategies/osm-relation-members.js');
const { RailRadarRouteGeometryStrategy } = require('../../station-resolution-engine/strategies/railradar-route-geometry.js');
const { OfflineGraphStrategy } = require('../../station-resolution-engine/strategies/offline-graph.js');
const { GeometricProjectionStrategy } = require('../../station-resolution-engine/strategies/geometric-projection.js');

const { DEFAULT_THRESHOLDS, GEOMETRIC_PROJECTION_CONSTRAINTS } = require('../../config/thresholds.js');

function createRailAwareService(config) {

  // 1. Initialize Legacy Infrastructure
  const overpassClient = config.overpassClient || new SpatialProviderManager(config);
  const corridorResolver = new CorridorResolver(overpassClient);
  const railRadarProvider = new RailRadarProvider(config);

  const stationResolutionEngine = new StationResolutionEngine([
    new OsmRouteRelationsStrategy(),
    new OsmRelationMembersStrategy(),
    new RailRadarRouteGeometryStrategy(),
    new OfflineGraphStrategy(),
    new GeometricProjectionStrategy({
      maximumProjectionDistanceMetres: GEOMETRIC_PROJECTION_CONSTRAINTS.maximumProjectionDistanceMetres,
      maximumAlongTrackGapMetres: GEOMETRIC_PROJECTION_CONSTRAINTS.maximumAlongTrackGapMetres,
      minimumStationCount: GEOMETRIC_PROJECTION_CONSTRAINTS.minimumStationCount,
      minimumCorridorCoverage: GEOMETRIC_PROJECTION_CONSTRAINTS.minimumCorridorCoverage
    })
  ]);

  // 2. Initialize Domain Engines
  const interpreter = new RailRadarProviderInterpreter();
  const { TrajectoryManager } = require('../services/TrajectoryManager.js');
  const store = new InMemoryObservationStore(100);
  const confidenceEngine = new RailAwareConfidenceEngine();
  const awarenessEngine = new RailAwareAwarenessEngine();
  const assistanceEngine = new RailAwareAssistanceEngine(config);
  const trajectoryManager = new TrajectoryManager();

  // 3. Initialize Strategy Manager and Register Strategies
  const TrainDiscoveryStrategyManager = require('../services/TrainDiscoveryStrategyManager.js');
  const RailRadarStrategy = require('../services/strategies/RailRadarStrategy.js');
  const RailRadarDiscoveryMapper = require('../mappers/RailRadarDiscoveryMapper.js');

  const strategyManager = new TrainDiscoveryStrategyManager();

  // Register strategies explicitly with priorities
  const railRadarStrategy = new RailRadarStrategy(railRadarProvider, config.railradarMinEvidence);
  strategyManager.register(railRadarStrategy, 10);

  // Prepare discovery mappers indexed by strategy name
  const discoveryMappers = {
    [railRadarStrategy.id()]: new RailRadarDiscoveryMapper()
  };

  const { inferDirection } = require('../../directional-inference/DirectionalInference.js');
  const { BranchEvidenceBuilder } = require('../../route-selection/BranchEvidenceBuilder.js');
  const { RouteSelection } = require('../../route-selection/RouteSelection.js');
  const { RouteContextBuilder } = require('../../route-selection/RouteContextBuilder.js');

  const discoveryService = new TrainDiscoveryService({
    corridorResolver,
    stationResolver: stationResolutionEngine,
    strategyManager,
    discoveryMappers,
    directionalInference: { inferDirection },
    branchEvidenceBuilder: new BranchEvidenceBuilder(),
    routeSelection: new RouteSelection(),
    routeContextBuilder: new RouteContextBuilder()
  });

  // 3.5 Create ObservationProvider Adapter
  const observationProvider = new RailRadarObservationProvider(railRadarProvider, interpreter);

  // 4. Inject Dependencies into Orchestrator
  const instance = new RailAwareService({
    discoveryService,
    provider: observationProvider,
    store,
    confidenceEngine,
    awarenessEngine,
    assistanceEngine,
    trajectoryManager
  });

  return instance;
}

module.exports = { createRailAwareService };
