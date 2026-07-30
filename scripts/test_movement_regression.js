const fs = require('fs');
const path = require('path');
const { indexOverpassElements, buildWayConnectivityGraph, findConnectedWays } = require('../server/corridor-resolver/corridor-graph.js');
const { assemble } = require('../server/corridor-assembly/CorridorAssembly.js');
const { CorridorResolver } = require('../server/corridor-resolver/resolver.js');
const MovementTraceGenerator = require('../server/evaluation-framework/validation/MovementTraceGenerator.js');
const { haversineMetres } = require('../server/calculations/haversine.js');

// 1. Load NDLS fixture
const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);

// 2. Build topology
const { nodeCoords, ways } = indexOverpassElements(data.elements);
const graph = buildWayConnectivityGraph(ways);

// Find the largest connected component to generate the ground-truth trace
let largestCC = { wayIds: [] };
let bestSeedId = null;
for (const wayId of ways.keys()) {
    const cc = findConnectedWays(wayId, graph);
    if (cc.wayIds.length > largestCC.wayIds.length) {
        largestCC = cc;
        bestSeedId = wayId;
    }
}

// Mock overpass with REALISTIC LOCATION SCOPING
class MockOverpass {
    async fetchNearbyRailways(location, radiusMetres) {
        const filteredWays = [];
        for (const way of ways.values()) {
            let inRange = false;
            for (const nId of way.nodeIds) {
                const coord = nodeCoords.get(nId);
                if (coord && haversineMetres(location.lat, location.lng, coord.lat, coord.lng) <= radiusMetres) {
                    inRange = true;
                    break;
                }
            }
            if (inRange) {
                filteredWays.push(way);
            }
        }

        const corridors = filteredWays.map(w => ({
            id: w.id.toString(),
            topology: { points: w.nodeIds.map(n => nodeCoords.get(n)) }
        }));

        const elements = data.elements.filter(e => {
            if (e.type === 'way') return filteredWays.some(w => w.id === e.id);
            if (e.type === 'node') {
                const coord = nodeCoords.get(e.id);
                return coord && haversineMetres(location.lat, location.lng, coord.lat, coord.lng) <= radiusMetres;
            }
            return false;
        });

        return {
            corridors,
            stations: [],
            elements
        };
    }
}

async function runScenario(radius) {
    console.log(`\n=== SCENARIO: Radius ${radius}m (HYSTERESIS ENABLED) ===`);
    const assembled = assemble(largestCC, graph, ways, nodeCoords);
    const resolver = new CorridorResolver(new MockOverpass());

    const ticks = MovementTraceGenerator.generateTrace({
        assembledCorridor: assembled,
        startSegmentIndex: 0,
        startDistance: 0,
        tickCount: 20,
        speedMetresPerTick: 40,
        isForward: true,
        applyNoise: true
    });

    let lastAlongTrack = -1;
    let previousSessionState = { sessionId: 'test-session-' + radius };
    let simulatedTime = Date.now();

    for (const tick of ticks) {
        const pt = { lat: tick.lat, lng: tick.lng };
        const result = await resolver.resolveNearest(pt, radius, previousSessionState, { currentTime: simulatedTime });
        if (radius === 500) {
            if (tick.tickIndex === 10) {
                const { corridorCache } = require('../server/application/services/InMemoryCorridorCache.js');
                require('fs').writeFileSync('e:/Railaware/scripts/merged10_500.json', JSON.stringify(Array.from(corridorCache.cache.get(previousSessionState.sessionId).values())));
            }
            if (tick.tickIndex === 11) {
                const { corridorCache } = require('../server/application/services/InMemoryCorridorCache.js');
                require('fs').writeFileSync('e:/Railaware/scripts/merged11_500.json', JSON.stringify(Array.from(corridorCache.cache.get(previousSessionState.sessionId).values())));
            }
        }
        
        if (!result || !result.projectionResult) {
            console.log(`Tick ${tick.tickIndex}: RESOLVER FAILED TO MATCH OR PROJECT (null)`);
            previousSessionState = { sessionId: 'test-session-' + radius };
            continue;
        }

        const proj = result.projectionResult;
        const currentAlongTrack = proj.alongTrackDistanceMetres;
        
        // Calculate simulated speed (e.g. 40m per 10s = 4m/s)
        const diff = lastAlongTrack === -1 ? 0 : Math.abs(currentAlongTrack - lastAlongTrack);
        const speed = diff / 10; // 10 seconds per tick

        // Update session state for the next tick
        previousSessionState = {
            sessionId: 'test-session-' + radius,
            referenceWayId: result.referenceWayId,
            lastAlongTrack: currentAlongTrack,
            lastCorridorSegmentIndex: proj.corridorSegmentIndex,
            timestamp: simulatedTime,
            lastSpeed: speed
        };
        simulatedTime += 10000; // Fake 10s tick interval
        
        let flags = [];
        if (lastAlongTrack !== -1) {
            const diff = Math.abs(currentAlongTrack - lastAlongTrack);
            if (currentAlongTrack < lastAlongTrack) {
                if (currentAlongTrack < 1) {
                    flags.push(`RESET TO 0 (Jump: ${diff.toFixed(2)}m)`);
                } else {
                    flags.push(`BACKWARD JUMP (Diff: ${diff.toFixed(2)}m)`);
                }
            } else if (diff > 100) { 
                flags.push(`MASSIVE FORWARD JUMP (Diff: ${diff.toFixed(2)}m)`);
            }
        }

        console.log(`Tick ${tick.tickIndex}: ` +
            `SegID: ${proj.corridorSegmentIndex}, ` +
            `AlongTrack: ${currentAlongTrack.toFixed(2)}m, ` +
            `Offset: ${proj.crossTrackDistanceMetres.toFixed(2)}m ` + 
            (flags.length > 0 ? `[FLAGS: ${flags.join(', ')}]` : '')
        );

        lastAlongTrack = currentAlongTrack;
    }
}

async function runAll() {
    await runScenario(300);
    await runScenario(500);
}

runAll().catch(console.error);
