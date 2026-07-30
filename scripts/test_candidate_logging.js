const fs = require('fs');
const path = require('path');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../server/corridor-resolver/corridor-graph.js');
const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');
const MovementTraceGenerator = require('../server/evaluation-framework/validation/MovementTraceGenerator.js');
const { evaluateCandidates } = require('../server/projection-adapter/CandidateEvaluator.js');
const { selectBestCandidate } = require('../server/projection-adapter/CandidateSelector.js');
const { CorridorResolver } = require('../server/corridor-resolver/resolver.js');

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

const assembled = assemble(largestCC, graph, ways, nodeCoords);

const ticks = MovementTraceGenerator.generateTrace({
    assembledCorridor: assembled,
    startSegmentIndex: 0,
    startDistance: 0,
    tickCount: 3,
    speedMetresPerTick: 40,
    isForward: true,
    applyNoise: true
});

const segments = assembled.getTraversableSegments();

for (const tick of ticks) {
    if (tick.tickIndex === 2) {
        console.log(`\n=== TICK 2 CANDIDATE EVALUATION ===`);
        const pt = { lat: tick.lat, lng: tick.lng };
        const candidates = evaluateCandidates(segments, pt);
        
        console.log("Evaluated Candidates:");
        for (const c of candidates) {
            console.log(`SegIdx: ${c.evaluationOrder}, ` + 
                `CrossTrack: ${c.result.crossTrackDistanceMetres.toFixed(2)}m, ` +
                `AlongTrack: ${c.result.alongTrackDistanceMetres.toFixed(2)}m`);
        }

        const best = selectBestCandidate(candidates);
        console.log(`\nWINNER: SegIdx: ${best.corridorSegmentIndex}, CrossTrack: ${best.crossTrackDistanceMetres.toFixed(2)}m`);
        
        console.log(`\nAre Seg 0 and Seg 11 topologically consecutive?`);
        // Check if Seg 11 is just the next segment along the same track, or a different branch
        // Seg 0 is the start segment. If 11 is consecutive, the alongTrackDistance of Seg 11 would be ~ Seg0.length.
        // Or we can check the geometry.
        const seg0 = segments[0];
        const seg11 = segments[11];
        console.log(`Seg0 length: ${seg0.lengthMetres?.toFixed(2) || 'unknown'}`);
        console.log(`Seg11 starts at AlongTrack: ${candidates.find(c => c.evaluationOrder === 11)?.result.alongTrackDistanceMetres.toFixed(2)}`);
    }
}
