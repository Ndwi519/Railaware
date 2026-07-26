/**
 * Detects topological branch nodes strictly within the given connected component.
 * A branch node is defined as a node connected to 3 or more ways that exist
 * within the provided component.
 *
 * @param {Object} connectedComponent The result from Graph Foundation's traversal
 * @param {Map<number, Object>} ways The indexed OSM ways
 * @param {Object} graph The connectivity graph
 * @returns {Set<number>} A set of branch node IDs
 */
function detectBranches(connectedComponent, ways, graph) {
  const branchNodes = new Set();

  if (!connectedComponent || !Array.isArray(connectedComponent.wayIds) || !ways || !graph || !graph.nodeToWays) {
    return branchNodes;
  }

  const componentWays = new Set(connectedComponent.wayIds);
  const candidateNodes = new Set();

  for (const wayId of connectedComponent.wayIds) {
    const way = ways.get(wayId);
    if (way && Array.isArray(way.nodeIds) && way.nodeIds.length >= 2) {
      candidateNodes.add(way.nodeIds[0]);
      candidateNodes.add(way.nodeIds[way.nodeIds.length - 1]);
    }
  }

  // Sort candidate nodes to ensure deterministic evaluation order
  const sortedCandidates = Array.from(candidateNodes).sort((a, b) => a - b);

  for (const nodeId of sortedCandidates) {
    const connectedWayIds = graph.nodeToWays.get(nodeId);
    if (connectedWayIds) {
      let countWithinComponent = 0;
      for (const connectedWayId of connectedWayIds) {
        if (componentWays.has(connectedWayId)) {
          countWithinComponent++;
        }
      }

      if (countWithinComponent >= 3) {
        branchNodes.add(nodeId);
      }
    }
  }

  return branchNodes;
}

module.exports = {
  detectBranches
};
