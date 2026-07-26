const crypto = require('crypto');
const { createRailAwareService } = require('../../application/bootstrap/createRailAwareService.js');
const { CorridorResolver } = require('../../corridor-resolver/resolver.js');

class ValidationHarness {
  constructor() {
    this.railAwareService = null;
    this.assembledCorridorCache = null;
    this.stationsOutputCache = null;
    this.mockOverpassClient = null;
    this.allFailures = [];
  }

  /**
   * Initializes the pipeline exactly as it executes in production,
   * injecting only the Overpass fixture.
   */
  async _initializePipeline(lat, lng) {
    const rawData = require('../../fixtures/ndls_success.json');
    const mockStations = [
      { feature: { station: { code: 'NDLS' }, name: 'New Delhi', lat: 28.6425, lng: 77.2197, km: 0 } },
      { feature: { station: { code: 'SZM' }, name: 'Subzi Mandi', lat: 28.6653, lng: 77.2001, km: 3.5 } },
      { feature: { station: { code: 'TKJ' }, name: 'Tilak Bridge', lat: 28.6262, lng: 77.2405, km: 2.1 } }
    ];

    class MockOverpassClient {
      constructor() {
        this.elements = rawData.elements;
        this.stations = mockStations;
      }
      async fetchNearbyRailways(location, radiusMetres) {
        console.log("MockOverpassClient.fetchNearbyRailways called with:", location, "elements length:", this.elements ? this.elements.length : 'undefined');
        const corridors = [];
        if (this.elements && this.elements.length > 0) {
          corridors.push({
            id: "77366967",
            name: "NDLS Fixture Corridor",
            topology: { points: [{lat: location.lat, lng: location.lng}] },
            distance: 0,
            distanceToLine: 0
          });
        }
        console.log("MockOverpassClient returning corridors length:", corridors.length);
        return { corridors, stations: this.stations, elements: this.elements };
      }
    }

    this.mockOverpassClient = new MockOverpassClient();

    // Use the production composition root
    this.railAwareService = createRailAwareService({
      overpass: {}, // unused by mock
      railradarMinEvidence: 1,
      overpassClient: this.mockOverpassClient // Our injected fixture client
    });

    // Extract geometry directly to build scenarios without relying on the production pipeline to succeed
    const standaloneResolver = new CorridorResolver(this.mockOverpassClient);
    const result = await standaloneResolver.resolveNearest({ lat, lng }, 1500);

    if (result && result.assembledCorridor) {
      this.assembledCorridorCache = result.assembledCorridor;
      this.stationsOutputCache = result.stationsOutput;
    } else {
      console.error("CRITICAL HARNESS ERROR: Failed to extract assembledCorridor from standalone resolver!");
    }
  }

