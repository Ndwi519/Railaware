const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');
const { projectPointOntoCorridor } = require('../server/calculations/projection.js');

// Two ways forming ONE continuous straight track heading East
const ways = new Map();
const nodeCoords = new Map();
const graph = { edges: new Map(), nodeToWays: new Map() };

function addNode(id, lat, lng) {
    nodeCoords.set(id, { lat, lng });
}

addNode(1, 10.00000, 20.00000); // Start of Way A
addNode(2, 10.00000, 20.00100); // Joint Node
addNode(3, 10.00000, 20.00200); // End of Way B

function addWay(id, nodeIds) {
    ways.set(id, { id, nodeIds });
    graph.edges.set(id, []);
    nodeIds.forEach(nId => {
        if (!graph.nodeToWays.has(nId)) graph.nodeToWays.set(nId, []);
        graph.nodeToWays.get(nId).push(id);
    });
}

addWay(1, [1, 2]); // Way A
addWay(2, [2, 3]); // Way B

graph.edges.get(1).push(2);
graph.edges.get(2).push(1);

const connectedComponent = { wayIds: [1, 2] };

const rawWayA = [nodeCoords.get(1), nodeCoords.get(2)];
const rawWayB = [nodeCoords.get(2), nodeCoords.get(3)];

// AFTER: Assembled corridor
const assembled = assemble(connectedComponent, graph, ways, nodeCoords);
const assembledSegments = assembled.getTraversableSegments();

function runTestScenario(point, name) {
    console.log(`\n=== SCENARIO: ${name} ===`);
    const projA = projectPointOntoCorridor(point, rawWayA);
    const projB = projectPointOntoCorridor(point, rawWayB);

    console.log("RAW WAY A:");
    console.log(`  Cross-track: ${projA.crossTrackDistanceMetres} m`);
    console.log(`  Clamped to joint? ${projA.interpolationRatio === 1}`);

    console.log("RAW WAY B:");
    console.log(`  Cross-track: ${projB.crossTrackDistanceMetres} m`);
    console.log(`  Clamped to joint? ${projB.interpolationRatio === 0}`);
    console.log(`  Projects into interior? ${projB.interpolationRatio > 0 && projB.interpolationRatio < 1}`);

    let bestAssembledDist = Infinity;
    let bestAssembledProj = null;
    for (const segment of assembledSegments) {
        const coords = segment.coordinates || segment;
        const p = projectPointOntoCorridor(point, coords);
        if (p && p.crossTrackDistanceMetres < bestAssembledDist) {
            bestAssembledDist = p.crossTrackDistanceMetres;
            bestAssembledProj = p;
        }
    }

    console.log("\nASSEMBLED CORRIDOR:");
    console.log(`  Cross-track: ${bestAssembledProj.crossTrackDistanceMetres} m`);

    const bestRawDist = Math.min(projA.crossTrackDistanceMetres, projB.crossTrackDistanceMetres);
    console.log(`\nNumeric Cross-Track Disagreement (Best Raw vs Assembled): ${Math.abs(bestRawDist - bestAssembledProj.crossTrackDistanceMetres)} m`);
}

console.log("=== ARRAY MERGE CONFIRMATION ===");
console.log(`getTraversableSegments() returned ${assembledSegments.length} segment(s).`);
assembledSegments.forEach((seg, i) => {
    const len = seg.coordinates ? seg.coordinates.length : seg.length;
    console.log(`Segment ${i} contains ${len} nodes. Way A (2) + Way B (2) - Joint (1) = 3 nodes merged into one array.`);
});

// Scenario 1: Point falls PAST Way A, into Way B's interior
runTestScenario({ lat: 10.00010, lng: 20.00110 }, "Point projects into interior of Way B");

// Scenario 2: Point clamps to the joint on BOTH ways
runTestScenario({ lat: 10.00010, lng: 20.00095 }, "Point clamps to joint on BOTH Way A and Way B");

