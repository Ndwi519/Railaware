/**
 * The immutable public architectural contract for an assembled corridor.
 */
class AssembledCorridor {
  #segments;
  #boundingBox;
  #branchCount;
  #branchIds;
  #branchIndex;
  #topology;

  /**
   * @param {Array<{coordinates: Array, startNodeId: number, endNodeId: number, adjacentSegments: Array<number>}>} segments
   * @param {Object} boundingBox
   * @param {number} branchCount
   */
  constructor(segments, boundingBox, branchCount) {
    // Preserve pure geometric array for downstream projection and backward compatibility
    this.#segments = Object.freeze(segments.map(s => Object.freeze([...s.coordinates.map(c => Object.freeze({ ...c }))] )));
    this.#boundingBox = Object.freeze({ ...boundingBox });
    this.#branchCount = branchCount;

    // Preserve topology (node IDs and adjacency) in a private field.
    // Node IDs must NEVER be exposed publicly.
    this.#topology = Object.freeze(segments.map(s => Object.freeze({
      startNodeId: s.startNodeId,
      endNodeId: s.endNodeId,
      adjacentSegments: Object.freeze([...s.adjacentSegments])
    })));

    // Create deterministic domain identifiers based strictly on node topology.
    this.#branchIds = Object.freeze(this.#topology.map(t => {
      return `branch_${t.startNodeId}_${t.endNodeId}`;
    }));

    // O(1) lookup map for segment indices
    this.#branchIndex = new Map();
    this.#branchIds.forEach((id, index) => this.#branchIndex.set(id, index));

    Object.freeze(this);
  }

  /**
   * Translates an internal segment index to a domain branch ID.
   * @param {number} segmentIndex
   * @returns {string|null}
   */
  getBranchId(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.#branchIds.length) return null;
    return this.#branchIds[segmentIndex];
  }

  /**
   * Translates a domain branch ID back to an internal segment index.
   * @param {string} branchId
   * @returns {number}
   */
  getSegmentIndex(branchId) {
    const index = this.#branchIndex.get(branchId);
    return index !== undefined ? index : -1;
  }

  /**
   * Retrieves adjacent segments dynamically connected to the given segment.
   * Node IDs and raw graph representations are hidden; this returns only topological domain concepts.
   *
   * @param {number} segmentIndex
   * @param {boolean} atEndNode If true, returns segments connected to the end node. If false, those at the start node.
   * @returns {Array<{segmentIndex: number, branchId: string, isForward: boolean}>}
   */
  getConnectedSegments(segmentIndex, atEndNode = true) {
    if (segmentIndex < 0 || segmentIndex >= this.#topology.length) return [];

    const targetSeg = this.#topology[segmentIndex];
    const targetNodeId = atEndNode ? targetSeg.endNodeId : targetSeg.startNodeId;

    const results = [];
    for (const adjIndex of targetSeg.adjacentSegments) {
      const adjSeg = this.#topology[adjIndex];
      let isForward = null;

      if (adjSeg.startNodeId === targetNodeId) {
        isForward = true;
      } else if (adjSeg.endNodeId === targetNodeId) {
        isForward = false;
      }

      if (isForward !== null) {
        results.push({
          segmentIndex: adjIndex,
          branchId: this.#branchIds[adjIndex],
          isForward
        });
      }
    }

    return results;
  }

  /**
   * Returns geometric segments suitable for projection.
   * @returns {Array<Array<{lat: number, lng: number}>>}
   */
  getTraversableSegments() {
    return this.#segments;
  }

  /**
   * Returns spatial bounds for indexing.
   * @returns {{minLat: number, maxLat: number, minLng: number, maxLng: number}}
   */
  getBoundingBox() {
    return this.#boundingBox;
  }

  /**
   * Returns topological divergence metrics.
   * @returns {number}
   */
  getBranchCount() {
    return this.#branchCount;
  }
}

module.exports = {
  AssembledCorridor
};
