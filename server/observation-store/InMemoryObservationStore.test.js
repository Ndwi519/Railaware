const InMemoryObservationStore = require('./InMemoryObservationStore.js');
const { createObservation } = require('../domain/models/Observation.js');
const { createTrain } = require('../domain/models/Train.js');

describe('InMemoryObservationStore', () => {
  let store;
  let mockTrain;

  beforeEach(() => {
    store = new InMemoryObservationStore(5); // Small limit for testing
    mockTrain = createTrain({ number: '12903', name: 'TEST', startDate: '2026' });
  });

  const generateObs = (id) => createObservation({
    id,
    train: mockTrain,
    status: 'running',
    recordedAt: new Date()
  });

  it('should save a clean observation and retrieve it as latest', async () => {
    const obs = generateObs('obs-1');
    await store.save(obs);
    
    const latest = await store.latest('12903');
    expect(latest.id).toBe('obs-1');
  });

  it('should enforce history limits by dropping oldest entries', async () => {
    for (let i = 1; i <= 7; i++) {
      await store.save(generateObs(`obs-${i}`));
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

  it('should throw if observation lacks a train number', async () => {
    const badObs = createObservation({
      id: 'bad',
      train: { name: 'NO NUMBER' },
      status: 'running',
      recordedAt: new Date()
    });
    
    await expect(store.save(badObs)).rejects.toThrow('Invalid observation: missing train number');
  });
});
