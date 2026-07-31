const fs = require('fs');
const path = require('path');
const { CorridorResolver } = require('../resolver');
const { OverpassClient } = require('../overpass');
const _corridorAssembly = require('../../corridor-assembly/CorridorAssembly');

describe('NDLS Multi-cluster Regression', () => {
  let originalAssemble;
  let clustersFound;

  beforeEach(() => {
    clustersFound = [];
    originalAssemble = _corridorAssembly.assemble;
    _corridorAssembly.assemble = function (cluster, graph, filteredWays, nodeCoords) {
      if (cluster.wayIds.includes(1317674192) || cluster.wayIds.includes(77366984)) {
        clustersFound.push(cluster.wayIds);
      }
      return originalAssemble.call(this, cluster, graph, filteredWays, nodeCoords);
    };
  });

  afterEach(() => {
    _corridorAssembly.assemble = originalAssemble;
  });

  it('assembles way IDs 1317674192 and 77366984 into distinct assembled corridors', async () => {
    const fixturePath = path.join(__dirname, '../../fixtures/ndls_success.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const resolver = new CorridorResolver({});

    // Mock overpass fetch to use fixture data directly
    resolver.overpass = {
      fetchNearbyRailways: async () => {
        const client = new OverpassClient({ gridSizeDeg: 0.005 });
        const p = client.parseOverpassData(fixture);
        return { corridors: p.corridors, stations: p.stations, elements: fixture.elements };
      }
    };

    // Use test coordinates where both ways should survive the proximity pre-filter
    const location = { lat: 28.630, lng: 77.235 };
    const radiusMetres = 500;

    await resolver.resolveAllClusters(location, radiusMetres);

    // Because the ways share zero nodes and have no connecting path inside this radius,
    // they should be processed in two completely separate clusters.
    expect(clustersFound.length).toBe(2);

    // Verify each way ID ends up in its own cluster, not merged
    const hasWay1 = clustersFound.some(cluster => cluster.includes(1317674192));
    const hasWay2 = clustersFound.some(cluster => cluster.includes(77366984));

    expect(hasWay1).toBe(true);
    expect(hasWay2).toBe(true);

    // Ensure they didn't somehow end up in the exact same cluster array
    const sameCluster = clustersFound.some(cluster => cluster.includes(1317674192) && cluster.includes(77366984));
    expect(sameCluster).toBe(false);
  });
});