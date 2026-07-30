const { createSpatialAwarenessService } = require('../server/application/services/createSpatialAwarenessService.js');
const { DEFAULT_THRESHOLDS } = require('../server/config/thresholds.js');
const fs = require('fs');
const path = require('path');
const { indexOverpassElements } = require('../server/corridor-resolver/corridor-graph.js');
const { haversineMetres } = require('../server/calculations/haversine.js');

const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);
const { nodeCoords, ways } = indexOverpassElements(data.elements);

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
            if (inRange) filteredWays.push(way);
        }

        // Inject synthetic isolated track exactly at locSingle
        if (location.lat === 28.583113 && location.lng === 77.227050) {
            filteredWays.push({
                id: 999999999,
                nodeIds: [888888881, 888888882]
            });
            nodeCoords.set(888888881, { lat: 28.583100, lng: 77.227050 });
            nodeCoords.set(888888882, { lat: 28.583120, lng: 77.227050 });
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

        // Inject synthetic elements for the isolated track
        if (location.lat === 28.583113 && location.lng === 77.227050) {
            elements.push({ type: 'node', id: 888888881, lat: 28.583100, lon: 77.227050 });
            elements.push({ type: 'node', id: 888888882, lat: 28.583120, lon: 77.227050 });
            elements.push({ type: 'way', id: 999999999, nodes: [888888881, 888888882], tags: { railway: 'rail' } });
        }

        return { corridors, stations: [], elements };
    }
}

async function runMultiTrackTest() {
  const overpassClient = new MockOverpass();
  const service = createSpatialAwarenessService({ overpassClient, thresholds: { DEFAULT_THRESHOLDS } });

  // Test 1: Multi-track location (near 1317674192 and 77366984)
  const locMulti = { lat: 28.6261811, lng: 77.2407131 };
  console.log("=== TEST 1: MULTI-TRACK LOCATION ===");
  const resultMulti = await service.getNearbyAwareness(locMulti);
  console.log(`Found ${resultMulti.nearbyTracks.length} tracks.`);
  console.log(JSON.stringify(resultMulti.nearbyTracks, null, 2));

  // Test 2: Isolated location
  // A point with a synthetic isolated track
  const locSingle = { lat: 28.583113, lng: 77.227050 };
  console.log("\n=== TEST 2: SINGLE-TRACK LOCATION ===");
  const resultSingle = await service.getNearbyAwareness(locSingle);
  console.log(`Found ${resultSingle.nearbyTracks.length} tracks.`);
  console.log(JSON.stringify(resultSingle.nearbyTracks, null, 2));
}

runMultiTrackTest().catch(console.error);
