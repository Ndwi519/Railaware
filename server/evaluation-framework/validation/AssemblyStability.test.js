test.skip('pending Phase 2 - AssemblyStability', () => {
const assert = require('assert');
const { AssembledCorridor } = require('../../corridor-assembly/AssembledCorridor.js');
const { assemble } = require('../../corridor-assembly/CorridorAssembly.js');
const { projectPointOntoCorridor } = require('../../calculations/projection.js');
const { buildWayConnectivityGraph } = require('../../corridor-resolver/corridor-graph.js');

// Mock a long corridor broken into Ways
const ways1 = new Map();
ways1.set(100, { id: 100, nodeIds: [1, 2] });
ways1.set(102, { id: 102, nodeIds: [2, 3] });

const nodeCoords1 = new Map();
nodeCoords1.set(1, { lat: 0, lng: 0 });
nodeCoords1.set(2, { lat: 0, lng: 0.1 }); // ~11km
nodeCoords1.set(3, { lat: 0, lng: 0.2 }); // ~22km

const connectedComponent1 = { wayIds: [100, 102] };
const graph1 = buildWayConnectivityGraph(ways1);

const assembled1 = assemble(connectedComponent1, graph1, ways1, nodeCoords1);

// Point is exactly at Node 2
const pt = { lat: 0, lng: 0.1 };

const segments1 = assembled1.getTraversableSegments();
assert.strictEqual(segments1.length, 1);

const proj1 = projectPointOntoCorridor(pt, segments1[0]);
const alongTrack1 = proj1.alongTrackDistanceMetres;

// Now simulate INCREMENTAL GROWTH: a new intersecting way appears at Node 2!
const ways2 = new Map(ways1);
ways2.set(101, { id: 101, nodeIds: [2, 4] });

const nodeCoords2 = new Map(nodeCoords1);
nodeCoords2.set(4, { lat: 0.1, lng: 0.1 });

const connectedComponent2 = { wayIds: [100, 101, 102] };
const graph2 = buildWayConnectivityGraph(ways2);

const assembled2 = assemble(connectedComponent2, graph2, ways2, nodeCoords2);

const segments2 = assembled2.getTraversableSegments();
assert.strictEqual(segments2.length, 3); // [1->2], [2->3], [2->4]

// Project a point slightly past Node 2 on the way to Node 3
const pt2 = { lat: 0, lng: 0.15 };

const proj1_pt2 = projectPointOntoCorridor(pt2, segments1[0]);
const origAlongTrack = proj1_pt2.alongTrackDistanceMetres;

let bestProj = null;
for (const seg of segments2) {
    const p = projectPointOntoCorridor(pt2, seg);
    if (p && (!bestProj || p.crossTrackDistanceMetres < bestProj.crossTrackDistanceMetres)) {
        bestProj = p;
    }
}

const newAlongTrack = bestProj.alongTrackDistanceMetres;

// The original offset was relative to Node 1. The new offset is relative to Node 2.
assert.ok(Math.abs(origAlongTrack - newAlongTrack) > 1000, 'Original and new along-track should differ significantly');
assert.ok(Math.abs((origAlongTrack - newAlongTrack) - alongTrack1) < 1, 'The difference should be exactly the distance from Node 1 to Node 2');
console.log("Test Passed! Topology growth destabilizes along-track offset.");
});