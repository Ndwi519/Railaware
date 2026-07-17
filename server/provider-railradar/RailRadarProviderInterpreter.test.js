const RailRadarProviderInterpreter = require('./RailRadarProviderInterpreter.js');
const { createProviderSnapshot } = require('../domain/models/ProviderSnapshot.js');
const { TrainStatus } = require('../domain/types/enums.js');

describe('RailRadarProviderInterpreter', () => {
  let interpreter;

  beforeEach(() => {
    interpreter = new RailRadarProviderInterpreter();
  });

  const mockSnapshot = (rawJson) => createProviderSnapshot({
    id: 'snap-1',
    rawJson,
    metadata: { httpStatusCode: 200, traceId: '123', timestamp: '2026-07-09T00:00:00Z' },
    capturedAt: new Date('2026-07-09T00:00:00Z')
  });

  it('should interpret a complete payload successfully', () => {
    const rawJson = {
      train: { number: '12903', name: 'GOLDEN TEMPLE M', startDate: '2026-07-09' },
      status: 'running',
      delayMinutes: 10,
      lastUpdatedAt: '2026-07-09T18:22:10+05:30',
      currentLocation: {
        previousStation: 'MUZ',
        previousStationName: 'Muzaffarnagar',
        nextStation: 'MTC',
        nextStationName: 'Meerut City',
        segmentProgress: 0.74
      }
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.train.number).toBe('12903');
    expect(observation.status).toBe(TrainStatus.RUNNING);
    expect(observation.delayMinutes).toBe(10);
    expect(observation.lastUpdatedAt.toISOString()).toBe(new Date('2026-07-09T18:22:10+05:30').toISOString());
    expect(observation.currentSegment.previousStation.code).toBe('MUZ');
    expect(observation.currentSegment.nextStation.code).toBe('MTC');
    expect(observation.segmentProgress).toBe(0.74);
  });

  it('should handle missing currentLocation (preserve nulls, no guessing)', () => {
    const rawJson = {
      train: { number: '12903' },
      status: 'running'
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.currentSegment).toBeNull();
    expect(observation.segmentProgress).toBeNull();
    expect(observation.delayMinutes).toBeNull();
    expect(observation.status).toBe(TrainStatus.RUNNING);
  });

  it('should handle missing segmentProgress (no inference)', () => {
    const rawJson = {
      train: { number: '12903' },
      status: 'running',
      currentLocation: {
        previousStation: 'MUZ'
      }
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.currentSegment.previousStation.code).toBe('MUZ');
    expect(observation.currentSegment.nextStation).toBeNull();
    expect(observation.segmentProgress).toBeNull(); // Must preserve explicit null without inference
  });

  it('should handle missing previousStation', () => {
    const rawJson = {
      train: { number: '12903' },
      status: 'running',
      currentLocation: {
        segmentProgress: 0.5
      }
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.currentSegment).toBeNull(); // Missing previousStation means segment is unknown
    expect(observation.segmentProgress).toBe(0.5); // But we can still have a raw progress float
  });

  it('should interpret a cancelled train correctly', () => {
    const rawJson = {
      train: { number: '64450' },
      status: 'cancelled'
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.status).toBe(TrainStatus.CANCELLED);
    expect(observation.currentSegment).toBeNull();
    expect(observation.segmentProgress).toBeNull();
  });

  it('should interpret a completed (arrived) train correctly', () => {
    const rawJson = {
      train: { number: '12903' },
      status: 'arrived',
      currentLocation: {
        previousStation: 'ASR',
        segmentProgress: 1.0
      }
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.status).toBe(TrainStatus.ARRIVED);
    expect(observation.currentSegment.previousStation.code).toBe('ASR');
    expect(observation.segmentProgress).toBe(1.0);
  });

  it('should throw an error for a malformed (null/undefined) payload', () => {
    const snapshot = mockSnapshot(null);
    expect(() => interpreter.interpret(snapshot)).toThrow('Invalid or missing snapshot payload');
  });

  it('should handle an unknown status by falling back to UNKNOWN enum', () => {
    const rawJson = {
      train: { number: '12903' },
      status: 'magic-flying-train'
    };

    const snapshot = mockSnapshot(rawJson);
    const observation = interpreter.interpret(snapshot);

    expect(observation.status).toBe(TrainStatus.UNKNOWN);
  });
});
