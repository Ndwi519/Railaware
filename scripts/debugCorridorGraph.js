const fs = require('fs');
const path = require('path');
const {
  indexOverpassElements,
  buildWayConnectivityGraph,
  findConnectedWays,
  summariseConnectivity
} = require('../server/corridor-resolver/corridor-graph.js');

function run() {
  const fixturePathArg = process.argv[2] || path.join(__dirname, '../server/fixtures/ndls_success.json');
  const seedWayIdArg = process.argv[3] ? parseInt(process.argv[3], 10) : 77366967;

  let fixtureRaw;
  try {
    fixtureRaw = fs.readFileSync(fixturePathArg, 'utf8');
  } catch (err) {
    console.log("NDLS fixture unavailable. Graph diagnostics skipped.");
    return;
  }

  let fixture;
  try {
    fixture = JSON.parse(fixtureRaw);
  } catch (err) {
    console.log("NDLS fixture unavailable. Graph diagnostics skipped.");
    return;
  }

  if (!fixture.elements || fixture.elements.length === 0) {
    console.log("NDLS fixture unavailable. Graph diagnostics skipped.");
    return;
  }

  const { nodeCoords, ways } = indexOverpassElements(fixture.elements);

  if (ways.size === 0) {
    console.log("NDLS fixture unavailable. Graph diagnostics skipped.");
    return;
  }

  const graph = buildWayConnectivityGraph(ways);

  // Extract stationPoints from fixture manually, without relying on station-helper.js
  const stationPoints = [];
  for (const el of fixture.elements) {
    if (el.type === 'node' && el.tags && el.tags.railway === 'station') {
      let code = el.tags.ref || el.tags.station_code || el.tags.name;
      if (code) {
        stationPoints.push({
          code,
          lat: el.lat,
          lng: el.lon
        });
      }
    }
  }

  const summary = summariseConnectivity({
    seedWayId: seedWayIdArg,
    ways,
    nodeCoords,
    graph,
    stationPoints
  });

  console.log(`Seed way ID: ${summary.seedWayId}`);
  console.log(`Connected way count: ${summary.connectedWayCount}`);
  console.log(`Connected node count: ${summary.connectedNodeCount}`);
  console.log(`Branch node count: ${summary.branchNodeCount}`);
  console.log(`Reachable station codes: ${summary.reachableStationCodes.join(', ')}`);
  console.log(`Max graph depth: ${summary.maxGraphDepth}`);
  console.log(`Truncated: ${summary.truncated}`);
}

run();
