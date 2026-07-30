const fs = require('fs');
const path = require('path');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../server/corridor-resolver/corridor-graph.js');
const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');
const { projectPointOntoCorridor } = require('../server/calculations/projection.js');

// 1. Load NDLS fixture
const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);

// 2. Build topology
const { nodeCoords, ways } = indexOverpassElements(data.elements);
const graph = buildWayConnectivityGraph(ways);

// Find the largest connected component
let largestCC = { wayIds: [] };
for (const wayId of ways.keys()) {
    const cc = findConnectedWays(wayId, graph);
    if (cc.wayIds.length > largestCC.wayIds.length) {
        largestCC = cc;
    }
}

// 3. Assemble Corridor
const assembled = assemble(largestCC, graph, ways, nodeCoords);

// 4. Find a split way (a node with >2 degree)
const branchNodes = assembled.branchCount; // This is a count, but let's find a node with >2 ways
let splitNodeId = null;
for (const [nodeId, wayIds] of graph.nodeToWays.entries()) {
    if (wayIds.length >= 3 && largestCC.wayIds.includes(wayIds[0])) {
        splitNodeId = nodeId;
        break;
    }
}

const splitNode = nodeCoords.get(splitNodeId);

// We offset the point slightly to see projection disagreement
const testPoint = { lat: splitNode.lat + 0.00005, lng: splitNode.lng + 0.00005 };

// 5. BEFORE: Project onto raw ways
const rawWaySegments = [];
for (const wayId of largestCC.wayIds) {
    const way = ways.get(wayId);
    const coords = [];
    for (const nId of way.nodeIds) {
        const c = nodeCoords.get(nId);
        if (c) coords.push(c);
    }
    if (coords.length > 1) rawWaySegments.push(coords);
}

let bestRawDist = Infinity;
let bestRawProj = null;
for (const segment of rawWaySegments) {
    const proj = projectPointOntoCorridor(testPoint, segment);
    if (proj && proj.crossTrackDistanceMetres < bestRawDist) {
        bestRawDist = proj.crossTrackDistanceMetres;
        bestRawProj = proj;
    }
}

// 6. AFTER: Project onto assembled segments
const assembledSegments = assembled.getTraversableSegments();
let bestAssembledDist = Infinity;
let bestAssembledProj = null;
for (const segment of assembledSegments) {
    const proj = projectPointOntoCorridor(testPoint, segment);
    if (proj && proj.crossTrackDistanceMetres < bestAssembledDist) {
        bestAssembledDist = proj.crossTrackDistanceMetres;
        bestAssembledProj = proj;
    }
}

console.log(`Split Node ID: ${splitNodeId}`);
console.log(`BEFORE (Raw Ways) Cross-track: ${bestRawDist} meters`);
console.log(`AFTER (Assembled Corridor) Cross-track: ${bestAssembledDist} meters`);
const disagreement = Math.abs(bestRawDist - bestAssembledDist);
console.log(`Disagreement: ${disagreement} meters`);

