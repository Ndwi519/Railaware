const { CorridorResolver } = require('../server/corridor-resolver/resolver.js');

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

class MockOverpass {
    async fetchNearbyRailways(location, radiusMetres) {
        return { corridors, stations: [], elements };
    }
}

async function run() {
    const resolver = new CorridorResolver(new MockOverpass());
    
    // We will simulate a train moving from lng 20.00000 to 20.00200
    const points = [
        { lat: 10.00000, lng: 20.00020 }, // Early Way A
        { lat: 10.00000, lng: 20.00050 }, // Mid Way A
        { lat: 10.00000, lng: 20.00080 }, // Late Way A
        { lat: 10.00000, lng: 20.00100 }, // EXACTLY AT JOINT
        { lat: 10.00000, lng: 20.00120 }, // Early Way B
        { lat: 10.00000, lng: 20.00150 }, // Mid Way B
        { lat: 10.00000, lng: 20.00180 }  // Late Way B
    ];

    console.log("=== ALONG-TRACK CONTINUITY TEST ===");
    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const result = await resolver.resolveNearest(pt, 1000);
        
        console.log(`Point ${i} (lng: ${pt.lng}): ` +
            `Along-Track: ${result.projectionResult.alongTrackDistanceMetres.toFixed(2)} m, ` +
            `Segment Index: ${result.projectionResult.segmentIndex}, ` +
            `Interpolation Ratio: ${result.projectionResult.interpolationRatio.toFixed(3)}`
        );
    }
}

run().catch(console.error);
