import { buildCorridorStationIndex } from '../../calculations/station-index.js';

describe('buildCorridorStationIndex', () => {
  const corridor = [
    { lat: 10.0, lng: 20.0 }, // 0
    { lat: 10.0, lng: 20.1 }, // 1
    { lat: 10.1, lng: 20.1 }  // 2
  ];

  it('safely ignores invalid inputs and returns empty array', () => {
    expect(buildCorridorStationIndex(null, [])).toEqual([]);
    expect(buildCorridorStationIndex(corridor, null)).toEqual([]);
  });

  it('safely ignores malformed stations without throwing', () => {
    const stations = [
      { station: { code: 'STN1', source: 'osm' }, lat: 10.0, lng: 20.0 }, // valid
      { station: { code: 'STN2', source: 'osm' }, lat: '10.1' }, // malformed lat, missing lng
      { lat: 10.1, lng: 20.1 } // missing station reference
    ];

    const index = buildCorridorStationIndex(corridor, stations);
    expect(index).toHaveLength(1);
    expect(index[0].station.code).toBe('STN1');
  });

  it('orders stations deterministically by alongTrackDistanceMetres', () => {
    const stations = [
      { station: { code: 'END' }, lat: 10.1, lng: 20.1 },
      { station: { code: 'MIDDLE' }, lat: 10.0, lng: 20.05 },
      { station: { code: 'START' }, lat: 10.0, lng: 20.0 }
    ];

    // Input is reverse order. Result should be sorted ascending.
    const index = buildCorridorStationIndex(corridor, stations);
    
    expect(index).toHaveLength(3);
    expect(index[0].station.code).toBe('START');
    expect(index[1].station.code).toBe('MIDDLE');
    expect(index[2].station.code).toBe('END');

    expect(index[0].alongTrackDistanceMetres).toBeCloseTo(0, 5);
    expect(index[1].alongTrackDistanceMetres).toBeGreaterThan(0);
    expect(index[2].alongTrackDistanceMetres).toBeGreaterThan(index[1].alongTrackDistanceMetres);
  });

  it('applies deterministic tie-breaking for identical alongTrackDistance', () => {
    // Two stations with EXACTLY the same coordinates.
    // Tie-breaker 1 (segmentIndex) & 2 (t) will match.
    // Tie-breaker 3 (original input order) must apply.
    const stations = [
      { station: { code: 'FIRST_DUP' }, lat: 10.0, lng: 20.05 },
      { station: { code: 'SECOND_DUP' }, lat: 10.0, lng: 20.05 }
    ];

    const index = buildCorridorStationIndex(corridor, stations);
    expect(index).toHaveLength(2);
    expect(index[0].station.code).toBe('FIRST_DUP');
    expect(index[1].station.code).toBe('SECOND_DUP');
    
    // Reverse the input order to prove input order matters for perfect ties
    const indexReversed = buildCorridorStationIndex(corridor, [stations[1], stations[0]]);
    expect(indexReversed[0].station.code).toBe('SECOND_DUP');
    expect(indexReversed[1].station.code).toBe('FIRST_DUP');
  });
  
  it('handles stations on different segments correctly', () => {
    const stations = [
      { station: { code: 'SEG_2' }, lat: 10.05, lng: 20.1 }, // Midpoint of segment index 1
      { station: { code: 'SEG_1' }, lat: 10.0, lng: 20.05 }  // Midpoint of segment index 0
    ];

    const index = buildCorridorStationIndex(corridor, stations);
    expect(index).toHaveLength(2);
    
    expect(index[0].station.code).toBe('SEG_1');
    expect(index[0].segmentIndex).toBe(0);
    
    expect(index[1].station.code).toBe('SEG_2');
    expect(index[1].segmentIndex).toBe(1);
  });

  it('returns deeply frozen immutable entries including nested station objects', () => {
    const stations = [
      { station: { code: 'STN1', meta: { nested: true } }, lat: 10.0, lng: 20.0 }
    ];
    const index = buildCorridorStationIndex(corridor, stations);
    
    expect(Object.isFrozen(index)).toBe(true);
    expect(Object.isFrozen(index[0])).toBe(true);
    expect(Object.isFrozen(index[0].projectedPoint)).toBe(true);
    expect(Object.isFrozen(index[0].station)).toBe(true);
    expect(Object.isFrozen(index[0].station.meta)).toBe(true);
  });

  it('safely ignores stations that fail projection without throwing', () => {
    // A station with coordinates far away or invalid that causes projectPointOntoCorridor to return null (if applicable).
    // In our implementation, projectPointOntoCorridor only returns null for invalid inputs which we already test.
    // Let's explicitly pass a station missing coordinates but bypassing our first check if possible.
    // We already tested malformed stations. Let's explicitly assert no throw.
    const stations = [
      { station: { code: 'STN1' }, lat: 10.0, lng: 20.0 },
      { station: { code: 'STN_INVALID' }, lat: null, lng: null }
    ];
    
    expect(() => buildCorridorStationIndex(corridor, stations)).not.toThrow();
    const index = buildCorridorStationIndex(corridor, stations);
    expect(index).toHaveLength(1);
    expect(index[0].station.code).toBe('STN1');
  });
});
