const { assemble } = require('../CorridorAssembly.js');
const { TopologyError } = require('../errors.js');

describe('Corridor Assembly', () => {
  let ways, nodeCoords, graph;

  beforeEach(() => {
    ways = new Map();
    nodeCoords = new Map();
    graph = { edges: new Map(), nodeToWays: new Map() };
  });

  const addWay = (id, nodeIds) => {
    ways.set(id, { id, nodeIds });
    graph.edges.set(id, []);
    nodeIds.forEach(nId => {
      if (!graph.nodeToWays.has(nId)) graph.nodeToWays.set(nId, []);
      graph.nodeToWays.get(nId).push(id);

      // Stub coordinates for testing, ensuring valid lat/lng
      if (!nodeCoords.has(nId)) {
        nodeCoords.set(nId, { lat: nId * 0.1, lng: nId * 0.1 });
      }
    });
  };

  const connectWays = (w1, w2) => {
    graph.edges.get(w1).push(w2);
    graph.edges.get(w2).push(w1);
  };

  test('Straight corridor (no branches)', () => {
    addWay(1, [10, 20]);
    addWay(2, [20, 30]);
    addWay(3, [30, 40]);
    connectWays(1, 2);
    connectWays(2, 3);

    const connectedComponent = { wayIds: [1, 2, 3] };
    const result = assemble(connectedComponent, graph, ways, nodeCoords);

    expect(result.getBranchCount()).toBe(0);
    const segments = result.getTraversableSegments();
    expect(segments.length).toBe(1);
    expect(segments[0].length).toBe(4);

    // Check bounding box
    const bounds = result.getBoundingBox();
    expect(bounds.minLat).toBe(1); // 10 * 0.1
    expect(bounds.maxLat).toBe(4); // 40 * 0.1
  });

  test('Simple Y Junction', () => {
    // 1 -> 2
    // 2 -> 3
    // 2 -> 4
    addWay(1, [10, 20]);
    addWay(2, [20, 30]);
    addWay(3, [20, 40]);

    connectWays(1, 2);
    connectWays(1, 3);
    connectWays(2, 3);

    const connectedComponent = { wayIds: [1, 2, 3] };
    const result = assemble(connectedComponent, graph, ways, nodeCoords);

    expect(result.getBranchCount()).toBe(1); // Node 20 connects to 3 ways
    const segments = result.getTraversableSegments();

    // We expect 3 distinct segments terminating/starting at node 20
    expect(segments.length).toBe(3);
  });

  test('Missing coordinates fallback', () => {
    addWay(1, [10, 20, 30]);
    nodeCoords.delete(20); // Missing coordinate

    const connectedComponent = { wayIds: [1] };
    const result = assemble(connectedComponent, graph, ways, nodeCoords);
    const segments = result.getTraversableSegments();

    expect(segments.length).toBe(1);
    expect(segments[0].length).toBe(2); // Node 20 is skipped, connecting 10 -> 30 directly
  });

  test('Duplicate adjacent coordinates removed', () => {
    addWay(1, [10, 20]);
    nodeCoords.set(20, nodeCoords.get(10)); // Force duplicate coordinate

    const connectedComponent = { wayIds: [1] };
    const result = assemble(connectedComponent, graph, ways, nodeCoords);
    const segments = result.getTraversableSegments();

    expect(segments.length).toBe(0); // Only 1 unique coordinate, invalid segment length
  });

  test('Loops (acyclic unrolling)', () => {
    // 1 -> 2 -> 3 -> 1 (pure loop)
    addWay(1, [10, 20]);
    addWay(2, [20, 30]);
    addWay(3, [30, 10]);
    connectWays(1, 2);
    connectWays(2, 3);
    connectWays(3, 1);

    const connectedComponent = { wayIds: [1, 2, 3] };
    const result = assemble(connectedComponent, graph, ways, nodeCoords);

    expect(result.getBranchCount()).toBe(0);
    const segments = result.getTraversableSegments();
    expect(segments.length).toBe(1);
    expect(segments[0].length).toBe(4); // 10, 20, 30, 10
  });

  test('Broken topology throws TopologyError', () => {
    const connectedComponent = { wayIds: [999] }; // Missing from ways

    expect(() => {
      assemble(connectedComponent, graph, ways, nodeCoords);
    }).toThrow(TopologyError);
  });
});
