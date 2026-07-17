import { StationResolutionEngine } from './index.js';
import { InMemoryResolutionCache } from './cache.js';
import { ResolutionStatus, ResolutionMethod, EvidenceSource, ConfidenceLevel } from '../domain/types/enums.js';

class MockStrategy {
  constructor(name, success, previousStation = null, nextStation = null, confidence = ConfidenceLevel.MEDIUM, method = null, confidenceReasons = [], evidenceSources = []) {
    this.name = name;
    this._success = success;
    this._prev = previousStation;
    this._next = nextStation;
    this._confidence = confidence;
    this._method = method;
    this._confidenceReasons = confidenceReasons;
    this._evidenceSources = evidenceSources;
  }

  async resolve(gps, snappedGeometry) {
    if (this._success) {
      return {
        success: true,
        previousStation: this._prev,
        nextStation: this._next,
        confidence: this._confidence,
        method: this._method,
        confidenceReasons: this._confidenceReasons,
        evidenceSources: this._evidenceSources,
        reason: 'Mock success'
      };
    }
    return { success: false, reason: 'Mock failure' };
  }
}

describe('StationResolutionEngine', () => {
  let cache;
  const gps = { lat: 28.6, lng: 77.2 };
  const snappedGeometry = { corridorGeometry: [{ lat: 28.6, lng: 77.2 }] };

  beforeEach(() => {
    cache = new InMemoryResolutionCache();
  });

  test('cascades through strategies until one succeeds', async () => {
    const s1 = new MockStrategy('Fail1', false);
    const s2 = new MockStrategy('Success1', true, { code: 'A', source: 'osm' }, { code: 'B', source: 'osm' }, ConfidenceLevel.HIGH, ResolutionMethod.VERIFIED_TOPOLOGY, ['High confidence'], [EvidenceSource.OSM_STATION_NODE]);
    const s3 = new MockStrategy('Fail2', false);

    const engine = new StationResolutionEngine([s1, s2, s3], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.RESOLVED);
    expect(result.previousStation.code).toBe('A');
    expect(result.nextStation.code).toBe('B');
    expect(result.confidence).toBe(ConfidenceLevel.HIGH);
    expect(result.method).toBe(ResolutionMethod.VERIFIED_TOPOLOGY);
    expect(result.confidenceReasons).toEqual(['High confidence']);
    expect(result.evidenceSources).toEqual([EvidenceSource.OSM_STATION_NODE]);
    
    // Check immutability
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.confidenceReasons)).toBe(true);
    expect(Object.isFrozen(result.evidenceSources)).toBe(true);

    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].strategy).toBe('Fail1');
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[1].strategy).toBe('Success1');
    expect(result.attempts[1].success).toBe(true);
  });

  test('returns UNRESOLVED if all strategies fail', async () => {
    const s1 = new MockStrategy('Fail1', false);
    const s2 = new MockStrategy('Fail2', false);

    const engine = new StationResolutionEngine([s1, s2], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.UNRESOLVED);
    expect(result.previousStation).toBeNull();
    expect(result.nextStation).toBeNull();
    expect(result.method).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.confidenceReasons).toEqual([]);
    expect(result.evidenceSources).toEqual([]);
    
    // Check immutability
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.confidenceReasons)).toBe(true);
    expect(Object.isFrozen(result.evidenceSources)).toBe(true);

    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].strategy).toBe('Fail1');
    expect(result.attempts[1].strategy).toBe('Fail2');
  });

  test('caches successful results', async () => {
    const s1 = new MockStrategy('Success1', true, { code: 'A', source: 'osm' }, { code: 'B', source: 'osm' }, ConfidenceLevel.HIGH, ResolutionMethod.VERIFIED_TOPOLOGY, ['High confidence'], [EvidenceSource.OSM_STATION_NODE]);
    const engine = new StationResolutionEngine([s1], cache);
    
    const result1 = await engine.resolve(gps, snappedGeometry);
    expect(result1.status).toBe(ResolutionStatus.RESOLVED);
    
    // Modify strategy to fail, but cache should still return success
    s1._success = false;
    const result2 = await engine.resolve(gps, snappedGeometry);
    
    expect(result2.status).toBe(ResolutionStatus.RESOLVED);
    expect(result2.previousStation.code).toBe('A');
  });

  test('returns UNRESOLVED if snappedGeometry is missing or empty', async () => {
    const engine = new StationResolutionEngine([], cache);
    
    let result = await engine.resolve(gps, null);
    expect(result.status).toBe(ResolutionStatus.UNRESOLVED);
    expect(result.attempts[0].reason).toBe('No snapped geometry provided');

    result = await engine.resolve(gps, { corridorGeometry: [] });
    expect(result.status).toBe(ResolutionStatus.UNRESOLVED);
  });

  test('catches strategy exceptions and records attempt', async () => {
    const throwingStrategy = {
      name: 'Throwing',
      resolve: async () => { throw new Error('Network error'); }
    };

    const engine = new StationResolutionEngine([throwingStrategy], cache);
    const result = await engine.resolve(gps, snappedGeometry);
    
    expect(result.status).toBe(ResolutionStatus.UNRESOLVED);
    expect(result.attempts[0].strategy).toBe('Throwing');
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].reason).toContain('Network error');
  });

  // Evidence level coverage: every ResolutionMethod value must be propagated unmodified
  test('propagates VERIFIED_TOPOLOGY method and provenance exactly', async () => {
    const s = new MockStrategy('VT', true,
      { code: 'A', source: 'osm' }, { code: 'B', source: 'osm' },
      ConfidenceLevel.HIGH, ResolutionMethod.VERIFIED_TOPOLOGY,
      ['Topological match'], [EvidenceSource.OSM_STATION_NODE, EvidenceSource.OSM_TRACK_GEOMETRY]
    );
    const engine = new StationResolutionEngine([s], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.RESOLVED);
    expect(result.method).toBe(ResolutionMethod.VERIFIED_TOPOLOGY);
    expect(result.confidence).toBe(ConfidenceLevel.HIGH);
    expect(result.evidenceSources).toContain(EvidenceSource.OSM_STATION_NODE);
    expect(result.evidenceSources).toContain(EvidenceSource.OSM_TRACK_GEOMETRY);
  });

  test('propagates OFFLINE_GRAPH method and provenance exactly', async () => {
    const s = new MockStrategy('OG', true,
      { code: 'C', source: 'graph' }, { code: 'D', source: 'graph' },
      ConfidenceLevel.MEDIUM, ResolutionMethod.OFFLINE_GRAPH,
      ['Offline graph match'], [EvidenceSource.OFFLINE_GRAPH]
    );
    const engine = new StationResolutionEngine([s], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.RESOLVED);
    expect(result.method).toBe(ResolutionMethod.OFFLINE_GRAPH);
    expect(result.confidence).toBe(ConfidenceLevel.MEDIUM);
    expect(result.evidenceSources).toEqual([EvidenceSource.OFFLINE_GRAPH]);
  });

  test('propagates PROVIDER_GRAPH method and provenance exactly', async () => {
    const s = new MockStrategy('PG', true,
      { code: 'E', source: 'provider' }, { code: 'F', source: 'provider' },
      ConfidenceLevel.MEDIUM, ResolutionMethod.PROVIDER_GRAPH,
      ['Provider topology'], [EvidenceSource.PROVIDER_TOPOLOGY]
    );
    const engine = new StationResolutionEngine([s], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.RESOLVED);
    expect(result.method).toBe(ResolutionMethod.PROVIDER_GRAPH);
    expect(result.confidence).toBe(ConfidenceLevel.MEDIUM);
    expect(result.evidenceSources).toEqual([EvidenceSource.PROVIDER_TOPOLOGY]);
  });

  test('propagates GEOMETRIC_PROJECTION method and LOW confidence exactly', async () => {
    const s = new MockStrategy('GP', true,
      { code: 'G', source: 'geo' }, { code: 'H', source: 'geo' },
      ConfidenceLevel.LOW, ResolutionMethod.GEOMETRIC_PROJECTION,
      ['Geometric fallback'], [EvidenceSource.GEOMETRIC_PROJECTION]
    );
    const engine = new StationResolutionEngine([s], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.RESOLVED);
    expect(result.method).toBe(ResolutionMethod.GEOMETRIC_PROJECTION);
    expect(result.confidence).toBe(ConfidenceLevel.LOW);
    expect(result.evidenceSources).toEqual([EvidenceSource.GEOMETRIC_PROJECTION]);
    // Confidence Ceiling Rule: GEOMETRIC_PROJECTION must never produce HIGH confidence
    expect(result.confidence).not.toBe(ConfidenceLevel.HIGH);
  });

  test('cascades from VERIFIED_TOPOLOGY failure through to GEOMETRIC_PROJECTION success', async () => {
    const vtFail = new MockStrategy('VT', false);
    const ogFail = new MockStrategy('OG', false);
    const pgFail = new MockStrategy('PG', false);
    const gpSuccess = new MockStrategy('GP', true,
      { code: 'I', source: 'geo' }, { code: 'J', source: 'geo' },
      ConfidenceLevel.LOW, ResolutionMethod.GEOMETRIC_PROJECTION,
      ['Geometric fallback'], [EvidenceSource.GEOMETRIC_PROJECTION]
    );
    const engine = new StationResolutionEngine([vtFail, ogFail, pgFail, gpSuccess], cache);
    const result = await engine.resolve(gps, snappedGeometry);

    expect(result.status).toBe(ResolutionStatus.RESOLVED);
    expect(result.method).toBe(ResolutionMethod.GEOMETRIC_PROJECTION);
    expect(result.attempts).toHaveLength(4);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[1].success).toBe(false);
    expect(result.attempts[2].success).toBe(false);
    expect(result.attempts[3].success).toBe(true);
  });
});

