Object.defineProperty(exports, "__esModule", { value: true });

const { deepFreeze } = require("../utils/deepFreeze.js");
const { haversineMetres } = require("../calculations/haversine.js");

/**
 * Indexes raw Overpass elements into maps of nodes and ways.
 * @param {Array} elements Raw Overpass elements array
 * @returns {{nodeCoords: Map<number, {lat: number, lng: number}>, ways: Map<number, {id: number, nodeIds: number[]}>}}
 */
function indexOverpassElements(elements) {
  const nodeCoords = new Map();
  const ways = new Map();

  if (!Array.isArray(elements)) {
    return { nodeCoords, ways };
  }

  for (const element of elements) {
    if (element.type === 'node' && typeof element.id === 'number' && typeof element.lat === 'number' && typeof element.lon === 'number') {
      nodeCoords.set(element.id, { lat: element.lat, lng: element.lon });
    } else if (element.type === 'way' && typeof element.id === 'number' && Array.isArray(element.nodes) && element.nodes.length >= 2) {
      if (element.tags && (element.tags.railway === 'rail' || element.tags.railway === 'narrow_gauge')) {
        ways.set(element.id, { id: element.id, nodeIds: [...element.nodes] });
      }
    }
  }

  return { nodeCoords, ways };
}

/**
 * Builds a connectivity graph from a map of ways.
 * Two ways are connected ONLY if they share a node ID at an ENDPOINT of at least one of them.
 *
 * // TODO: Pending real NDLS fixture.
 * // FIXTURE FINDING (fixtures/ndls_success.json, NDLS 28.6427,77.2197):
 * // [Findings about endpoint vs interior connectivity to be documented here once fixture is supplied.]
 *
 * @param {Map<number, {id: number, nodeIds: number[]}>} ways
 * @returns {{edges: Map<number, number[]>, nodeToWays: Map<number, number[]>}} Frozen graph object
 */
function buildWayConnectivityGraph(ways) {
  const edges = new Map();
  const nodeToWays = new Map();

  // Populate nodeToWays with endpoint occurrences
  for (const [wayId, way] of ways.entries()) {
    if (!edges.has(wayId)) {
      edges.set(wayId, []);
    }

    if (way.nodeIds.length < 2) continue;

    const endpoints = [way.nodeIds[0], way.nodeIds[way.nodeIds.length - 1]];
    // Handle ways that might be closed loops (start and end are the same)
    const uniqueEndpoints = new Set(endpoints);

    for (const nodeId of uniqueEndpoints) {
      if (!nodeToWays.has(nodeId)) {
        nodeToWays.set(nodeId, []);
      }
      nodeToWays.get(nodeId).push(wayId);
    }
  }

  // Deduplicate and populate edge lists
  for (const [nodeId, connectedWayIds] of nodeToWays.entries()) {
    if (connectedWayIds.length >= 2) {
      for (let i = 0; i < connectedWayIds.length; i++) {
        for (let j = i + 1; j < connectedWayIds.length; j++) {
          const wayA = connectedWayIds[i];
          const wayB = connectedWayIds[j];

          const edgesA = edges.get(wayA);
          if (!edgesA.includes(wayB)) edgesA.push(wayB);

          const edgesB = edges.get(wayB);
          if (!edgesB.includes(wayA)) edgesB.push(wayA);
        }
      }
    }
  }

  // Sort edge lists for determinism
  for (const [wayId, connectedWayIds] of edges.entries()) {
    connectedWayIds.sort((a, b) => a - b);
  }

  // Sort nodeToWays lists for determinism
  for (const [nodeId, wayIds] of nodeToWays.entries()) {
    wayIds.sort((a, b) => a - b);
  }

  // Note: graph objects are frozen by deepFreeze. However, Map internal storage
  // remains mutable under standard JavaScript semantics (e.g. .set() still works).
  // Callers must treat the returned Maps as immutable by convention.
  return deepFreeze({ edges, nodeToWays });
}



/**
 * Finds all connected ways using a BFS traversal, starting from seedWayId.
 * @param {number} seedWayId
 * @param {Object} graph Graph from buildWayConnectivityGraph
 * @param {Object} [options={}] Traversal options
 * @param {number} [options.maxWays=150] Maximum number of ways to traverse (positive integer, Infinity allowed)
 * @param {number} [options.maxDepth=Infinity] Maximum depth of BFS traversal (non-negative integer, Infinity allowed)
 * @returns {Object} Frozen traversal result
 * @throws {TypeError} when either option violates the documented contract
 */
