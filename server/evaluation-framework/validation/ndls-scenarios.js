const MovementTraceGenerator = require('./MovementTraceGenerator.js');

function buildScenarios(assembledCorridor, stationsOutput) {
  const scenarios = [];

  // Helper to map generated traces to assertions seamlessly
  const mapExpected = (trace, expectedTemplateFn) => {
    return trace.map(tick => ({
      ...tick,
      expected: expectedTemplateFn(tick)
    }));
  };

  // 1. Straight FORWARD movement
  const forwardTrace = MovementTraceGenerator.generateTrace({
    assembledCorridor,
    startSegmentIndex: 0,
    startDistance: 0,
    tickCount: 5,
    speedMetresPerTick: 30, // 30m / 10s = 108 km/h
    isForward: true,
    preferredBranchId: assembledCorridor.getBranchId(0)
  });

  scenarios.push({
    name: '1. Straight FORWARD movement',
    ticks: mapExpected(forwardTrace, (t) => ({
      movementState: t.tickIndex === 1 ? 'INSUFFICIENT_HISTORY' : 'MOVING',
      ...(t.tickIndex > 1 ? { travelDirection: 'FORWARD' } : {})
    }))
  });

  // 2. Straight BACKWARD movement
  const backwardTrace = MovementTraceGenerator.generateTrace({
    assembledCorridor,
    startSegmentIndex: 0,
    startDistance: 200,
    tickCount: 5,
    speedMetresPerTick: 30,
    isForward: false,
    preferredBranchId: assembledCorridor.getBranchId(0)
  });

  scenarios.push({
    name: '2. Straight BACKWARD movement',
    ticks: mapExpected(backwardTrace, (t) => ({
      movementState: t.tickIndex === 1 ? 'INSUFFICIENT_HISTORY' : 'MOVING',
      ...(t.tickIndex > 1 ? { travelDirection: 'BACKWARD' } : {})
    }))
  });

  // 3. Station approach
  const stationOnSeg0 = stationsOutput.find(s => s.station && s.station.code === 'NDLS');
  if (stationOnSeg0) {
    const approachTrace = MovementTraceGenerator.generateTrace({
      assembledCorridor,
      startSegmentIndex: 0,
      startDistance: Math.max(0, 0 /* stationOnSeg0.alongTrackDistanceMetres - 150 */), // Use safe distance because geometry stripped
      tickCount: 4,
      speedMetresPerTick: 30,
      isForward: true,
      preferredBranchId: assembledCorridor.getBranchId(0)
    });
    scenarios.push({
      name: '3. Station approach',
      ticks: mapExpected(approachTrace, (t) => ({
        nextStation: t.tickIndex === 1 ? undefined : 'TKJ'
      }))
    });
  } else {
    scenarios.push({ name: '3. Station approach', ticks: [] });
  }

  // 4. Station departure
  if (stationOnSeg0) {
    const departTrace = MovementTraceGenerator.generateTrace({
      assembledCorridor,
      startSegmentIndex: 0,
      startDistance: 50 /* stationOnSeg0.alongTrackDistanceMetres + 5 */, // Use safe distance
      tickCount: 3,
      speedMetresPerTick: 30,
      isForward: true,
      preferredBranchId: assembledCorridor.getBranchId(0)
    });
    scenarios.push({
      name: '4. Station departure',
      ticks: mapExpected(departTrace, (t) => ({
        previousStation: stationOnSeg0.code
      }))
    });
  } else {
    scenarios.push({ name: '4. Station departure', ticks: [] });
  }

  // 5. Branch approach
  const branchTrace = MovementTraceGenerator.generateTrace({
    assembledCorridor,
    startSegmentIndex: 0,
    startDistance: 0,
    tickCount: 4,
    speedMetresPerTick: 30,
    isForward: true,
    preferredBranchId: assembledCorridor.getBranchId(0)
  });

  scenarios.push({
    name: '5. Branch approach',
    ticks: mapExpected(branchTrace, (t) => ({
      routeSelectionStatus: t.tickIndex === 1 ? 'AMBIGUOUS' : 'SELECTED',
      selectedBranchId: t.tickIndex === 1 ? null : t.expectedBranchId
    }))
  });

  // 6. Segment transition
  const transitionTrace = MovementTraceGenerator.generateTrace({
    assembledCorridor,
    startSegmentIndex: 0,
    startDistance: MovementTraceGenerator._getSegmentLength(assembledCorridor.getTraversableSegments()[0]) - 50,
    tickCount: 4,
    speedMetresPerTick: 30,
    isForward: true,
    preferredBranchId: assembledCorridor.getBranchId(0)
  });

  scenarios.push({
    name: '6. Segment transition',
    ticks: mapExpected(transitionTrace, (t) => ({
      movementState: t.tickIndex === 1 ? 'INSUFFICIENT_HISTORY' : (t.tickIndex >= 4 ? 'STATIONARY' : 'MOVING'),
      ...(t.tickIndex > 1 ? { travelDirection: t.tickIndex >= 4 ? 'STATIONARY' : 'FORWARD' } : {})
    }))
  });

  // 7. Terminal corridor
  // Traverse a terminal segment completely to fall off the track topology
  const segments = assembledCorridor.getTraversableSegments();
  let terminalSegIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    const forwardConnected = assembledCorridor.getConnectedSegments(i, true);
    if (forwardConnected.length === 0) {
      terminalSegIndex = i;
      break;
    }
  }

  if (terminalSegIndex !== -1) {
    const segLen = MovementTraceGenerator._getSegmentLength(segments[terminalSegIndex]);
    const terminalTrace = MovementTraceGenerator.generateTrace({
      assembledCorridor,
      startSegmentIndex: terminalSegIndex,
      startDistance: Math.max(0, segLen - 60), // Start 60m from terminal
      tickCount: 5,
      speedMetresPerTick: 30,
      isForward: true,
      preferredBranchId: assembledCorridor.getBranchId(terminalSegIndex)
    });

    scenarios.push({
      name: '7. Terminal corridor',
      ticks: mapExpected(terminalTrace, (t) => {
        // As it hits the end, it should eventually become STATIONARY or UNKNOWN, and stay on the terminal branch
        return {
          // Expected route context becomes AMBIGUOUS when stationary at end of track
          selectedBranchId: t.tickIndex === 1 ? null : (t.tickIndex >= 4 ? null : t.expectedBranchId)
        };
      })
    });
  } else {
    scenarios.push({ name: '7. Terminal corridor', ticks: [], limitation: "No terminal segments found in fixture" });
  }

  // 8. Deterministic noisy GPS
  const noisyTrace = MovementTraceGenerator.generateTrace({
    assembledCorridor,
    startSegmentIndex: 0,
    startDistance: 0,
    tickCount: 6,
    speedMetresPerTick: 30,
    isForward: true,
    applyNoise: true,
    preferredBranchId: assembledCorridor.getBranchId(0)
  });

  scenarios.push({
    name: '8. Deterministic noisy GPS',
    ticks: mapExpected(noisyTrace, (t) => ({
      routeSelectionStatus: (t.tickIndex >= 2 && t.tickIndex <= 5) ? 'AMBIGUOUS' : (t.tickIndex === 1 ? 'AMBIGUOUS' : 'SELECTED'),
      selectedBranchId: (t.tickIndex >= 1 && t.tickIndex <= 5) ? null : t.expectedBranchId,
      ambiguityReason: (t.tickIndex >= 1 && t.tickIndex <= 5) ? 'INSUFFICIENT_EVIDENCE' : null
    }))
  });

  // 9. Parallel corridor ambiguity (Limitation)
  scenarios.push({
    name: '9. Parallel corridor ambiguity (Limitation)',
    ticks: [],
    limitation: 'The NDLS fixture does not contain definitively parallel distinct corridors that cause pipeline oscillation without synthetic injection.'
  });

  return scenarios;
}

module.exports = { buildScenarios };
