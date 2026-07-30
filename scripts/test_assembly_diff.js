const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../server/corridor-resolver/corridor-graph.js');
const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');
const fs = require('fs');
const { projectPointOntoCorridor } = require('../server/calculations/projection.js');

const seedWayId = 34940854;

const merged10 = JSON.parse(fs.readFileSync('e:/Railaware/scripts/merged10_500.json', 'utf8'));
const merged11 = JSON.parse(fs.readFileSync('e:/Railaware/scripts/merged11_500.json', 'utf8'));

console.log(`Tick 10 merged elements: ${merged10.length}`);
console.log(`Tick 11 merged elements: ${merged11.length}`);

function doAssemble(merged) {
    const { nodeCoords, ways } = indexOverpassElements(merged);
    const graph = buildWayConnectivityGraph(ways);
    const connectedComponent = findConnectedWays(seedWayId, graph);
    return assemble(connectedComponent, graph, ways, nodeCoords);
}

const assembled10 = doAssemble(merged10);
const assembled11 = doAssemble(merged11);

console.log(`Tick 10 Branch Count: ${assembled10.getBranchCount()}`);
console.log(`Tick 11 Branch Count: ${assembled11.getBranchCount()}`);

// The exact generated GPS point at Tick 10 from the 500m regression
const loc10 = { lat: 28.63311335685655, lng: 77.22705032468158 };

function findCandidate(assembled, loc) {
    const segments = assembled.getTraversableSegments();
    let best = null;
    let bestIdx = -1;
    for (let i = 0; i < segments.length; i++) {
        const proj = projectPointOntoCorridor(loc, segments[i]);
        if (proj && (!best || proj.crossTrackDistanceMetres < best.crossTrackDistanceMetres)) {
            best = proj;
            bestIdx = i;
        }
    }
    return { best, bestIdx };
}

const c10 = findCandidate(assembled10, loc10);
const c11 = findCandidate(assembled11, loc10); 

console.log(`\nProjection of exactly Tick 10 GPS Point on Tick 10 Assembly:`);
console.log(`Segment Index: ${c10.bestIdx}, Branch ID: ${assembled10.getBranchId(c10.bestIdx)}`);
console.log(`AlongTrack (Local to Branch): ${c10.best.alongTrackDistanceMetres.toFixed(2)}m`);
console.log(`CrossTrack: ${c10.best.crossTrackDistanceMetres.toFixed(2)}m`);

console.log(`\nProjection of exactly Tick 10 GPS Point on Tick 11 Assembly (Growth Destabilization check):`);
console.log(`Segment Index: ${c11.bestIdx}, Branch ID: ${assembled11.getBranchId(c11.bestIdx)}`);
console.log(`AlongTrack (Local to Branch): ${c11.best.alongTrackDistanceMetres.toFixed(2)}m`);
console.log(`CrossTrack: ${c11.best.crossTrackDistanceMetres.toFixed(2)}m`);