  /**
   * Executes a deterministic movement scenario through the production pipeline.
   */
  async runScenario(scenario) {
    const stats = {
      totalTicks: scenario.ticks.length,
      passedTicks: 0,
      failedTicks: 0,
      executionTimeMs: 0,
      firstFailingTick: null,
      failures: []
    };

    const startTime = process.hrtime.bigint();

    if (scenario.ticks.length === 0) {
      return stats;
    }

    const initLat = scenario.ticks[0].lat;
    const initLng = scenario.ticks[0].lng;

    if (!this.railAwareService) {
      await this._initializePipeline(initLat, initLng);
    }

    const sessionId = crypto.randomUUID();

    for (let i = 0; i < scenario.ticks.length; i++) {
      const tick = scenario.ticks[i];
      let appResult = null;
      let evaluationError = null;

      try {
        appResult = await this.railAwareService.evaluateLocation(sessionId, tick.lat, tick.lng);
      } catch (e) {
        evaluationError = e;
      }

      if (evaluationError) {
        stats.failedTicks++;
        if (stats.firstFailingTick === null) stats.firstFailingTick = i + 1;
        stats.failures.push({
          scenario: scenario.name,
          tick: i + 1,
          classification: 'APPLICATION_EXCEPTION',
          message: `evaluateLocation threw an error: ${evaluationError.message}`,
          location: `${tick.lat.toFixed(6)}, ${tick.lng.toFixed(6)}`,
          sessionId,
          timestamp: Date.now(),
          stack: evaluationError.stack
        });
        continue;
      }

      if (tick.expected) {
        let tickFailed = false;

        // We look inside the pipeline result to assert the internal invariants
        const routingResult = appResult?.discoveryContext?.routingResult;

        for (const [key, expectedValue] of Object.entries(tick.expected)) {
          let actualValue;

          try {
            if (key === 'movementState') actualValue = routingResult?.directionInferenceResult?.movementState;
            else if (key === 'travelDirection') actualValue = routingResult?.routeSelectionDecision?.travelDirection;
            else if (key === 'routeSelectionStatus') actualValue = routingResult?.routeSelectionDecision?.status;
            else if (key === 'selectedBranchId') actualValue = routingResult?.routeSelectionDecision?.selectedBranchId;
            else if (key === 'ambiguityReason') actualValue = routingResult?.routeSelectionDecision?.ambiguityReason;
            else if (key === 'previousStation') actualValue = routingResult?.routeContext?.previousStation?.station?.code;
            else if (key === 'nextStation') actualValue = routingResult?.routeContext?.nextStation?.station?.code;
            else actualValue = routingResult?.[key];
          } catch(e) {
             actualValue = undefined;
          }

          if (actualValue !== expectedValue) {
            tickFailed = true;
            const failure = {
              scenario: scenario.name,
              tick: i + 1,
              classification: 'ROUTING_PIPELINE',
              field: key,
              expected: expectedValue,
              actual: actualValue,
              location: `${tick.lat.toFixed(6)}, ${tick.lng.toFixed(6)}`,
              sessionId,
              timestamp: Date.now()
            };
            stats.failures.push(failure);
            this.allFailures.push(failure);
          }
        }

        if (tickFailed) {
          stats.failedTicks++;
          if (stats.firstFailingTick === null) stats.firstFailingTick = i + 1;
        } else {
          stats.passedTicks++;
        }
      } else {
        // Harness failure - test writer forgot to define expectations
        stats.failedTicks++;
        if (stats.firstFailingTick === null) stats.firstFailingTick = i + 1;
        stats.failures.push({
          scenario: scenario.name,
          tick: i + 1,
          classification: 'HARNESS_ERROR',
          message: `Tick has no expectations defined`,
          location: `${tick.lat.toFixed(6)}, ${tick.lng.toFixed(6)}`,
          sessionId,
          timestamp: Date.now()
        });
      }
    }

    const endTime = process.hrtime.bigint();
    stats.executionTimeMs = Number(endTime - startTime) / 1000000;

    return stats;
  }

  printFailures() {
    for (const f of this.allFailures) {
      console.log(`\n      [${f.classification}] Tick ${f.tick}`);
      console.log(`        Scenario   : ${f.scenario}`);
      console.log(`        Location   : ${f.location}`);
      console.log(`        Session ID : ${f.sessionId}`);
      console.log(`        Timestamp  : ${new Date(f.timestamp).toISOString()}`);
      if (f.field) {
        console.log(`        Expected   : ${f.expected}`);
        console.log(`        Actual     : ${f.actual} (${f.field})`);
      } else if (f.message) {
        console.log(`        Message    : ${f.message}`);
        if (f.stack) {
          console.log(`        Stack      : ${f.stack.split('\n')[1]}`);
        }
      }
    }
  }

  async runAll(scenarios) {
    let totalTicks = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTimeMs = 0;
    let warnings = 0;
    let executedScenarios = 0;
    const failedScenarios = new Set();

    for (const scenario of scenarios) {
      if (scenario.limitation) {
        warnings++;
        continue;
      }
      executedScenarios++;
      const stats = await this.runScenario(scenario);
      totalTicks += stats.totalTicks;
      totalPassed += stats.passedTicks;
      totalFailed += stats.failedTicks;
      totalTimeMs += stats.executionTimeMs;

      if (stats.failedTicks > 0) {
        failedScenarios.add(scenario.name);
      }
    }

    console.log('\nValidation Harness');
    console.log('------------------');
    console.log(`Scenarios loaded: ${scenarios.length}`);
    console.log(`Scenarios executed: ${executedScenarios}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Warnings: ${warnings}`);
    console.log(`Elapsed: ${totalTimeMs.toFixed(2)} ms\n`);

    if (totalFailed > 0) {
      console.log('Failed Scenarios:');
      for (const name of failedScenarios) {
        console.log(`- ${name}`);
      }
      console.log('\nSTATUS: FAILURE\n');
      this.printFailures();
      return false;
    } else {
      console.log('STATUS: SUCCESS\n');
      return true;
    }
  }
}

module.exports = ValidationHarness;
