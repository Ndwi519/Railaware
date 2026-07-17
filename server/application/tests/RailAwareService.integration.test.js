const LegacyApiMapper = require('../mappers/LegacyApiMapper.js');
const { createObservation } = require('../../domain/models/Observation.js');
const { createTrain } = require('../../domain/models/Train.js');
const { createRiskAssessment } = require('../../domain/models/RiskAssessment.js');
const { createRecommendation } = require('../../domain/models/Recommendation.js');
const { RiskLevel, TrainStatus } = require('../../domain/types/enums.js');

describe('LegacyApiMapper Immutability and Consistency', () => {
  it('should not mutate any domain object when mapping', () => {
    const mapper = new LegacyApiMapper();
    
    // Create strictly frozen domain objects
    const train = createTrain({ number: '12345', name: 'TEST', startDate: '2026' });
    const observation = createObservation({
      id: 'obs-1',
      train,
      status: TrainStatus.RUNNING,
      recordedAt: new Date()
    });
    
    const risk = createRiskAssessment({
      level: RiskLevel.ELEVATED,
      reasons: ['Testing'],
      evaluatedAt: new Date()
    });
    
    const recommendation = createRecommendation({
      directive: 'Testing Directive',
      userAction: 'Testing Action',
      generatedAt: new Date()
    });
    
    const discoveryContext = {
      corridor: { id: 'corridor-1' },
      discoveredTrains: [{ id: '12345', name: 'TEST' }]
    };

    const applicationResult = Object.freeze({
      observation,
      confidence: null,
      risk,
      recommendation,
      discoveryContext: Object.freeze({ ...discoveryContext })
    });

    // Execute map
    const mapped = mapper.map(applicationResult);
    
    // Validate mapping correctness
    expect(mapped.observation.trainId).toBe('12345');
    expect(mapped.risk.level).toBe('elevated');
    expect(mapped.risk.explanation).toBe('Testing Directive');
    
    // Validate non-mutation of inputs (Observation is frozen by default, this tests structural integrity)
    expect(observation.status).toBe(TrainStatus.RUNNING);
    expect(risk.level).toBe(RiskLevel.ELEVATED);
    
    // Validate output is a new object detached from domain model reference
    expect(mapped.observation).not.toBe(observation);
    expect(mapped.risk).not.toBe(risk);
  });
});
