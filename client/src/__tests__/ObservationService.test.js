import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObservationService, NetworkError } from '../services/ObservationService';

describe('ObservationService', () => {
  let mockFetch;
  let service;

  beforeEach(() => {
    mockFetch = vi.fn();
    service = new ObservationService(mockFetch, 'http://test-api');
  });

  it('fetches observation successfully', async () => {
    const mockData = { id: 1, name: 'Test Observation' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('test-session') },
      json: async () => mockData
    });

    const signal = new AbortController().signal;
    const result = await service.fetchObservation(10, 20, signal);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith('http://test-api/api/v1/observation', {
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

    await expect(service.fetchObservation(10, 20)).rejects.toThrow(NetworkError);
    await expect(service.fetchObservation(10, 20)).rejects.toMatchObject({
      status: 500,
      name: 'NetworkError'
    });
  });
});
