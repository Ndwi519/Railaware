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

        return { corridors, stations: [], elements };
    }
}

async function runTest() {
  const overpassClient = new MockOverpass();
  const service = createSpatialAwarenessService({ overpassClient, thresholds: { DEFAULT_THRESHOLDS } });

  // Location near both 1317674192 and 77366984
  const loc = { lat: 28.6261811, lng: 77.2407131 }; 

  console.log("=== PARALLEL DISCONNECTED TRACKS TEST ===");
  const result = await service.getNearbyAwareness(loc);
  console.log(`Found ${result.nearbyTracks.length} tracks.`);
  console.log(JSON.stringify(result.nearbyTracks, null, 2));
}

runTest().catch(console.error);
