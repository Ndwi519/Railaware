const { CorridorResolver } = require('../server/corridor-resolver/resolver.js');

// 1. Setup the fake data representing our continuous way
// Way A: (10.00000, 20.00000) -> (10.00000, 20.00100)
// Way B: (10.00000, 20.00100) -> (10.00000, 20.00200)

const elements = [
    { type: 'node', id: 1, lat: 10.00000, lon: 20.00000 },
    { type: 'node', id: 2, lat: 10.00000, lon: 20.00100 },
    { type: 'node', id: 3, lat: 10.00000, lon: 20.00200 },
    { type: 'way', id: 1, nodes: [1, 2], tags: { railway: 'rail' } },
    { type: 'way', id: 2, nodes: [2, 3], tags: { railway: 'rail' } }
];

const corridors = [
    { 
        id: '1', 
        topology: { points: [{lat: 10.00000, lng: 20.00000}, {lat: 10.00000, lng: 20.00100}] }
    },
    { 
        id: '2', 
        topology: { points: [{lat: 10.00000, lng: 20.00100}, {lat: 10.00000, lng: 20.00200}] }
    }
];

// Mock overpass
class MockOverpass {
    async fetchNearbyRailways(location, radiusMetres) {
        return {
            corridors,
            stations: [],
            elements
        };
    }
}

async function run() {
    const resolver = new CorridorResolver(new MockOverpass());
    
    // The point from the previous test
    const point = { lat: 10.00010, lng: 20.00110 };
    console.log("Calling resolver.resolveNearest with point:", point);

    const result = await resolver.resolveNearest(point, 1000);
    
    if (!result) {
        console.error("Result is null!");
        return;
    }

    console.log("\n=== REAL PRODUCTION PIPELINE RESULT ===");
    console.log(`Cross-Track Distance: ${result.projectionResult.crossTrackDistanceMetres} m`);
    console.log(`Along-Track Distance: ${result.projectionResult.alongTrackDistanceMetres} m`);
    console.log(`Clamped? Interpolation Ratio: ${result.projectionResult.interpolationRatio}`);
    console.log(`Segment Index: ${result.projectionResult.segmentIndex}`);
    console.log(`Corridor Segment Index: ${result.projectionResult.corridorSegmentIndex}`);
}

run().catch(console.error);
