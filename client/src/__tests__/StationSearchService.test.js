import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StationSearchService } from '../services/StationSearchService';

describe('StationSearchService', () => {
  let mockFetch;
  let service;

  beforeEach(() => {
    mockFetch = vi.fn();
    service = new StationSearchService(mockFetch);
  });

  it('resolves raw lat,lng coordinates', async () => {
    const result = await service.search('28.6, 77.2');
    expect(result).toEqual([28.6, 77.2]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves exact station code from in-memory index', async () => {
    const result = await service.search('NDLS');
    expect(result).toEqual([28.6429, 77.2191]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves partial station code from in-memory index', async () => {
    const result = await service.search('cst');
    expect(result).toEqual([18.9400, 72.8353]); // cstm
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('falls back to Nominatim API for unknown query', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => [{ lat: '12.34', lon: '56.78' }]
    });

    const result = await service.search('unknown station');
    expect(result).toEqual([12.34, 56.78]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://nominatim.openstreetmap.org/search?q=unknown%20station&format=json&limit=1'
    );
  });

  it('returns null if Nominatim returns empty', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => []
    });

    const result = await service.search('empty result');
    expect(result).toBeNull();
  });

  it('returns null for empty query', async () => {
    const result = await service.search('   ');
    expect(result).toBeNull();
  });
});
