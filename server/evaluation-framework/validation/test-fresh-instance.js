const { createRailAwareService } = require('../../application/bootstrap/createRailAwareService.js');

function runTest() {
  console.log("Running Fresh Instance Isolation Test...");

  // Instantiate two separate services
  const serviceA = createRailAwareService({
    overpass: {},
    railradarMinEvidence: 1
  });

  const serviceB = createRailAwareService({
    overpass: {},
    railradarMinEvidence: 1
  });

  let failed = false;

  function assertIsolated(name, objA, objB) {
    if (objA === objB) {
      console.error(`[FAIL] ${name} is shared between instances!`);
      failed = true;
    } else {
      console.log(`[PASS] ${name} is isolated.`);
    }
  }

  assertIsolated('RailAwareService instance', serviceA, serviceB);
  assertIsolated('trajectoryManager', serviceA.trajectoryManager, serviceB.trajectoryManager);
  assertIsolated('discoveryService', serviceA.discoveryService, serviceB.discoveryService);
  assertIsolated('observationStore', serviceA.store, serviceB.store);

  // Drill into discoveryService collaborators
  assertIsolated('corridorResolver', serviceA.discoveryService.corridorResolver, serviceB.discoveryService.corridorResolver);
  assertIsolated('stationResolver', serviceA.discoveryService.stationResolver, serviceB.discoveryService.stationResolver);
  assertIsolated('strategyManager', serviceA.discoveryService.strategyManager, serviceB.discoveryService.strategyManager);

  if (failed) {
    console.error("Test Failed: Composition root leaked stateful collaborators.");
    process.exit(1);
  } else {
    console.log("Test Passed: Full isolation verified.");
  }
}

runTest();
