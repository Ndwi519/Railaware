const MetricsEngine = require('./MetricsEngine.js');
const turf = require('@turf/turf');

describe('MetricsEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MetricsEngine();
  });

  it('calculates performance metrics correctly', () => {
    const scenario = { id: 's1', corridorData: {} };
    const records = [
      {
        truth: { groundTruthAwarenessState: 'DISTANT' },
        providerData: { delayMinutes: 5 },
        pipelineResult: {
          awareness: { status: 'DISTANT' },
          discoveryContext: { trace: { stages: [{ elapsedTimeMs: 50 }, { elapsedTimeMs: 100 }] } }
        }
      }
    ];

    const report = engine.calculate(scenario, records);
    expect(report.performance.observationAge).toEqual([300]);
    expect(report.performance.awarenessLatency).toEqual([0.1]);
  });

  it('calculates behaviour metrics (false negatives)', () => {
    const scenario = { id: 's1', corridorData: {} };
    const records = [
      {
        truth: { groundTruthAwarenessState: 'APPROACHING_STATION' },
        providerData: { delayMinutes: 0 },
        pipelineResult: {
          awareness: { status: 'DISTANT' } // System thought it was distant
        }
      }
    ];

    const report = engine.calculate(scenario, records);
    expect(report.behaviour.falseNegatives).toBe(1);
    expect(report.behaviour.falsePositives).toBe(0);
  });

  it('calculates accuracy metrics (position error)', () => {
    const scenario = {
      id: 's1',
      corridorData: {
        route: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 1 } // 1 degree longitude is ~111km at equator
        ]
      }
    };

    // Turf point at [0.5, 0]
    const midPoint = turf.along(turf.lineString([[0,0], [1,0]]), 55.5, { units: 'kilometers' });

    const records = [
      {
        truth: { location: { lat: midPoint.geometry.coordinates[1], lng: midPoint.geometry.coordinates[0] }, groundTruthAwarenessState: 'DISTANT' },
        providerData: { delayMinutes: 0 },
        pipelineResult: {
          awareness: { trainAlongTrackDistanceMetres: 50000 } // 50km
        }
      }
    ];

    const report = engine.calculate(scenario, records);
    expect(report.accuracy.positionError.length).toBe(1);
    // Should be around 5.5km difference (55.5km truth vs 50km estimated)
    expect(report.accuracy.positionError[0]).toBeGreaterThan(5000);
    expect(report.accuracy.positionError[0]).toBeLessThan(6000);
  });
});
