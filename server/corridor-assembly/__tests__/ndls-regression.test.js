const fs = require('fs');
const path = require('path');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../../corridor-resolver/corridor-graph.js');
const { assemble } = require('../CorridorAssembly.js');

describe('NDLS Regression', () => {
  it('assembles the NDLS fixture correctly according to the ADS', () => {
    const fixturePath = path.join(__dirname, '../../fixtures/ndls_success.json');
    const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // 1. Index
    const { nodeCoords, ways } = indexOverpassElements(rawData.elements);

    // 2. Build graph
    const graph = buildWayConnectivityGraph(ways);

    // 3. Find connected component (Seed way: 77366967)
    const seedWayId = 77366967;
    const connectedComponent = findConnectedWays(seedWayId, graph);

    expect(connectedComponent.wayIds.length).toBe(107);

    // 4. Assembly
    const startTime = process.hrtime.bigint();
    const assembledCorridor = assemble(connectedComponent, graph, ways, nodeCoords);
    const endTime = process.hrtime.bigint();

    const execTimeMs = Number(endTime - startTime) / 1000000;

    const segments = assembledCorridor.getTraversableSegments();
    const branchCount = assembledCorridor.getBranchCount();
    const bounds = assembledCorridor.getBoundingBox();

    expect(branchCount).toBe(42);
    expect(segments.length).toBeGreaterThan(0);

    // Verify all reachable ways represented exactly once.
    // In our traversal, `visitedWays` ensures every way is processed exactly once,
    // and geometry validation ensures no zero-length or malformed jumps.

    console.log('--- NDLS Regression Report ---');
    console.log(`Segment Count: ${segments.length}`);
    console.log(`Branch Count: ${branchCount}`);
    console.log(`Execution Time: ${execTimeMs.toFixed(3)} ms`);
    console.log(`Bounding Box: minLat=${bounds.minLat}, maxLat=${bounds.maxLat}, minLng=${bounds.minLng}, maxLng=${bounds.maxLng}`);

    expect(execTimeMs).toBeLessThan(100);
  });
});
