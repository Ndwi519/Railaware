import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AwarenessService, NetworkError } from '../services/AwarenessService';

describe('AwarenessService', () => {
  let mockFetch;
  let service;

  beforeEach(() => {
    mockFetch = vi.fn();
    service = new AwarenessService(mockFetch, 'http://test-api');
  });

  it('fetches observation successfully', async () => {
    const mockData = { id: 1, name: 'Test Observation' };
    const expectedLegacyResponse = {
      awareness: {
        status: 'NO_TRACKS_NEARBY',
        distanceMetres: null,
        requiresProminentDisplay: false,
        nearestCrossing: null,
        nearestStation: null,
        nearbyTracks: []
      },
      discoveryContext: {
        corridor: null,
        providerError: false,
        discoveredTrains: null
      },
      assistance: {
        guidance: {
          title: "About This Information",
          instructions: ["RailAware provides situational awareness based on public data. It is NOT a substitute for visual confirmation."]
        },
        availableActions: [],
        emergencyContact: null
      },
      raw: mockData
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('test-session') },
      json: async () => mockData
    });

    const signal = new AbortController().signal;
    const result = await service.fetchAwareness(10, 20, signal);

    expect(result).toEqual(expectedLegacyResponse);
    expect(mockFetch).toHaveBeenCalledWith('http://test-api/api/v1/awareness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 10, lng: 20 }),
      signal
    });
  });

  it('throws NetworkError on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    await expect(service.fetchAwareness(10, 20)).rejects.toThrow(NetworkError);
    await expect(service.fetchAwareness(10, 20)).rejects.toMatchObject({
      status: 500,
      name: 'NetworkError'
    });
  });
});
