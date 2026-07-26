const InMemoryObservationStore = require('./InMemoryObservationStore.js');
const { createTrainObservation } = require('../domain/models/TrainObservation.js');
const { createTrain } = require('../domain/models/Train.js');

describe('InMemoryObservationStore', () => {
  let store;
  let mockTrain;

  beforeEach(() => {
    store = new InMemoryObservationStore(5); // Small limit for testing
    mockTrain = createTrain({ number: '12903', name: 'TEST', startDate: '2026' });
  });

  const generateObs = (id, offsetMs = 0, lastUpdatedAt = null) => createTrainObservation({
    id,
    train: mockTrain,
    status: 'running',
    lastUpdatedAt,
    recordedAt: new Date(Date.now() + offsetMs)
  });

  it('should save a clean observation and retrieve it as latest', async () => {
    const obs = generateObs('obs-1');
    await store.save(obs);

    const latest = await store.latest('12903');
    expect(latest.id).toBe('obs-1');
  });

  it('should enforce history limits by dropping oldest entries', async () => {
    for (let i = 1; i <= 7; i++) {
      await store.save(generateObs(`obs-${i}`, i * 1000));
    }

    const history = await store.history('12903');
    expect(history.length).toBe(5); // Configured limit
    expect(history[0].id).toBe('obs-3'); // 1 and 2 were dropped
    expect(history[4].id).toBe('obs-7');
  });

  it('should return empty history for unknown trains', async () => {
    const history = await store.history('99999');
    expect(history).toEqual([]);
    const latest = await store.latest('99999');
    expect(latest).toBeNull();
  });

  it('should preserve observation array encapsulation', async () => {
    const obs = generateObs('obs-1');
    await store.save(obs);

    const history = await store.history('12903');
    history.push(generateObs('obs-malicious')); // Try to mutate internal array

    const cleanHistory = await store.history('12903');
    expect(cleanHistory.length).toBe(1); // Underlying store was unaffected
  });

  it('createTrainObservation should throw if train has no number (domain boundary enforcement)', () => {
    // Validation now occurs at the domain boundary, before store.save() is reached.
    expect(() => createTrainObservation({
      id: 'bad',
      train: { name: 'NO NUMBER' },
      status: 'running',
      recordedAt: new Date()
    })).toThrow('Observation invariant violated: train must be an object with a non-empty string number');
  });

  it('store.save should throw if a raw object bypassing createTrainObservation has no train number', async () => {
    // The store retains its own guard as a secondary safety net for objects that
    // bypass createTrainObservation() (e.g., mocks or plain object literals in tests).
    const rawObj = Object.freeze({
      id: 'raw',
      train: { name: 'NO NUMBER' },
      status: 'running',
      lastUpdatedAt: null,
      recordedAt: new Date(),
      segmentProgress: null,
      currentSegment: null,
      delayMinutes: null,
      validationErrors: Object.freeze([])
    });
    await expect(store.save(rawObj)).rejects.toThrow('Invalid observation: missing train number');
  });

  describe('chronological ordering and stale data rejection', () => {
    it('should accept a newer observation (newest observation acceptance)', async () => {
      const older = generateObs('obs-older', 0, new Date('2026-07-08T10:00:00Z'));
      await store.save(older);

      const newer = generateObs('obs-newer', 0, new Date('2026-07-08T10:05:00Z'));
      await store.save(newer);

      const latest = await store.latest('12903');
      expect(latest.id).toBe('obs-newer');
    });

    it('should reject an out-of-order stale observation', async () => {
      const newer = generateObs('obs-newer', 0, new Date('2026-07-08T10:05:00Z'));
      await store.save(newer);

      const older = generateObs('obs-older', 0, new Date('2026-07-08T10:00:00Z'));
      await store.save(older); // This should be ignored

      const latest = await store.latest('12903');
      expect(latest.id).toBe('obs-newer');

      const history = await store.history('12903');
      expect(history.length).toBe(1); // The older one was not added
    });

    it('should replace observations with equal timestamps (Option B)', async () => {
      const original = generateObs('obs-original', 0, new Date('2026-07-08T10:00:00Z'));
      await store.save(original);

      const duplicate = generateObs('obs-duplicate', 0, new Date('2026-07-08T10:00:00Z'));
      await store.save(duplicate); // This should replace the original

      const latest = await store.latest('12903');
      expect(latest.id).toBe('obs-duplicate');

      const history = await store.history('12903');
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('obs-duplicate');
    });

    it('should fallback to recordedAt if lastUpdatedAt is missing', async () => {
      const older = generateObs('obs-older', 0, null);
      await store.save(older);

      const newer = generateObs('obs-newer', 5000, null);
      await store.save(newer);

      const stale = generateObs('obs-stale', 2000, null);
      await store.save(stale);

      const latest = await store.latest('12903');
      expect(latest.id).toBe('obs-newer');

      const history = await store.history('12903');
      expect(history.length).toBe(2);
    });

    it('should throw when an Observation is missing both lastUpdatedAt and recordedAt', async () => {
      // Seed a real observation first to ensure history is intact after the failed save
      const real = generateObs('obs-real', 0, new Date('2026-07-08T10:00:00Z'));
      await store.save(real);

      // An Observation with both timestamps null violates the domain contract.
      // The store must throw an explicit error rather than silently treating it as epoch (0).
      const noTimestamp = Object.freeze({
        id: 'obs-no-timestamp',
        train: mockTrain,
        status: 'running',
        lastUpdatedAt: null,
        recordedAt: null,
        segmentProgress: null,
        currentSegment: null,
        delayMinutes: null,
        validationErrors: Object.freeze([])
      });

      await expect(store.save(noTimestamp)).rejects.toThrow(
        'Invalid Observation: missing both lastUpdatedAt and recordedAt'
      );

      // Store must be unchanged: history intact, latest unaffected
      const latest = await store.latest('12903');
      expect(latest.id).toBe('obs-real');
      const history = await store.history('12903');
      expect(history.length).toBe(1);
    });

    it('equal-timestamp replacement must not corrupt history limit accounting', async () => {
      // Fill to the limit (5) with strictly increasing timestamps
      for (let i = 1; i <= 5; i++) {
        await store.save(generateObs(`obs-${i}`, i * 1000, new Date(`2026-07-08T10:0${i}:00Z`)));
      }
      expect((await store.history('12903')).length).toBe(5);

      // Now replace the last entry (equal timestamp = obs-5's lastUpdatedAt)
      const replacement = generateObs('obs-5-replaced', 5000, new Date('2026-07-08T10:05:00Z'));
      await store.save(replacement);

      const history = await store.history('12903');
      // Length must remain 5, not 6
      expect(history.length).toBe(5);
      expect(history[4].id).toBe('obs-5-replaced');
    });
  });
});

