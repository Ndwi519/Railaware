const fs = require('fs');
const path = require('path');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../server/corridor-resolver/corridor-graph.js');
const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');

const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);

const { nodeCoords, ways } = indexOverpassElements(data.elements);
const graph = buildWayConnectivityGraph(ways);

let largestCC = { wayIds: [] };
for (const wayId of ways.keys()) {
    const cc = findConnectedWays(wayId, graph);
    if (cc.wayIds.length > largestCC.wayIds.length) {
        largestCC = cc;
    }
}

const run1 = assemble(largestCC, graph, ways, nodeCoords);
const run2 = assemble(largestCC, graph, ways, nodeCoords);

const segs1 = run1.getTraversableSegments();
const segs2 = run2.getTraversableSegments();

console.log("Count equal:", segs1.length === segs2.length);

let identical = true;
for (let i = 0; i < segs1.length; i++) {
    const s1 = segs1[i];
    const s2 = segs2[i];
    if (s1.wayId !== s2.wayId || s1.startIndex !== s2.startIndex || s1.endIndex !== s2.endIndex) {
        identical = false;
        console.log(`Mismatch at ${i}:`, s1, s2);
        break;
    }
}

console.log("Ordering identical:", identical);
