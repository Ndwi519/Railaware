const TrainDiscoveryService = require('../services/TrainDiscoveryService.js');
const RailAwareService = require('../services/RailAwareService.js');
const LegacyApiMapper = require('../mappers/LegacyApiMapper.js');

// Core Domain implementations
const RailRadarProviderInterpreter = require('../../provider-railradar/RailRadarProviderInterpreter.js');
const InMemoryObservationStore = require('../../observation-store/InMemoryObservationStore.js');
const RailAwareConfidenceEngine = require('../../confidence-engine/RailAwareConfidenceEngine.js');
const RailAwareRiskEngine = require('../../risk-engine/RailAwareRiskEngine.js');
const RailAwareRecommendationEngine = require('../../recommendation-engine/RailAwareRecommendationEngine.js');

// Legacy infrastructural engines (required by TrainDiscoveryService)
const { OverpassClient } = require('../../corridor-resolver/overpass.js');
const { CorridorResolver } = require('../../corridor-resolver/resolver.js');
const { RailRadarProvider } = require('../../provider/railradar.js');
const { StationResolutionEngine } = require('../../station-resolution-engine/index.js');
const { OsmRouteRelationsStrategy } = require('../../station-resolution-engine/strategies/osm-route-relations.js');
const { OsmRelationMembersStrategy } = require('../../station-resolution-engine/strategies/osm-relation-members.js');
const { RailRadarRouteGeometryStrategy } = require('../../station-resolution-engine/strategies/railradar-route-geometry.js');
const { OfflineGraphStrategy } = require('../../station-resolution-engine/strategies/offline-graph.js');
const { GeometricProjectionStrategy } = require('../../station-resolution-engine/strategies/geometric-projection.js');

const { DEFAULT_THRESHOLDS, GEOMETRIC_PROJECTION_CONSTRAINTS } = require('../../config/thresholds.js');

let instance = null;

function createRailAwareService(config) {
  // Enforce singleton instantiation
  if (instance) return instance;

  // 1. Initialize Legacy Infrastructure
  const overpassClient = new OverpassClient(config.overpass);
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
  const store = new InMemoryObservationStore(100); 
  const confidenceEngine = new RailAwareConfidenceEngine();
  const riskEngine = new RailAwareRiskEngine();
  const recommendationEngine = new RailAwareRecommendationEngine();
  
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

  const mapper = new LegacyApiMapper();
  const discoveryService = new TrainDiscoveryService(corridorResolver, stationResolutionEngine, strategyManager, discoveryMappers);

  // 4. Inject Dependencies into Orchestrator
  instance = new RailAwareService({
    discoveryService,
    provider: railRadarProvider,
    interpreter,
    store,
    confidenceEngine,
    riskEngine,
    recommendationEngine,
    mapper
  });

  return instance;
}

module.exports = { createRailAwareService };
