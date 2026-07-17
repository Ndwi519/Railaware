/**
 * @module client/services/StationSearchService
 * @responsibility Resolve a user text query into a [lat, lng] coordinate pair.
 *
 * Resolution order:
 *  1. Raw "lat, lng" string parse
 *  2. Exact match against the curated in-memory station index
 *  3. Partial match against the curated in-memory station index
 *  4. Nominatim geocoding fallback (via injected fetch implementation)
 *
 * The fetch implementation is injected via the constructor so tests can supply
 * a mock without patching globals.
 *
 * Public API:
 *  - search(query: string): Promise<[number, number] | null>
 */

/**
 * Curated index of major Indian Railways station codes to coordinates.
 * @type {Record<string, [number, number]>}
 */
const STATION_INDEX = {
  ndls: [28.6429, 77.2191],
  cstm: [18.9400, 72.8353],
  hwh:  [22.5839, 88.3433],
  mas:  [13.0827, 80.2707],
};

export class StationSearchService {
  /**
   * @param {Function} [fetchImpl] - Injected fetch implementation (defaults to global fetch).
   */
  constructor(fetchImpl = (...args) => fetch(...args)) {
    this._fetch = fetchImpl;
  }

  /**
   * Resolve a search query to a [lat, lng] coordinate pair, or null if not found.
   * @param {string} query
   * @returns {Promise<[number, number] | null>}
   */
  async search(query) {
    const trimmed = query.trim();
    if (!trimmed) return null;

    // 1. Raw coordinate parse: "lat, lng"
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng];
      }
    }

    const lower = trimmed.toLowerCase();

    // 2. Exact station code match
    if (STATION_INDEX[lower]) {
      return STATION_INDEX[lower];
    }

    // 3. Partial station code match
    for (const [code, coords] of Object.entries(STATION_INDEX)) {
      if (code.includes(lower)) {
        return coords;
      }
    }

    // 4. Nominatim geocoding fallback
    const response = await this._fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }

    return null;
  }
}
