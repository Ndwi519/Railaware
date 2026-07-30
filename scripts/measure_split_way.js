const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');
const { projectPointOntoCorridor } = require('../server/calculations/projection.js');

// 1. Create a synthetic split-way scenario
// A train comes from the West, then the track splits.
// It's a Y-junction at Node 2.
const ways = new Map();
const nodeCoords = new Map();
const graph = { edges: new Map(), nodeToWays: new Map() };

function addNode(id, lat, lng) {
    nodeCoords.set(id, { lat, lng });
}

addNode(1, 10.00000, 20.00000); // Start
addNode(2, 10.00010, 20.00010); // Split point
addNode(3, 10.00020, 20.00015); // Northern branch (say, passenger)
addNode(4, 10.00015, 20.00025); // Eastern branch (say, freight)

function addWay(id, nodeIds) {
    ways.set(id, { id, nodeIds });
    graph.edges.set(id, []);
    nodeIds.forEach(nId => {
        if (!graph.nodeToWays.has(nId)) graph.nodeToWays.set(nId, []);
        graph.nodeToWays.get(nId).push(id);
    });
}

// Way 1 (Trunk): Node 1 -> Node 2
addWay(1, [1, 2]);
// Way 2 (Branch A): Node 2 -> Node 3
addWay(2, [2, 3]);
// Way 3 (Branch B): Node 2 -> Node 4
addWay(3, [2, 4]);

function connectWays(w1, w2) {
    graph.edges.get(w1).push(w2);
    graph.edges.get(w2).push(w1);
}

connectWays(1, 2);
connectWays(1, 3);
connectWays(2, 3);

// The connected component
const connectedComponent = { wayIds: [1, 2, 3] };

// 2. Point to project. We place a GPS point near the northern branch but offset.
const point = { lat: 10.00018, lng: 20.00014 }; // Close to Node 3

// 3. BEFORE: Project onto raw ways
const rawWaySegments = [
    [nodeCoords.get(1), nodeCoords.get(2)], // Way 1
    [nodeCoords.get(2), nodeCoords.get(3)], // Way 2
    [nodeCoords.get(2), nodeCoords.get(4)]  // Way 3
];

let bestRawDist = Infinity;
for (const segment of rawWaySegments) {
    const proj = projectPointOntoCorridor(point, segment);
    if (proj && proj.crossTrackDistanceMetres < bestRawDist) {
        bestRawDist = proj.crossTrackDistanceMetres;
    }
}

// 4. AFTER: Project onto assembled corridor segments
const assembled = assemble(connectedComponent, graph, ways, nodeCoords);
const assembledSegments = assembled.getTraversableSegments();

let bestAssembledDist = Infinity;
for (const segment of assembledSegments) {
    const proj = projectPointOntoCorridor(point, segment);
    if (proj && proj.crossTrackDistanceMetres < bestAssembledDist) {
        bestAssembledDist = proj.crossTrackDistanceMetres;
    }
}

console.log(`BEFORE (Raw Ways): ${bestRawDist} meters`);
console.log(`AFTER (Assembled Corridor): ${bestAssembledDist} meters`);
console.log(`Disagreement: ${Math.abs(bestRawDist - bestAssembledDist)} meters`);
