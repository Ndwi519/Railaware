const RailAwareConfidenceEngine = require('./RailAwareConfidenceEngine.js');
const { createObservation } = require('../domain/models/Observation.js');
const { createTrain } = require('../domain/models/Train.js');
const { createSegment } = require('../domain/models/Segment.js');
const { createStation } = require('../domain/models/Station.js');
const { ConfidenceLevel, TrainStatus } = require('../domain/types/enums.js');

describe('RailAwareConfidenceEngine', () => {
  let engine;
  let mockTrain;
  let mockSegment;

  beforeEach(() => {
    engine = new RailAwareConfidenceEngine();
    mockTrain = createTrain({ number: '12903', name: 'TEST', startDate: '2026' });
    mockSegment = createSegment({ 
      previousStation: createStation({ code: 'A', name: 'Station A' }),
      nextStation: createStation({ code: 'B', name: 'Station B' })
    });
  });

  const generateObs = (overrides = {}) => createObservation({
    id: 'obs-1',
    train: mockTrain,
    status: TrainStatus.RUNNING,
    currentSegment: mockSegment,
    segmentProgress: 0.5,
    lastUpdatedAt: new Date(),
    recordedAt: new Date(),
    ...overrides
  });

  it('should return UNKNOWN for empty history', () => {
    const obs = generateObs();
    const result = engine.evaluate(obs, []);
    expect(result.level).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.reasons).toContain('[Engineering decision] insufficient history');
  });

  it('should return UNKNOWN if observation is absent', () => {
    const result = engine.evaluate(null, []);
    expect(result.level).toBe(ConfidenceLevel.UNKNOWN);
    expect(result.reasons).toContain('[Engineering decision] observation absent');
  });

  it('should return HIGH for a clean observation with sufficient history', () => {
    const history = [generateObs({ recordedAt: new Date(Date.now() - 60000) })];
    const obs = generateObs();
    const result = engine.evaluate(obs, history);
    expect(result.level).toBe(ConfidenceLevel.HIGH);
    expect(result.reasons).toContain('[Engineering decision] complete observation');
  });

  it('should return MEDIUM for missing segmentProgress', () => {
    const history = [generateObs({ recordedAt: new Date(Date.now() - 60000) })];
    const obs = generateObs({ segmentProgress: null });
    const result = engine.evaluate(obs, history);
    expect(result.level).toBe(ConfidenceLevel.MEDIUM);
    expect(result.reasons).toContain('[Engineering decision] missing optional fields');
  });

  it('should return MEDIUM for stale observations', () => {
    const history = [generateObs()];
    // Set lastUpdatedAt to 20 minutes ago
    const staleDate = new Date(Date.now() - 20 * 60 * 1000);
    const obs = generateObs({ lastUpdatedAt: staleDate });
    const result = engine.evaluate(obs, history);
    expect(result.level).toBe(ConfidenceLevel.MEDIUM);
    expect(result.reasons).toContain('[Engineering decision] stale observation');
  });

  it('should return MEDIUM for observed segmentProgress regression', () => {
    const pastObs = generateObs({ 
      id: 'obs-0',
      segmentProgress: 0.8, 
      recordedAt: new Date(Date.now() - 60000) 
    });
    const currentObs = generateObs({ 
      id: 'obs-1',
      segmentProgress: 0.4, 
      recordedAt: new Date() 
    });
    
    const result = engine.evaluate(currentObs, [pastObs]);
    expect(result.level).toBe(ConfidenceLevel.MEDIUM);
    expect(result.reasons).toContain('[Evidence-backed] observed segmentProgress regression requires interpretation');
  });

  it('should return MEDIUM for missing topology', () => {
    const history = [generateObs({ recordedAt: new Date(Date.now() - 60000) })];
    const obs = generateObs({ currentSegment: null });
    const result = engine.evaluate(obs, history);
    expect(result.level).toBe(ConfidenceLevel.MEDIUM);
    expect(result.reasons).toContain('[Engineering decision] missing topology');
  });

  it('should return LOW for explicit validation errors', () => {
    const history = [generateObs({ recordedAt: new Date(Date.now() - 60000) })];
    const obs = generateObs({ validationErrors: ['Invalid field format'] });
    const result = engine.evaluate(obs, history);
    expect(result.level).toBe(ConfidenceLevel.LOW);
    expect(result.reasons).toContain('[Engineering decision] explicit validation errors present');
  });

  it('should return LOW for repeated HTTP acquisition gaps', () => {
    const history = [
      generateObs({ recordedAt: new Date(Date.now() - 10 * 60 * 1000) }), // -10m
      generateObs({ recordedAt: new Date(Date.now() - 7 * 60 * 1000) }),  // -7m (3m gap)
      generateObs({ recordedAt: new Date(Date.now() - 4 * 60 * 1000) }),  // -4m (3m gap)
    ];
    const obs = generateObs();
    const result = engine.evaluate(obs, history);
    expect(result.level).toBe(ConfidenceLevel.LOW);
    expect(result.reasons).toContain('[Evidence-backed] repeated HTTP acquisition gaps');
  });

  describe('combine method', () => {
    it('should select lowest confidence when both are valid', () => {
      expect(engine.combine(ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)).toBe(ConfidenceLevel.MEDIUM);
      expect(engine.combine(ConfidenceLevel.LOW, ConfidenceLevel.HIGH)).toBe(ConfidenceLevel.LOW);
      expect(engine.combine(ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW)).toBe(ConfidenceLevel.LOW);
      expect(engine.combine(ConfidenceLevel.HIGH, ConfidenceLevel.HIGH)).toBe(ConfidenceLevel.HIGH);
    });

    it('should return UNKNOWN if either input is UNKNOWN', () => {
      expect(engine.combine(ConfidenceLevel.HIGH, ConfidenceLevel.UNKNOWN)).toBe(ConfidenceLevel.UNKNOWN);
      expect(engine.combine(ConfidenceLevel.UNKNOWN, ConfidenceLevel.LOW)).toBe(ConfidenceLevel.UNKNOWN);
      expect(engine.combine(ConfidenceLevel.UNKNOWN, ConfidenceLevel.UNKNOWN)).toBe(ConfidenceLevel.UNKNOWN);
    });

    it('should handle null/missing values as UNKNOWN', () => {
      expect(engine.combine(null, ConfidenceLevel.HIGH)).toBe(ConfidenceLevel.UNKNOWN);
      expect(engine.combine(ConfidenceLevel.LOW, null)).toBe(ConfidenceLevel.UNKNOWN);
      expect(engine.combine(null, null)).toBe(ConfidenceLevel.UNKNOWN);
    });
  });
});
