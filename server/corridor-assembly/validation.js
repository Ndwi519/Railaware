const { TopologyError } = require('./errors.js');

/**
 * Validates the topological inputs before assembly.
 *
 * @param {Object} connectedComponent The result from Graph Foundation's traversal
 * @param {Object} graph The connectivity graph
 * @param {Map<number, Object>} ways The indexed OSM ways
 * @param {Map<number, Object>} nodeCoords The indexed OSM node coordinates
 * @throws {TopologyError} if any contract is violated
 */
function validateTopology(connectedComponent, graph, ways, nodeCoords) {
  if (!connectedComponent || !Array.isArray(connectedComponent.wayIds)) {
    throw new TopologyError('Invalid ConnectedComponent: missing or malformed wayIds array.');
  }

  if (connectedComponent.wayIds.length === 0) {
    throw new TopologyError('ConnectedComponent is empty.');
  }

  if (!graph || !graph.edges || !graph.nodeToWays || !(graph.edges instanceof Map) || !(graph.nodeToWays instanceof Map)) {
    throw new TopologyError('Invalid graph structure: missing or malformed edges or nodeToWays.');
  }

  if (!(ways instanceof Map)) {
    throw new TopologyError('Invalid ways structure: must be a Map.');
  }

  if (!(nodeCoords instanceof Map)) {
    throw new TopologyError('Invalid nodeCoords structure: must be a Map.');
  }

  for (const wayId of connectedComponent.wayIds) {
    const way = ways.get(wayId);
    if (!way) {
      throw new TopologyError(`Broken reference: Way ${wayId} exists in ConnectedComponent but is missing from ways index.`);
    }

    if (!Array.isArray(way.nodeIds) || way.nodeIds.length < 2) {
      throw new TopologyError(`Malformed data: Way ${wayId} does not contain a valid nodeIds array of at least 2 nodes.`);
    }

    if (!graph.edges.has(wayId)) {
      throw new TopologyError(`Disconnected input: Way ${wayId} is not present in graph edges.`);
    }
  }
}

module.exports = {
  validateTopology
};
