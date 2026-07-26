const { validateTopology } = require('./validation.js');
const { detectBranches } = require('./BranchDetector.js');
const { assembleSegments } = require('./SegmentAssembler.js');
const { validateGeometry } = require('./GeometryValidator.js');
const { calculateBoundingBox } = require('./BoundingBoxCalculator.js');
const { AssembledCorridor } = require('./AssembledCorridor.js');
const { TopologyError } = require('./errors.js');

/**
 * Orchestrates the Corridor Assembly pipeline.
 * Transforms a connected railway component into an immutable AssembledCorridor.
 *
 * @param {Object} connectedComponent The result from Graph Foundation's traversal
 * @param {Object} graph The connectivity graph
 * @param {Map<number, Object>} ways The indexed OSM ways
 * @param {Map<number, Object>} nodeCoords The indexed OSM node coordinates
 * @returns {AssembledCorridor} The assembled corridor suitable for projection
 * @throws {TopologyError} if inputs violate architectural contracts or geometry fails validation
 */
function assemble(connectedComponent, graph, ways, nodeCoords) {
  // 1. Validate topology
  validateTopology(connectedComponent, graph, ways, nodeCoords);

  // 2. Detect branches
  const branchNodes = detectBranches(connectedComponent, ways, graph);

  // 3. Assemble geometry and topology
  const segments = assembleSegments(connectedComponent, ways, nodeCoords, branchNodes);

  // Extract raw coordinates for geometric validations without modifying existing geometric contracts
  const geometricSegments = segments.map(s => s.coordinates);

  // 4. Validate geometry
  const geometryValidation = validateGeometry(geometricSegments);
  if (!geometryValidation.isValid) {
    throw new TopologyError(`Geometry validation failed: ${geometryValidation.errors.join(', ')}`);
  }

  // 5. Calculate bounding box
  const boundingBox = calculateBoundingBox(geometricSegments);

  // 6. Construct AssembledCorridor
  return new AssembledCorridor(segments, boundingBox, branchNodes.size);
}

module.exports = {
  assemble
};
