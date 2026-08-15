const { CorridorResolver } = require('../resolver.js');
const fs = require('fs');
const path = require('path');
const { ResolutionStatus } = require('../../domain/types/enums.js');

class MockOverpassClient {
  constructor(elements, stations) {
    this.elements = elements;
    this.stations = stations;
  }

  async fetchNearbyRailways(location, radiusMetres) {
    // We mock the parsed corridors as well since the real overpass.js still parses them
    const corridors = [];

    // We only need one dummy corridor to trigger the nearest selection
    if (this.elements.length > 0) {
      corridors.push({
        id: "77366967", // Matches the seed way in ndls_success.json
        name: "Test Corridor",
        topology: {
          points: [{lat: location.lat, lng: location.lng}],
          nodeDistanceLookup: {},
          authoritativeNodeLookup: {}
        }
      });
    }

    return {
      corridors,
      stations: this.stations,
      elements: this.elements
    };
  }
}

describe('Resolver Integration', () => {
  it('correctly orchestrates the new pipeline and preserves invariants', async () => {
    const fixturePath = path.join(__dirname, '../../fixtures/ndls_success.json');
    const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Stations array mocked for matching
    const mockStations = [
      {
        feature: {
          id: '123',
          station: { code: 'NDLS' },
          lat: 28.6425,
          lng: 77.2197
        },
        hasRefIR: true,
        hasName: true,
        id: 123
      }
    ];

    const overpass = new MockOverpassClient(rawData.elements, mockStations);
    const resolver = new CorridorResolver(overpass);

    const location = { lat: 28.6425, lng: 77.2197 }; // NDLS
    const radiusMetres = 1000;

    const startTime = process.hrtime.bigint();
    const result = await resolver.resolveNearest(location, radiusMetres);
    const endTime = process.hrtime.bigint();
    const execTimeMs = Number(endTime - startTime) / 1000000;

    expect(result).not.toBeNull();

    // Graph-relative metrics exist (ProjectionResult contract unchanged)
    expect(result.nearestCorridor.closestPoint).not.toBeNull();
    expect(result.nearestCorridor.closestPoint.lat).toBeGreaterThan(28.6);
    expect(result.nearestCorridor.closestPoint.lng).toBeGreaterThan(77.2);
    expect(result.nearestCorridor.resolutionStatus).toBe(ResolutionStatus.RESOLVED);
    expect(Array.isArray(result.nearestCorridor.stations)).toBe(true);
    expect(result.nearestCorridor.stations.length).toBe(1);
    expect(result.nearestCorridor.stations[0].station.code).toBe('NDLS');

    // Route-relative metrics are explicitly null as per V1.1 Architecture
    expect(result.nearestCorridor.corridorGeometry).toBeNull();
    expect(result.nearestCorridor.segmentLengthKm).toBeNull();
    expect(result.nearestCorridor.userSegmentFraction).toBeNull();

    // Graph Foundation / Corridor Assembly verifications belong to their respective unit tests.
    // Here we only verify that the Resolver successfully orchestrated the pipeline and returned a valid response.
    // The presence of a projected closestPoint and matched stations proves that the pipeline executed successfully.

    // Verify determinism across repeated runs
    const result2 = await resolver.resolveNearest(location, radiusMetres);
    expect(result).toEqual(result2);

    console.log('--- NDLS Resolver Integration Report ---');
    console.log(`Matched Stations: ${result.nearestCorridor.stations.length}`);
    console.log(`Execution Time: ${execTimeMs.toFixed(3)} ms`);

    // execution time should be under 2000ms to prevent flaky failures on CI while still ensuring no crazy loops
    expect(execTimeMs).toBeLessThan(2000);
  });

  it('returns null when no elements found', async () => {
    const overpass = new MockOverpassClient([], []);
    const resolver = new CorridorResolver(overpass);
    const result = await resolver.resolveNearest({ lat: 0, lng: 0 }, 1000);
    expect(result).toBeNull();
  });
});
