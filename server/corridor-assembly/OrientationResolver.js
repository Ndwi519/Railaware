/**
 * Determines if a way needs to be reversed to smoothly connect to a given node.
 *
 * @param {Object} way The OSM way to orient
 * @param {number} connectionNodeId The node ID where this way connects to the existing path
 * @returns {boolean} True if the way's nodeIds should be traversed in reverse order
 */
function shouldReverseWay(way, connectionNodeId) {
  if (!way || !Array.isArray(way.nodeIds) || way.nodeIds.length < 2) {
    return false;
  }

  // If the way connects via its last node, we must traverse it backward
  // to prevent artificial zig-zag geometry and preserve continuity.
  if (way.nodeIds[way.nodeIds.length - 1] === connectionNodeId) {
    // Edge case: if it's a closed loop (first node === last node),
    // traversing forward is technically also a connection, but standard
    // topology resolution will treat the first occurrence (start node) as forward.
    // If start node is also the connection node, it will fall through the first check
    // because start node check isn't explicit here, but wait:
    // If it's a loop, start === end. In that case, we can just walk forward.
    if (way.nodeIds[0] === connectionNodeId) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Aligns the nodes of a way to preserve coordinate continuity from a connection node.
 *
 * @param {Object} way The OSM way to align
 * @param {number} connectionNodeId The node ID to align from (can be null/undefined for start of path)
 * @returns {number[]} A new array of node IDs oriented to flow away from the connection node
 */
function alignNodes(way, connectionNodeId) {
  if (!way || !Array.isArray(way.nodeIds)) {
    return [];
  }

  if (connectionNodeId !== undefined && connectionNodeId !== null && shouldReverseWay(way, connectionNodeId)) {
    return [...way.nodeIds].reverse();
  }

  return [...way.nodeIds];
}

module.exports = {
  shouldReverseWay,
  alignNodes
};