function findConnectedWays(seedWayId, graph, options = {}) {
  const maxWays = options.maxWays !== undefined ? options.maxWays : 150;
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : Infinity;

  if (typeof maxWays !== 'number' || Number.isNaN(maxWays) || maxWays < 1 || (!Number.isInteger(maxWays) && maxWays !== Infinity)) {
    throw new TypeError('maxWays must be a positive integer or Infinity');
  }

  if (typeof maxDepth !== 'number' || Number.isNaN(maxDepth) || maxDepth < 0 || (!Number.isInteger(maxDepth) && maxDepth !== Infinity)) {
    throw new TypeError('maxDepth must be a non-negative integer or Infinity');
  }

  if (!graph || !graph.edges || !graph.edges.has(seedWayId)) {
    return deepFreeze({
      wayIds: [],
      depthByWayId: new Map(),
      maxDepthReached: 0,
      truncated: false
    });
  }

  const depthByWayId = new Map();
  let maxDepthReached = 0;
  let truncated = false;

  // Queue stores [wayId, depth]
  const queue = [[seedWayId, 0]];
  depthByWayId.set(seedWayId, 0);

  // We need to order the output deterministically.
  // However, breadth-first traversal can be non-deterministic if edges aren't processed deterministically,
  // but we sorted edges ascending, which helps.

  let head = 0;
  while (head < queue.length) {
    const [currentWayId, currentDepth] = queue[head++];

    const neighbors = graph.edges.get(currentWayId) || [];

    if (currentDepth >= maxDepth) {
      // Node reached max depth. We do not explore its neighbors.
      // However, we only mark as truncated if it has unvisited neighbors that were omitted.
      for (const neighborId of neighbors) {
        if (!depthByWayId.has(neighborId)) {
          truncated = true;
          break;
        }
      }
      continue;
    }

    let reachedMaxWays = false;
    for (const neighborId of neighbors) {
      if (!depthByWayId.has(neighborId)) {
        if (depthByWayId.size >= maxWays) {
          // We have an unvisited neighbor but the capacity is reached.
          truncated = true;
          reachedMaxWays = true;
          break;
        }
        depthByWayId.set(neighborId, currentDepth + 1);
        queue.push([neighborId, currentDepth + 1]);
      }
    }

    if (reachedMaxWays) {
      break;
    }
  }

  // Calculate true max depth among visited nodes
  let finalMaxDepth = 0;
  for (const depth of depthByWayId.values()) {
    if (depth > finalMaxDepth) finalMaxDepth = depth;
  }

  // Sort wayIds by [depth ascending, wayId ascending]
  const wayIds = Array.from(depthByWayId.keys()).sort((a, b) => {
    const depthA = depthByWayId.get(a);
    const depthB = depthByWayId.get(b);
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a - b;
  });

  return deepFreeze({
    wayIds,
    depthByWayId,
    maxDepthReached: finalMaxDepth,
    truncated
  });
}

/**
 * Counts branch nodes (nodes where 3 or more ways intersect).
 * @param {Object} graph Graph from buildWayConnectivityGraph
 * @returns {number} Count of branch nodes
 */
function countBranchNodes(graph) {
  let count = 0;
  if (!graph || !graph.nodeToWays) return count;
  for (const ways of graph.nodeToWays.values()) {
    if (ways.length >= 3) {
      count++;
    }
  }
  return count;
}

const DEFAULT_REACHABLE_RADIUS_METRES = 1000;

/**
 * Summarises the connectivity.
 * @param {Object} params Parameters
 * @returns {Object} Frozen diagnostic summary
 */
function summariseConnectivity(params) {
  const {
    seedWayId,
    ways,
    nodeCoords,
    graph,
    stationPoints,
    maxWays = 150,
    maxDepth = Infinity,
    reachableStationRadiusMetres = DEFAULT_REACHABLE_RADIUS_METRES
  } = params;

  const connectedResult = findConnectedWays(seedWayId, graph, { maxWays, maxDepth });
  const connectedWayCount = connectedResult.wayIds.length;

  const connectedNodeIds = new Set();
  let branchNodeCount = 0;

  if (connectedWayCount > 0) {
    for (const wayId of connectedResult.wayIds) {
      const way = ways.get(wayId);
      if (way) {
        for (const nodeId of way.nodeIds) {
          connectedNodeIds.add(nodeId);
        }
      }
    }

    // Count branch nodes scoped ONLY to the connected component
    for (const nodeId of connectedNodeIds) {
      const connectedToNode = graph.nodeToWays.get(nodeId) || [];
      if (connectedToNode.length >= 3) {
        branchNodeCount++;
      }
    }
  }

  const reachableStationCodes = new Set();

  if (Array.isArray(stationPoints)) {
    for (const station of stationPoints) {
      // DIAGNOSTIC ONLY: straight-line proximity, not a real corridor match.
      // Do not use this list for anything other than printing/inspecting
      // connectivity quality during development. Real station matching still
      // goes through matchStationsToCorridor() + projectPointOntoCorridor(),
      // untouched by this module.

      let isReachable = false;
      for (const nodeId of connectedNodeIds) {
        const coord = nodeCoords.get(nodeId);
        if (coord) {
          const dist = haversineMetres(station.lat, station.lng, coord.lat, coord.lng);
          if (dist <= reachableStationRadiusMetres) {
            isReachable = true;
            break;
          }
        }
      }

      if (isReachable && station.code) {
        reachableStationCodes.add(station.code);
      }
    }
  }

  return deepFreeze({
    seedWayId,
    connectedWayCount,
    connectedNodeCount: connectedNodeIds.size,
    branchNodeCount,
    reachableStationCodes: Array.from(reachableStationCodes).sort(),
    maxGraphDepth: connectedResult.maxDepthReached,
    truncated: connectedResult.truncated
  });
}

exports.indexOverpassElements = indexOverpassElements;
exports.buildWayConnectivityGraph = buildWayConnectivityGraph;

exports.findConnectedWays = findConnectedWays;
exports.countBranchNodes = countBranchNodes;
exports.summariseConnectivity = summariseConnectivity;
