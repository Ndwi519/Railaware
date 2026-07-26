const ValidationHarness = require('./ValidationHarness.js');
const { buildScenarios } = require('./ndls-scenarios.js');

async function main() {
  console.log('=== Shadow Mode Validation Harness ===');
  console.log('Initializing pipeline with NDLS Fixture...\n');

  const harness = new ValidationHarness();

  // Initialize to pre-warm the cache and extract topology
  // We use coordinates near NDLS to ensure we resolve it
  const resolver = await harness._initializePipeline(28.6425, 77.2197);

  const assembledCorridor = harness.assembledCorridorCache;
  const stationsOutput = harness.stationsOutputCache;

  console.log('\nBuilding deterministic scenarios...');
  const scenarios = buildScenarios(assembledCorridor, stationsOutput);

  const success = await harness.runAll(scenarios);
  if (!success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Validation Error:', err);
  process.exit(1);
});
