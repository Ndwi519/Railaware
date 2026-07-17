const RailAwareRiskEngine = require('./RailAwareRiskEngine.js');
const { createObservation } = require('../domain/models/Observation.js');
const { createTrain } = require('../domain/models/Train.js');
const { createSegment } = require('../domain/models/Segment.js');
const { createStation } = require('../domain/models/Station.js');
const { createJourney } = require('../domain/models/Journey.js');
const { createConfidenceAssessment } = require('../domain/models/ConfidenceAssessment.js');
const { RiskLevel, ConfidenceLevel, TrainStatus } = require('../domain/types/enums.js');

describe('RailAwareRiskEngine', () => {
  let engine;
  let mockTrain;
  let mockTargetStation;
  let mockJourney;

  beforeEach(() => {
    engine = new RailAwareRiskEngine();
    mockTrain = createTrain({ number: '12903', name: 'TEST', startDate: '2026' });
    mockTargetStation = createStation({ code: 'TARGET', name: 'Target Station' });
    mockJourney = createJourney({ id: 'j-1', train: mockTrain, targetStation: mockTargetStation, userId: 'u-1' });
  });

  const generateObs = (overrides = {}) => createObservation({
    id: 'obs-1',
    train: mockTrain,
    status: TrainStatus.RUNNING,
    recordedAt: new Date(),
    ...overrides
  });

  const generateConf = (level) => createConfidenceAssessment({
    level,
    reasons: [],
    assessedAt: new Date()
  });

  it('should enforce UNKNOWN risk when confidence is UNKNOWN', () => {
    const obs = generateObs();
    const conf = generateConf(ConfidenceLevel.UNKNOWN);
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.UNKNOWN);
    expect(result.reasons).toContain('[Engineering decision] UNKNOWN confidence enforces UNKNOWN risk');
  });

  it('should degrade risk to ELEVATED when confidence is LOW (prevent false SAFE)', () => {
    const segment = createSegment({ 
      previousStation: createStation({ code: 'FAR_A' }),
      nextStation: createStation({ code: 'FAR_B' })
    });
    const obs = generateObs({ currentSegment: segment }); // Distant train -> normally SAFE
    const conf = generateConf(ConfidenceLevel.LOW);
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.ELEVATED);
    expect(result.reasons).toContain('[Engineering decision] LOW confidence degrades risk certainty to ELEVATED');
  });

  it('should return SAFE for distant trains with HIGH confidence', () => {
    const segment = createSegment({ 
      previousStation: createStation({ code: 'FAR_A' }),
      nextStation: createStation({ code: 'FAR_B' })
    });
    const obs = generateObs({ currentSegment: segment });
    const conf = generateConf(ConfidenceLevel.HIGH);
    
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.SAFE);
    expect(result.reasons).toContain('[Engineering decision] Train is distant from target station');
  });

  it('should return IMMINENT when train is approaching target station', () => {
    const segment = createSegment({ 
      previousStation: createStation({ code: 'NEAR' }),
      nextStation: mockTargetStation
    });
    const obs = generateObs({ currentSegment: segment });
    const conf = generateConf(ConfidenceLevel.HIGH);
    
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.IMMINENT);
    expect(result.reasons).toContain('[Engineering decision] Train is approaching target station');
  });

  it('should return SAFE when train is CANCELLED', () => {
    const obs = generateObs({ status: TrainStatus.CANCELLED });
    const conf = generateConf(ConfidenceLevel.HIGH);
    
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.SAFE);
    expect(result.reasons).toContain('[Engineering decision] Train is cancelled, boarding risk is neutralized');
  });

  it('should return UNKNOWN when currentSegment is missing and confidence is HIGH', () => {
    const obs = generateObs({ currentSegment: null });
    const conf = generateConf(ConfidenceLevel.HIGH);
    
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.UNKNOWN);
    expect(result.reasons).toContain('[Engineering decision] Topography unknown, defaulting to UNKNOWN risk baseline');
  });

  it('should return UNKNOWN when currentSegment is missing and confidence is UNKNOWN', () => {
    const obs = generateObs({ currentSegment: null });
    const conf = generateConf(ConfidenceLevel.UNKNOWN);
    
    const result = engine.evaluate(mockJourney, obs, conf);
    expect(result.level).toBe(RiskLevel.UNKNOWN);
    expect(result.reasons).toContain('[Engineering decision] UNKNOWN confidence enforces UNKNOWN risk');
  });
});
