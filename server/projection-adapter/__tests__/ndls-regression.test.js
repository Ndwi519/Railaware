const fs = require('fs');
const path = require('path');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../../corridor-resolver/corridor-graph.js');
const { assemble } = require('../../corridor-assembly/CorridorAssembly.js');
const { projectOntoCorridor } = require('../ProjectionAdapter.js');

describe('NDLS Projection Regression', () => {
  it('evaluates projection correctly according to the ADS', () => {
    const fixturePath = path.join(__dirname, '../../fixtures/ndls_success.json');
    const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // 1. Graph Foundation
    const { nodeCoords, ways } = indexOverpassElements(rawData.elements);
    const graph = buildWayConnectivityGraph(ways);
    const seedWayId = 77366967;
    const connectedComponent = findConnectedWays(seedWayId, graph);

    // 2. Corridor Assembly
    const assembledCorridor = assemble(connectedComponent, graph, ways, nodeCoords);

    // 3. Projection Adapter
    // Coordinate near NDLS (Platform area)
    const point = { lat: 28.6425, lng: 77.2197 };

    const startTime = process.hrtime.bigint();
    const result1 = projectOntoCorridor(assembledCorridor, point);
    const endTime = process.hrtime.bigint();

    const execTimeMs = Number(endTime - startTime) / 1000000;

    expect(result1).not.toBeNull();

    // Verify ProjectionResult structure identical to the legacy engine
    const expectedKeys = [
      'projectedPoint',
      'alongTrackDistanceMetres',
      'corridorSegmentIndex',
      'crossTrackDistanceMetres',
      'interpolationRatio',
      'segmentIndex'
    ].sort();

    const actualKeys = Object.keys(result1).sort();
    expect(actualKeys).toEqual(expectedKeys);

    // Verify no temporary metadata leaks
    expect(result1.evaluationOrder).toBeUndefined();

    // Verify deterministic output across repeated runs
    const result2 = projectOntoCorridor(assembledCorridor, point);
    expect(result1).toEqual(result2);

    console.log('--- NDLS Projection Regression Report ---');
    console.log(`Evaluated against ${assembledCorridor.getTraversableSegments().length} segments`);
    console.log(`Cross-Track Distance: ${result1.crossTrackDistanceMetres.toFixed(3)} m`);
    console.log(`Execution Time: ${execTimeMs.toFixed(3)} ms`);

    expect(execTimeMs).toBeLessThan(200);
  });
});
