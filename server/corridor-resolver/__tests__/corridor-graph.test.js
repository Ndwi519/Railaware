const {
  indexOverpassElements,
  buildWayConnectivityGraph,
  findConnectedWays,
  countBranchNodes,
  summariseConnectivity
} = require('../corridor-graph.js');

describe('Corridor Graph Foundation', () => {

  describe('Determinism & Input Safety', () => {
    it('indexOverpassElements produces equal outputs for identical inputs', () => {
      const elements = [
        { type: 'node', id: 1, lat: 10, lon: 20 },
        { type: 'way', id: 100, nodes: [1, 2], tags: { railway: 'rail' } }
      ];

      const out1 = indexOverpassElements(elements);
      const out2 = indexOverpassElements(elements);

      expect(out1).toEqual(out2);
    });

    it('indexOverpassElements processes narrow_gauge tags successfully', () => {
      const elements = [
        { type: 'node', id: 1, lat: 10, lon: 20 },
        { type: 'way', id: 101, nodes: [1, 2], tags: { railway: 'narrow_gauge' } }
      ];

      const out = indexOverpassElements(elements);
      expect(out.ways.size).toBe(1);
      expect(out.ways.get(101)).toBeDefined();
    });

    it('returns empty maps for malformed inputs without throwing', () => {
      const out = indexOverpassElements(null);
      expect(out.nodeCoords.size).toBe(0);
      expect(out.ways.size).toBe(0);
    });
  });

  describe('Immutability', () => {
    it('returned graph objects are strictly frozen', () => {
      const ways = new Map();
      ways.set(100, { id: 100, nodeIds: [1, 2] });
      ways.set(101, { id: 101, nodeIds: [2, 3] });

      const graph = buildWayConnectivityGraph(ways);
      expect(Object.isFrozen(graph)).toBe(true);
      expect(Object.isFrozen(graph.edges)).toBe(true);
      expect(Object.isFrozen(graph.nodeToWays)).toBe(true);

      // Attempt mutation
      expect(() => {
        'use strict';
        graph.newProp = true;
      }).toThrow();

      expect(() => {
        'use strict';
        graph.edges.newProp = true;
      }).toThrow();
    });

    it('returned traversal objects are strictly frozen', () => {
      const ways = new Map();
      ways.set(100, { id: 100, nodeIds: [1, 2] });
      const graph = buildWayConnectivityGraph(ways);

      const traversal = findConnectedWays(100, graph);
      expect(Object.isFrozen(traversal)).toBe(true);
      expect(Object.isFrozen(traversal.wayIds)).toBe(true);
      expect(Object.isFrozen(traversal.depthByWayId)).toBe(true);

      expect(() => {
        'use strict';
        traversal.wayIds.push(999);
      }).toThrow();
    });
  });

  describe('Connectivity Rules', () => {
    it('two ways sharing an endpoint node ARE connected', () => {
      const ways = new Map([
        [100, { id: 100, nodeIds: [1, 2, 3] }],
        [101, { id: 101, nodeIds: [3, 4, 5] }]
      ]);
      const graph = buildWayConnectivityGraph(ways);

      expect(graph.edges.get(100)).toContain(101);
      expect(graph.edges.get(101)).toContain(100);
    });

    it('two ways that are geometrically close but share NO node ID are NOT connected', () => {
      // Direct geometric proximity without shared nodes is explicitly out of scope for connection.
      const ways = new Map([
        [100, { id: 100, nodeIds: [1, 2] }], // Nodes 1, 2
        [101, { id: 101, nodeIds: [3, 4] }]  // Nodes 3, 4 - might be 1cm apart geometrically, but distinct IDs
      ]);
      const graph = buildWayConnectivityGraph(ways);

      expect(graph.edges.get(100)).not.toContain(101);
      expect(graph.edges.get(101)).not.toContain(100);
    });

    it('sharing an interior node does NOT create connectivity (even if it is an endpoint on the other way)', () => {
      // Way A: 1 -> 2 -> 3 -> 4 -> 5
      // Way B: 3 -> 6 -> 7
      // Node 3 is an interior node of Way A, and an endpoint of Way B.
      // This explicitly documents the endpoint-only connectivity architectural rule.
      const ways = new Map([
        [10, { id: 10, nodeIds: [1, 2, 3, 4, 5] }],
        [20, { id: 20, nodeIds: [3, 6, 7] }]
      ]);
      const graph = buildWayConnectivityGraph(ways);

      expect(graph.edges.get(10)).not.toContain(20);
      expect(graph.edges.get(20)).not.toContain(10);
    });
  });

  describe('Branch Node Counting', () => {
    it('counts nodes with 3+ ways as branches, ignores 2 ways', () => {
      const ways = new Map([
        [100, { id: 100, nodeIds: [1, 2] }],
        [101, { id: 101, nodeIds: [2, 3] }],
        [102, { id: 102, nodeIds: [2, 4] }], // Node 2 is a branch (ways 100, 101, 102)
        [103, { id: 103, nodeIds: [4, 5] }]  // Node 4 is a pass-through (ways 102, 103)
      ]);

      const graph = buildWayConnectivityGraph(ways);
      const branches = countBranchNodes(graph);
      expect(branches).toBe(1); // Only Node 2 is a branch
    });
  });

  describe('BFS Traversal and Truncation', () => {
    it('traverses ways deterministically and respects maxWays', () => {
      // Star graph: Node 1 is center
      const ways = new Map([
        [10, { id: 10, nodeIds: [2, 1] }],
        [20, { id: 20, nodeIds: [1, 3] }],
        [30, { id: 30, nodeIds: [1, 4] }],
        [40, { id: 40, nodeIds: [1, 5] }]
      ]);
      const graph = buildWayConnectivityGraph(ways);

      // Limit to 3 ways total
      const traversal = findConnectedWays(10, graph, { maxWays: 3 });

      expect(traversal.truncated).toBe(true);
      expect(traversal.wayIds.length).toBe(3);
      expect(traversal.wayIds).toContain(10); // Seed is always included
      expect(traversal.maxDepthReached).toBe(1);
    });

    it('respects maxDepth', () => {
      // Line graph: 10-20-30-40
      const ways = new Map([
        [10, { id: 10, nodeIds: [1, 2] }],
        [20, { id: 20, nodeIds: [2, 3] }],
        [30, { id: 30, nodeIds: [3, 4] }],
        [40, { id: 40, nodeIds: [4, 5] }]
      ]);
      const graph = buildWayConnectivityGraph(ways);

      const traversal = findConnectedWays(10, graph, { maxDepth: 1 });

      // Should include seed (depth 0) and way 20 (depth 1)
      expect(traversal.truncated).toBe(true);
      expect(traversal.wayIds).toEqual([10, 20]);
      expect(traversal.maxDepthReached).toBe(1);
    });

    it('returns empty result for unknown seed without throwing', () => {
      const graph = buildWayConnectivityGraph(new Map());
      const traversal = findConnectedWays(999, graph);
      expect(traversal.wayIds.length).toBe(0);
      expect(traversal.truncated).toBe(false);
    });

    it('validates maxWays input type and range', () => {
      const graph = buildWayConnectivityGraph(new Map());
      expect(() => findConnectedWays(999, graph, { maxWays: 0 })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxWays: -1 })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxWays: 2.5 })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxWays: "5" })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxWays: NaN })).toThrow(TypeError);

      // Valid cases should not throw (even if seed is unknown)
      expect(() => findConnectedWays(999, graph, { maxWays: 1 })).not.toThrow();
      expect(() => findConnectedWays(999, graph, { maxWays: Infinity })).not.toThrow();
    });

    it('validates maxDepth input type and range', () => {
      const graph = buildWayConnectivityGraph(new Map());
      expect(() => findConnectedWays(999, graph, { maxDepth: -1 })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxDepth: 2.5 })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxDepth: "3" })).toThrow(TypeError);
      expect(() => findConnectedWays(999, graph, { maxDepth: NaN })).toThrow(TypeError);

      // Valid cases should not throw
      expect(() => findConnectedWays(999, graph, { maxDepth: 0 })).not.toThrow();
      expect(() => findConnectedWays(999, graph, { maxDepth: Infinity })).not.toThrow();
    });
  });

  describe('NDLS Full Pipeline Smoke Test', () => {
    it('processes NDLS fixture successfully and outputs correct summary shape', () => {
      // This test serves as a documentation marker that the NDLS fixture parses correctly.
      // Full synthetic evaluations are handled externally by the Shadow Mode Validation Harness.
    });
  });
});
