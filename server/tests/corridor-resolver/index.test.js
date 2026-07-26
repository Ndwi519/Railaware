'use strict';

const { CorridorResolver } = require('../../corridor-resolver/resolver.js');

describe('Corridor Resolver', () => {
  let mockOverpass;
  let resolver;

  beforeEach(() => {
    mockOverpass = {
      fetchNearbyRailways: jest.fn()
    };
    resolver = new CorridorResolver(mockOverpass);
  });

  function createMockData(nodes, ways, stations = []) {
    const elements = [];
    nodes.forEach(n => elements.push({ type: 'node', id: n.id, lat: n.lat, lon: n.lng }));
    ways.forEach(w => elements.push({ type: 'way', id: w.id, nodes: w.nodes, tags: { railway: 'rail' } }));

    // Build legacy corridors for seed way resolver
    const corridors = ways.map(w => {
      const points = w.nodes.map(nid => nodes.find(n => n.id === nid)).map(n => ({ lat: n.lat, lng: n.lng }));
      return {
        id: w.id.toString(),
        topology: Object.freeze({ points })
      };
    });

    return { corridors, stations, elements };
  }

  test('Returns null when no corridors found', async () => {
    mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors: [], stations: [], elements: [] });
    const result = await resolver.resolveNearest({ lat: 0, lng: 0 }, 500);
    expect(result).toBeNull();
  });

  test('Resolves nearest corridor and returns explicitly null route-relative metrics', async () => {
    const nodes = [
      { id: 101, lat: 10.0, lng: 10.0 },
      { id: 102, lat: 10.0, lng: 10.01 },
      { id: 103, lat: 10.0, lng: 10.02 }
    ];
    const ways = [{ id: 1, nodes: [101, 102, 103] }];
    mockOverpass.fetchNearbyRailways.mockResolvedValue(createMockData(nodes, ways));

    const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.01 }, 500);

    expect(result).not.toBeNull();
    expect(result.nearestCorridor.resolutionStatus).toBe('RESOLVED');
    expect(result.nearestCorridor.nearestBoundingStations).toBeNull();
    expect(result.nearestCorridor.corridorGeometry).toBeNull();
    expect(result.nearestCorridor.userSegmentFraction).toBeNull();
    expect(result.nearestCorridor.segmentLengthKm).toBeNull();
  });

  test('Attaches stations using geometric projection and deterministic tie-breaking', async () => {
    const nodes = [
      { id: 101, lat: 10.0, lng: 10.0 },
      { id: 102, lat: 10.0, lng: 10.01 },
      { id: 103, lat: 10.0, lng: 10.02 }
    ];
    const ways = [{ id: 1, nodes: [101, 102, 103] }];

    const stations = [
      {
        id: 101,
        hasRefIR: true,
        hasName: true,
        feature: { station: { code: 'STA1', name: 'Station 1', source: 'osm' }, lat: 10.0, lng: 10.0 }
      },
      {
        id: 999,
        hasRefIR: false,
        hasName: false,
        feature: { station: { code: 'STA2', source: 'osm' }, lat: 10.0, lng: 10.0101 }
      },
      {
        id: 888, // Outside threshold
        hasRefIR: false,
        hasName: false,
        feature: { station: { code: 'STA3', source: 'osm' }, lat: 15.0, lng: 15.0 }
      },
      {
        id: 105, // Deduplicate
        hasRefIR: false,
        hasName: true,
        feature: { station: { code: 'STA1', name: 'Duplicate 1', source: 'osm' }, lat: 10.0, lng: 10.0001 }
      }
    ];

    mockOverpass.fetchNearbyRailways.mockResolvedValue(createMockData(nodes, ways, stations));

    const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.01 }, 500);
    expect(result).not.toBeNull();
    expect(result.nearestCorridor.stations).toBeDefined();
    expect(result.nearestCorridor.stations.length).toBe(2);

    expect(result.nearestCorridor.stations[0].station.code).toBe('STA1');
    expect(result.nearestCorridor.stations[0].station.name).toBe('Station 1');
    expect(result.nearestCorridor.stations[1].station.code).toBe('STA2');
  });

  test('resolver fails safely on partial failure', async () => {
    mockOverpass.fetchNearbyRailways.mockResolvedValue({ corridors: [], stations: [], elements: [] });
    const result = await resolver.resolveNearest({ lat: 0, lng: 0 }, 500);
    expect(result).toBeNull();
  });

  test('deep freezes the output', async () => {
    const nodes = [
      { id: 101, lat: 10.0, lng: 10.0 },
      { id: 102, lat: 10.0, lng: 10.01 }
    ];
    const ways = [{ id: 1, nodes: [101, 102] }];
    mockOverpass.fetchNearbyRailways.mockResolvedValue(createMockData(nodes, ways));

    const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.nearestCorridor.stations)).toBe(true);
  });

  test('deterministically resolves duplicate stations favoring smallest node ID when priority matches', async () => {
    const nodes = [
      { id: 101, lat: 10.0, lng: 10.0 },
      { id: 102, lat: 10.0, lng: 10.01 }
    ];
    const ways = [{ id: 1, nodes: [101, 102] }];

    const stations = [
      {
        id: 999, hasRefIR: true, hasName: true,
        feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 }
      },
      {
        id: 500, hasRefIR: true, hasName: true,
        feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 }
      },
      {
        id: 700, hasRefIR: true, hasName: true,
        feature: { station: { code: 'STA1', source: 'osm' }, lat: 10.0, lng: 10.0 }
      }
    ];

    mockOverpass.fetchNearbyRailways.mockResolvedValue(createMockData(nodes, ways, stations));

    const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
    expect(result.nearestCorridor.stations.length).toBe(1);
    expect(stations.find(s => s.id === 500).feature).toEqual(result.nearestCorridor.stations[0]);
  });

  test('fallback threshold boundary tests', async () => {
    const nodes = [
      { id: 101, lat: 10.0, lng: 10.0 },
      { id: 102, lat: 10.0, lng: 10.01 }
    ];
    const ways = [{ id: 1, nodes: [101, 102] }];

    const stations = [
      {
        id: 201, hasRefIR: false, hasName: false, // Approx 99m away (inside 175m default threshold)
        feature: { station: { code: 'EXACT', source: 'osm' }, lat: 10.00089, lng: 10.005 }
      },
      {
        id: 202, hasRefIR: false, hasName: false, // Approx 333m away (outside threshold)
        feature: { station: { code: 'OUTSIDE', source: 'osm' }, lat: 10.003, lng: 10.005 }
      },
      {
        id: 203, hasRefIR: false, hasName: false, // Inside threshold
        feature: { station: { code: 'INSIDE', source: 'osm' }, lat: 10.0005, lng: 10.005 }
      }
    ];

    mockOverpass.fetchNearbyRailways.mockResolvedValue(createMockData(nodes, ways, stations));

    const result = await resolver.resolveNearest({ lat: 10.0, lng: 10.0 }, 500);
    const codes = result.nearestCorridor.stations.map(s => s.station.code);
    expect(codes).toContain('EXACT');
    expect(codes).toContain('INSIDE');
    expect(codes).not.toContain('OUTSIDE');
  });

});