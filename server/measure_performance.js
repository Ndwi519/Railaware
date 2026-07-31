const { OverpassClient } = require('./corridor-resolver/overpass.js');
const { CorridorResolver } = require('./corridor-resolver/resolver.js');

async function measure() {
  const config = {
    url: 'https://overpass-api.de/api/interpreter',
    gridSizeDeg: 0.005,
    maxAttempts: 2,
    retryDelaysMs: [1000],
    requestTimeoutMs: 15000,
    cacheTtlSuccessMs: 30 * 60 * 1000,
    cacheTtlNoCorridorMs: 10 * 60 * 1000,
    cacheTtlTransientFailureMs: 5000,
  };
  const client = new OverpassClient(config);
  const resolver = new CorridorResolver(client);
  
  const location = { lat: 28.632, lng: 77.236 }; // NDLS Area (where crossing exists)
  const radiusMetres = 2000;

  console.log(`Starting performance measurement for ${radiusMetres}m radius...`);
  
  // Instrument Overpass fetch explicitly for timing (Resolver calls it internally, but we can wrap it)
  const originalFetch = client.fetchNearbyRailways.bind(client);
  client.fetchNearbyRailways = async (loc, rad) => {
    const start = process.hrtime.bigint();
    const res = await originalFetch(loc, rad);
    const end = process.hrtime.bigint();
    console.log(`(a) Overpass fetch + cache parse: ${Number(end - start) / 1e6} ms`);
    return res;
  };
  
  // Actually run
  const t0 = process.hrtime.bigint();
  const res = await resolver.resolveAllClusters(location, radiusMetres);
  const t1 = process.hrtime.bigint();
  
  console.log(`Total resolveAllClusters time (Cold): ${Number(t1 - t0) / 1e6} ms`);
  console.log(`Found ${res.assembledCorridors.length} corridors`);

  console.log(`\nStarting second performance measurement for ${radiusMetres}m radius (Cached)...`);
  const t2 = process.hrtime.bigint();
  const resCached = await resolver.resolveAllClusters(location, radiusMetres);
  const t3 = process.hrtime.bigint();

  console.log(`Total resolveAllClusters time (Cached): ${Number(t3 - t2) / 1e6} ms`);
  console.log(`Found ${resCached.assembledCorridors.length} corridors`);
}

measure().catch(console.error);