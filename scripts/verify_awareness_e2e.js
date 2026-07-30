const { createSpatialAwarenessService } = require('../server/application/services/createSpatialAwarenessService.js');
const { DEFAULT_THRESHOLDS } = require('../server/config/thresholds.js');

// 1. Load NDLS fixture for MockOverpass
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

async function runVerification() {
  const overpassClient = new MockOverpass();
  
  // Create stateless service
  const service = createSpatialAwarenessService({ 
    overpassClient, 
    thresholds: { DEFAULT_THRESHOLDS } 
  });

  // Use Tick 10 real location
  const loc = { lat: 28.63311335685655, lng: 77.22705032468158 };

  console.log("Calling getNearbyAwareness...");
  const result = await service.getNearbyAwareness(loc);

  console.log("\n=== SPATIAL AWARENESS RESULT ===");
  console.log(JSON.stringify(result, null, 2));
}

runVerification().catch(console.error);
