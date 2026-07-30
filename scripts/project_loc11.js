const fs = require('fs');
const { projectPointOntoCorridor } = require('../server/calculations/projection.js');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../server/corridor-resolver/corridor-graph.js');
const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');

const merged10 = JSON.parse(fs.readFileSync('e:/Railaware/scripts/merged10_500.json', 'utf8'));
const { nodeCoords: nc10, ways: w10 } = indexOverpassElements(merged10);
const graph10 = buildWayConnectivityGraph(w10);
const cc10 = findConnectedWays(34940854, graph10);
const assembled10 = assemble(cc10, graph10, w10, nc10);

const merged11 = JSON.parse(fs.readFileSync('e:/Railaware/scripts/merged11_500.json', 'utf8'));
const { nodeCoords: nc11, ways: w11 } = indexOverpassElements(merged11);
const graph11 = buildWayConnectivityGraph(w11);
const cc11 = findConnectedWays(34940854, graph11);
const assembled11 = assemble(cc11, graph11, w11, nc11);

// True GPS point at Tick 10
const loc10 = { lat: 28.63311335685655, lng: 77.22705032468158 };
// True GPS point at Tick 11
const loc11 = { lat: 28.632963026572767, lng: 77.22743131390004 };

function proj(assembled, loc) {
    const segments = assembled.getTraversableSegments();
    let best = null, bestIdx = -1;
    for (let i = 0; i < segments.length; i++) {
        const p = projectPointOntoCorridor(loc, segments[i]);
        if (p && (!best || p.crossTrackDistanceMetres < best.crossTrackDistanceMetres)) {
            best = p; bestIdx = i;
        }
    }
    return { best, bestIdx };
}

const c10_on_10 = proj(assembled10, loc10);
const c11_on_11 = proj(assembled11, loc11);
const c10_on_11 = proj(assembled11, loc10);

console.log("=== Tick 10 Point on Tick 10 Assembly ===");
console.log("Segment:", c10_on_10.bestIdx, "BranchID:", assembled10.getBranchId(c10_on_10.bestIdx));
console.log("AlongTrack:", c10_on_10.best.alongTrackDistanceMetres);

console.log("\n=== Tick 11 Point on Tick 11 Assembly ===");
console.log("Segment:", c11_on_11.bestIdx, "BranchID:", assembled11.getBranchId(c11_on_11.bestIdx));
console.log("AlongTrack:", c11_on_11.best.alongTrackDistanceMetres);

console.log("\n=== Tick 10 Point on Tick 11 Assembly ===");
console.log("Segment:", c10_on_11.bestIdx, "BranchID:", assembled11.getBranchId(c10_on_11.bestIdx));
console.log("AlongTrack:", c10_on_11.best.alongTrackDistanceMetres);
