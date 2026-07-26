const { alignNodes } = require('./OrientationResolver.js');

/**
 * Assembles traversable geometry segments driven strictly by topology.
 *
 * @param {Object} connectedComponent The result from Graph Foundation's traversal
 * @param {Map<number, Object>} ways The indexed OSM ways
 * @param {Map<number, Object>} nodeCoords The indexed OSM node coordinates
 * @param {Set<number>} branchNodes The set of topological branch nodes
 * @returns {Array<Array<{lat: number, lng: number}>>} The assembled geometry
 */
function assembleSegments(connectedComponent, ways, nodeCoords, branchNodes) {
  const visitedWays = new Set();
  const segments = [];

  const sortedWayIds = [...connectedComponent.wayIds].sort((a, b) => a - b);

  // Index component topology to map nodes to the ways within this component
  const nodeToComponentWays = new Map();
  for (const wayId of sortedWayIds) {
    const way = ways.get(wayId);
    if (!way || !Array.isArray(way.nodeIds) || way.nodeIds.length < 2) continue;

    const n1 = way.nodeIds[0];
    const n2 = way.nodeIds[way.nodeIds.length - 1];

    if (!nodeToComponentWays.has(n1)) nodeToComponentWays.set(n1, []);
    nodeToComponentWays.get(n1).push(wayId);

    if (n1 !== n2) {
      if (!nodeToComponentWays.has(n2)) nodeToComponentWays.set(n2, []);
      nodeToComponentWays.get(n2).push(wayId);
    } else {
      // Loop way
      nodeToComponentWays.get(n1).push(wayId);
    }
  }

  // Sort lists for determinism
  for (const wayList of nodeToComponentWays.values()) {
    wayList.sort((a, b) => a - b);
  }

  const nodeToSegmentIndices = new Map();
  const adjacencySets = [];

  function addSegment(segmentCoords, startNodeId, endNodeId) {
    if (segmentCoords.length < 2) return;

    const newIndex = segments.length;
    segments.push({
      coordinates: segmentCoords,
      startNodeId: startNodeId,
      endNodeId: endNodeId
    });
    adjacencySets.push(new Set());

    if (!nodeToSegmentIndices.has(startNodeId)) nodeToSegmentIndices.set(startNodeId, []);
    if (!nodeToSegmentIndices.has(endNodeId)) nodeToSegmentIndices.set(endNodeId, []);

    // Link start node
    const startConnected = nodeToSegmentIndices.get(startNodeId);
    for (const adjIdx of startConnected) {
      if (adjIdx !== newIndex) {
        adjacencySets[adjIdx].add(newIndex);
        adjacencySets[newIndex].add(adjIdx);
      }
    }
    startConnected.push(newIndex);

    // Link end node (if different from start node)
    if (startNodeId !== endNodeId) {
      const endConnected = nodeToSegmentIndices.get(endNodeId);
      for (const adjIdx of endConnected) {
        if (adjIdx !== newIndex) {
          adjacencySets[adjIdx].add(newIndex);
          adjacencySets[newIndex].add(adjIdx);
        }
      }
      endConnected.push(newIndex);
    }
  }

  function buildSegment(startNodeId, initialWayId) {
    let currentNodeId = startNodeId;
    let currentWayId = initialWayId;
    let segmentEndNodeId = startNodeId;

    const segmentCoords = [];
    let isFirstWay = true;

    while (currentWayId) {
      visitedWays.add(currentWayId);
      const way = ways.get(currentWayId);

      const alignedNodeIds = alignNodes(way, currentNodeId);
      const nextNodeId = alignedNodeIds[alignedNodeIds.length - 1];
      segmentEndNodeId = nextNodeId;

      for (let i = 0; i < alignedNodeIds.length; i++) {
        // Skip the shared connection node for subsequent ways to prevent zero-length duplicates
        if (!isFirstWay && i === 0) continue;

        const nId = alignedNodeIds[i];
        const coord = nodeCoords.get(nId);
        if (coord) {
          if (segmentCoords.length > 0) {
            const prevCoord = segmentCoords[segmentCoords.length - 1];
            if (prevCoord.lat === coord.lat && prevCoord.lng === coord.lng) {
              continue; // Skip zero-distance duplicates
            }
          }
          segmentCoords.push({ lat: coord.lat, lng: coord.lng });
        }
      }

      isFirstWay = false;

      if (branchNodes.has(nextNodeId)) {
        break; // Terminate segment at branch node
      }

      // Look for exactly 1 unvisited outgoing way
      const connectedWays = nodeToComponentWays.get(nextNodeId) || [];
      let nextWayId = null;
      for (const wid of connectedWays) {
        if (!visitedWays.has(wid)) {
          nextWayId = wid;
          break;
        }
      }

      if (!nextWayId) {
        break; // Dead end or loop closure
      }

      currentNodeId = nextNodeId;
      currentWayId = nextWayId;
    }

    addSegment(segmentCoords, startNodeId, segmentEndNodeId);
  }

  // 1. Start from all natural boundaries (branch nodes and terminal nodes)
  const sortedNodeIds = Array.from(nodeToComponentWays.keys()).sort((a, b) => a - b);
  for (const nodeId of sortedNodeIds) {
    const degree = nodeToComponentWays.get(nodeId).length;
    if (branchNodes.has(nodeId) || degree === 1) {
      const connectedWays = nodeToComponentWays.get(nodeId);
      for (const wayId of connectedWays) {
        if (!visitedWays.has(wayId)) {
          buildSegment(nodeId, wayId);
        }
      }
    }
  }

  // 2. Fallback for pure closed loops
  for (const wayId of sortedWayIds) {
    if (!visitedWays.has(wayId)) {
      const way = ways.get(wayId);
      if (way && Array.isArray(way.nodeIds) && way.nodeIds.length > 0) {
        buildSegment(way.nodeIds[0], wayId);
      }
    }
  }

  // Construct final immutable segment objects exactly once
  return segments.map((segment, index) => ({
    coordinates: segment.coordinates,
    startNodeId: segment.startNodeId,
    endNodeId: segment.endNodeId,
    adjacentSegments: Array.from(adjacencySets[index]).sort((a, b) => a - b)
  }));
}

module.exports = {
  assembleSegments
};