describe('createTrainObservation domain invariants', () => {
  const mockTrain = { number: '12903', name: 'TEST', startDate: '2026' };
  const validDate = new Date('2026-07-08T10:00:00Z');

  it('should create a valid Observation when all invariants are satisfied', () => {
    const obs = createTrainObservation({
      id: 'obs-valid',
      train: mockTrain,
      status: 'running',
      recordedAt: validDate
    });
    expect(obs.id).toBe('obs-valid');
    expect(obs.train.number).toBe('12903');
    expect(obs.status).toBe('running');
    expect(obs.recordedAt).toBe(validDate);
    expect(Object.isFrozen(obs)).toBe(true);
  });

  it('should throw when id is missing', () => {
    expect(() => createTrainObservation({
      id: '',
      train: mockTrain,
      status: 'running',
      recordedAt: validDate
    })).toThrow('Observation invariant violated: id must be a non-empty string');
  });

  it('should throw when id is not a string', () => {
    expect(() => createTrainObservation({
      id: 42,
      train: mockTrain,
      status: 'running',
      recordedAt: validDate
    })).toThrow('Observation invariant violated: id must be a non-empty string');
  });

  it('should throw when train is null', () => {
    expect(() => createTrainObservation({
      id: 'obs-1',
      train: null,
      status: 'running',
      recordedAt: validDate
    })).toThrow('Observation invariant violated: train must be an object with a non-empty string number');
  });

  it('should throw when train.number is missing', () => {
    expect(() => createTrainObservation({
      id: 'obs-1',
      train: { name: 'No Number' },
      status: 'running',
      recordedAt: validDate
    })).toThrow('Observation invariant violated: train must be an object with a non-empty string number');
  });

  it('should throw when status is missing', () => {
    expect(() => createTrainObservation({
      id: 'obs-1',
      train: mockTrain,
      status: '',
      recordedAt: validDate
    })).toThrow('Observation invariant violated: status must be a non-empty string');
  });

  it('should throw when recordedAt is not a Date', () => {
    expect(() => createTrainObservation({
      id: 'obs-1',
      train: mockTrain,
      status: 'running',
      recordedAt: '2026-07-08T10:00:00Z'
    })).toThrow('Observation invariant violated: recordedAt must be a valid Date instance');
  });

  it('should throw when recordedAt is null', () => {
    expect(() => createTrainObservation({
      id: 'obs-1',
      train: mockTrain,
      status: 'running',
      recordedAt: null
    })).toThrow('Observation invariant violated: recordedAt must be a valid Date instance');
  });

  it('should throw when recordedAt is an invalid Date', () => {
    expect(() => createTrainObservation({
      id: 'obs-1',
      train: mockTrain,
      status: 'running',
      recordedAt: new Date('not-a-date')
    })).toThrow('Observation invariant violated: recordedAt must be a valid Date instance');
  });
});
