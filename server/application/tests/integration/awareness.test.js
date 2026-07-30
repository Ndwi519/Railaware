const { createSpatialAwarenessService } = require('../../services/createSpatialAwarenessService.js');
const thresholds = require('../../../config/thresholds.js');
const { TopologyError } = require('../../../utils/errors.js');

class MockOverpass {
  constructor(elements = []) {
    this.elements = elements;
  }
  async fetchNearbyRailways(location, radius) {
    if (location.lat === 0 && location.lng === 0) {
      throw new TopologyError("No topology found");
    }
    const { extractStationFeature } = require('../../../corridor-resolver/station-helper.js');
    const stations = [];
    for (const e of this.elements) {
      if (e.type === 'node' && e.tags && e.tags.railway === 'station') {
        const extracted = extractStationFeature(e);
        if (extracted) stations.push(extracted);
      }
    }
    return {
      elements: this.elements,
      stations: stations
    };
  }
}

describe('SpatialAwarenessService - Awareness Endpoint Logic', () => {
  let service;
  let mockOverpass;

  beforeEach(() => {
    mockOverpass = new MockOverpass();
    service = createSpatialAwarenessService({
      overpassClient: mockOverpass,
      thresholds
    });
  });

  test('no railway found', async () => {
    const result = await service.getNearbyAwareness({ lat: 10, lng: 10 });
    expect(result.nearbyTracks).toEqual([]);
    expect(result.nearestStation).toBeNull();
  });

  test('isolated railway', async () => {
    mockOverpass.elements = [
      { type: 'node', id: 1, lat: 10, lon: 10 },
      { type: 'node', id: 2, lat: 10.0001, lon: 10 },
      { type: 'way', id: 100, nodes: [1, 2], tags: { railway: 'rail' } }
    ];
    const result = await service.getNearbyAwareness({ lat: 10, lng: 10 });
    expect(result.nearbyTracks.length).toBe(1);
    expect(result.nearbyTracks[0].id).toMatch(/branch_1_2/);
  });

  test('disconnected clusters (parallel tracks)', async () => {
    mockOverpass.elements = [
      { type: 'node', id: 1, lat: 10, lon: 10 },
      { type: 'node', id: 2, lat: 10.0001, lon: 10 },
      { type: 'way', id: 100, nodes: [1, 2], tags: { railway: 'rail' } },
      
      { type: 'node', id: 3, lat: 10, lon: 10.0001 },
      { type: 'node', id: 4, lat: 10.0001, lon: 10.0001 },
      { type: 'way', id: 101, nodes: [3, 4], tags: { railway: 'rail' } }
    ];
    const result = await service.getNearbyAwareness({ lat: 10, lng: 10 });
    expect(result.nearbyTracks.length).toBe(2);
    expect(result.nearbyTracks[0].id).toMatch(/branch_1_2/);
    expect(result.nearbyTracks[1].id).toMatch(/branch_3_4/);
  });

  test('station present', async () => {
    mockOverpass.elements = [
      { type: 'node', id: 1, lat: 10, lon: 10 },
      { type: 'node', id: 2, lat: 10.0001, lon: 10 },
      { type: 'way', id: 100, nodes: [1, 2], tags: { railway: 'rail' } },
      { type: 'node', id: 999, lat: 10, lon: 10, tags: { railway: 'station', ref: 'STN', name: 'Test Station' } }
    ];
    const result = await service.getNearbyAwareness({ lat: 10, lng: 10 });
    expect(result.nearestStation).not.toBeNull();
    expect(result.nearestStation.id).toBe('STN');
    expect(result.nearestStation.name).toBe('Test Station');
  });

  test('station absent', async () => {
    mockOverpass.elements = [
      { type: 'node', id: 1, lat: 10, lon: 10 },
      { type: 'node', id: 2, lat: 10.0001, lon: 10 },
      { type: 'way', id: 100, nodes: [1, 2], tags: { railway: 'rail' } }
    ];
    const result = await service.getNearbyAwareness({ lat: 10, lng: 10 });
    expect(result.nearestStation).toBeNull();
  });

  test('invalid coordinates throw error', async () => {
    await expect(service.getNearbyAwareness(null)).rejects.toThrow();
  });

  test('cache bypass behavior (TopologyError)', async () => {
    await expect(service.getNearbyAwareness({ lat: 0, lng: 0 })).rejects.toThrow(TopologyError);
  });
});
