const EvaluationMapper = require('./EvaluationMapper.js');

describe('EvaluationMapper', () => {
  it('maps valid pipelineResult to explicit DTO and strips internal structures', () => {
    const rawResult = {
      observation: {
        latitude: 10,
        longitude: 20,
        timestamp: 1000,
        speedKmph: 50,
        extraUnexpected: 'should-be-stripped'
      },
      confidence: {
        level: 'HIGH',
        topologyConfidence: 'HIGH',
        observationConfidence: 'HIGH',
        providerReliability: 'HIGH',
        reasons: ['A'],
        assessedAt: 2000,
        internalScore: 0.99
      },
      awareness: {
        status: 'APPROACHING_STATION',
        trainAlongTrackDistanceMetres: 100,
        userAlongTrackDistanceMetres: 200,
        distanceMetres: 100,
        direction: 'FORWARD',
        approaching: true,
        observationConfidence: 'HIGH',
        providerReliability: 'HIGH',
        lastUpdatedAt: 3000,
        explanation: 'Test',
        requiresProminentDisplay: true,
        _internal_estimations: {} // Should strip
      },
      assistance: {
        type: 'INFO',
        message: 'Hello',
        actions: [],
        internalTraceId: 'x'
      },
      discoveryContext: {
        trainTarget: 'T1',
        providerError: null,
        discoveredTrains: [{ number: 'T1' }],
        strategyDiagnostics: [],
        trace: { stages: [] },
        journey: {
          targetStation: { code: 'A' },
          route: []
        },
        // THESE MUST BE STRIPPED:
        corridor: { internalCache: true },
        routingResult: {
          directionInferenceResult: {},
          routeSelectionDecision: {},
          assembledCorridor: { segments: [] },
          corridorSegments: []
        },
        projectionResult: {}
      }
    };

    const dto = EvaluationMapper.mapResult(rawResult);

    expect(dto).not.toBeNull();

    // Check unexpected fields are removed
    expect(dto.observation.extraUnexpected).toBeUndefined();
    expect(dto.confidence.internalScore).toBeUndefined();
    expect(dto.awareness._internal_estimations).toBeUndefined();
    expect(dto.assistance.internalTraceId).toBeUndefined();

    // Check routing internals are fully stripped
    expect(dto.discoveryContext.corridor).toBeUndefined();
    expect(dto.discoveryContext.routingResult).toBeUndefined();
    expect(dto.discoveryContext.projectionResult).toBeUndefined();
    expect(dto.discoveryContext.directionInferenceResult).toBeUndefined();
    expect(dto.discoveryContext.routeSelectionDecision).toBeUndefined();
    expect(dto.discoveryContext.assembledCorridor).toBeUndefined();
    expect(dto.discoveryContext.corridorSegments).toBeUndefined();

    // Check expected fields exist
    expect(dto.observation.latitude).toBe(10);
    expect(dto.confidence.level).toBe('HIGH');
    expect(dto.awareness.status).toBe('APPROACHING_STATION');
    expect(dto.discoveryContext.trainTarget).toBe('T1');
  });

  it('handles null pipelineResult gracefully', () => {
    expect(EvaluationMapper.mapResult(null)).toBeNull();
  });

  it('handles error result gracefully', () => {
    const dto = EvaluationMapper.mapResult({ error: 'test error' });
    expect(dto.error).toBe('test error');
  });

  it('handles partial results without crashing', () => {
    const rawResult = {
      observation: { latitude: 10, longitude: 20 },
      discoveryContext: { trainTarget: 'T1' }
    };

    const dto = EvaluationMapper.mapResult(rawResult);
    expect(dto.observation.latitude).toBe(10);
    expect(dto.confidence).toBeNull();
    expect(dto.awareness).toBeNull();
    expect(dto.assistance).toBeNull();
    expect(dto.discoveryContext.trainTarget).toBe('T1');
    expect(dto.discoveryContext.journey).toBeUndefined();
  });
});
