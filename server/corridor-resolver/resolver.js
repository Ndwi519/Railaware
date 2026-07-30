Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CorridorResolver = void 0;
var _index = require("../utils/index.js");
var _corridorGraph = require("./corridor-graph.js");
var _corridorAssembly = require("../corridor-assembly/CorridorAssembly.js");
var _projectionAdapter = require("../projection-adapter/ProjectionAdapter.js");
var _seedWayResolver = require("./SeedWayResolver.js");
var _stationMatcher = require("./station-matcher.js");
var _resolverResponseFactory = require("./ResolverResponseFactory.js");
var _thresholds = require("../config/thresholds.js");
var { CorridorResolutionResult } = require("../models/CorridorResolutionResult.js");

const log = (0, _index.createLogger)('corridor-resolver');

class CorridorResolver {
  overpass;

  constructor(overpass) {
    this.overpass = overpass;
  }

  /**
   * Orchestrates the resolution of all railway clusters within a radius.
   *
   * @param {Object} location - GPS location {lat, lng}
   * @param {number} radiusMetres - Search radius
   * @returns {Object} { assembledCorridors, nearestStation }
   */
  async resolveAllClusters(location, radiusMetres) {
    const { corridors, stations, elements } = await this.overpass.fetchNearbyRailways(location, radiusMetres);
    
    let nearestStation = null;
    let minStationDist = Infinity;
    if (stations && stations.length > 0) {
      const { haversineMetres } = require('../calculations/haversine.js');
      for (const station of stations) {
        if (station.lat && station.lon) {
          const dist = haversineMetres(location.lat, location.lng, station.lat, station.lon);
          if (dist < minStationDist) {
            minStationDist = dist;
            nearestStation = { ...station, distanceMetres: Math.round(dist) };
          }
        }
      }
    }

    if (!elements || elements.length === 0) {
      return { assembledCorridors: [], nearestStation };
    }

    const { nodeCoords, ways } = _corridorGraph.indexOverpassElements(elements);
    
    // Proximity Pre-Filter: Filter ways BEFORE clustering
    const { projectPointOntoCorridor } = require('../calculations/projection.js');
    const filteredWays = new Map();
    
    for (const [wayId, way] of ways.entries()) {
      if (way && way.nodeIds.length >= 2) {
        const points = way.nodeIds.map(id => nodeCoords.get(id)).filter(Boolean);
        if (points.length >= 2) {
          const projection = projectPointOntoCorridor(location, points);
          if (projection && projection.crossTrackDistanceMetres <= radiusMetres) {
            filteredWays.set(wayId, way);
          }
        }
      }
    }

    const graph = _corridorGraph.buildWayConnectivityGraph(filteredWays);
    
    const clusters = [];
    const visitedWayIds = new Set();
    
    for (const wayId of filteredWays.keys()) {
      if (!visitedWayIds.has(wayId)) {
        const connectedComponent = _corridorGraph.findConnectedWays(wayId, graph);
        // Only include wayIds that are actually in filteredWays
        const validWayIds = connectedComponent.wayIds.filter(id => filteredWays.has(id));
        if (validWayIds.length > 0) {
          for (const id of validWayIds) {
            visitedWayIds.add(id);
          }
          // Patch the connected component to only have the valid ways
          clusters.push({
             wayIds: validWayIds,
             depthByWayId: connectedComponent.depthByWayId,
             maxDepthReached: connectedComponent.maxDepthReached,
             truncated: connectedComponent.truncated
          });
        }
      }
    }

    const assembledCorridors = [];

    for (const cluster of clusters) {
      try {
        const assembledCorridor = _corridorAssembly.assemble(cluster, graph, filteredWays, nodeCoords);
        if (assembledCorridor) {
          assembledCorridors.push(assembledCorridor);
        }
      } catch (e) {
        log.warn('Failed to assemble cluster', { error: e.message, wayIds: cluster.wayIds });
      }
    }

    return { assembledCorridors, nearestStation };
  }

  /**
   * Orchestrates the resolution of the nearest railway corridor to the given location.
   * Strictly adheres to the Version 1.1 Architecture Amendment boundaries.
   *
   * @param {Object} location - GPS location {lat, lng}
   * @param {number} radiusMetres - Search radius
   */
  async resolveNearest(location, radiusMetres) {
    // 1. Data Fetch
    // Retrieves raw spatial infrastructure data and cached stations.
    const {
      corridors,
      stations,
      elements
    } = await this.overpass.fetchNearbyRailways(location, radiusMetres);

    if (corridors.length === 0) {
      log.info('No corridors found near location', {
        location,
        radiusMetres
      });
      return null;
    }

    // 2. Legacy Seed Selection
    // Isolates the legacy heuristic that determines which physical track to use
    // as the starting point for graph traversal.
    const seedInfo = _seedWayResolver.resolveSeedWay(location, corridors);
    if (!seedInfo) {
      return null;
    }

    log.debug('Resolved nearest corridor acting as seed way', {
      id: seedInfo.seedWayId,
      minDistance: seedInfo.minDistance
    });

    // 3. Graph Foundation
    // Constructs the mathematical topological graph from the raw OSM elements,
    // starting exactly from the chosen seed physical track.
    // Boundary: Topology only. No routing. No geometry construction.
    const { nodeCoords, ways } = _corridorGraph.indexOverpassElements(elements);
    const graph = _corridorGraph.buildWayConnectivityGraph(ways);
    const connectedComponent = _corridorGraph.findConnectedWays(seedInfo.seedWayId, graph);

    // 4. Corridor Assembly
    // Transforms the abstract graph topology into a physically traversable multi-branch geometry.
    // Boundary: Geometry assembly only. No operational routing. No mathematical projection.
    const assembledCorridor = _corridorAssembly.assemble(connectedComponent, graph, ways, nodeCoords);

    // 5. Projection Adapter
    // Evaluates every traversable segment simultaneously to compute the absolute closest mathematical point.
    // Boundary: Strict mathematical projection. Topology and segment choice remain intentionally hidden.
    const projection = _projectionAdapter.projectOntoCorridor(assembledCorridor, location);

    // 6. Station Matching
    // Executes station matching directly against the mathematical projection service.
    // Boundary: Consumes projection only. Station matcher is no longer coupled to graph topology.
    const stationsOutput = (0, _stationMatcher.matchStationsToCorridor)({
      assembledCorridor,
      stations,
      thresholdMetres: _thresholds.DEFAULT_THRESHOLDS.STATION_CORRIDOR_MATCH_DISTANCE_METRES,
      projectOntoCorridor: _projectionAdapter.projectOntoCorridor
    });

    // 7. Resolver Response Factory
    // Constructs the final deterministic payload.
    // Boundary: Enforces Version 1.1 separation between Graph-Relative and Route-Relative metrics.
    const response = _resolverResponseFactory.createResponse(projection, stationsOutput);

    // Explicit immutable contract for pipeline execution
    return new CorridorResolutionResult({
      nearestCorridor: response,
      assembledCorridor: assembledCorridor,
      projectionResult: projection,
      stationsOutput: stationsOutput
    });
  }
}

exports.CorridorResolver = CorridorResolver;