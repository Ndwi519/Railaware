/**
 * @module client/services/AwarenessService
 * @responsibility Backend communication for the observation pipeline.
 *
 * Owns:
 *  - Constructing API request objects
 *  - Performing fetch calls (via injected fetchImpl)
 *  - Parsing JSON responses
 *  - Translating HTTP / network failures into typed errors
 *
 * Does NOT own:
 *  - React state
 *  - AbortController lifecycle
 *  - Retry logic
 *
 * Public API:
 *  - fetchAwareness(lat, lng, signal): Promise<Object>
 */

export class NetworkError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'NetworkError';
    this.status = status ?? null;
  }
}

export class AwarenessService {
  /**
   * @param {Function} [fetchImpl] - Injected fetch implementation (defaults to global fetch).
   * @param {string}   [baseUrl]   - API base URL (defaults to VITE_API_URL or localhost).
   */
  constructor(
    fetchImpl = (...args) => fetch(...args),
    baseUrl = import.meta.env.VITE_API_URL || ''
  ) {
    this._fetch = fetchImpl;
    this._baseUrl = baseUrl;
    this._sessionId = null;
  }

  /**
   * POST /api/v1/observation and return the parsed response body.
   * @param {number} lat
   * @param {number} lng
   * @param {AbortSignal} [signal]
   * @returns {Promise<Object>}
   * @throws {NetworkError} on HTTP errors
   * @throws {DOMException}  on abort (name === 'AbortError')
   */
  async fetchAwareness(lat, lng, signal) {
    const headers = { 'Content-Type': 'application/json' };

    const response = await this._fetch(`${this._baseUrl}/api/v1/awareness`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lat, lng }),
      signal,
    });

    if (!response.ok) {
      throw new NetworkError(`API returned ${response.status}`, { status: response.status });
    }

    const data = await response.json();

    // Mapping layer: Translate Phase 1 Awareness schema to Legacy UI expected schema
    const legacyResponse = {
      awareness: {
        status: data.nearbyTracks?.length > 0 ? 'TRACKS_NEARBY' : 'NO_TRACKS_NEARBY',
        distanceMetres: data.nearbyTracks?.length > 0 ? Math.round(data.nearbyTracks[0].crossTrackDistanceMetres) : null,
        requiresProminentDisplay: false // Phase 1 does not know train locations, cannot assert danger
      },
      discoveryContext: {
        corridor: data.nearbyTracks?.length > 0 ? { resolutionStatus: 'RESOLVED' } : null,
        providerError: false,
        discoveredTrains: null // explicitly null to indicate no train data
      },
      assistance: {
        guidance: {
          title: "Phase 1: Static Awareness Only",
          instructions: [data.disclaimer || "RailAware provides situational awareness based on public data. It is NOT a substitute for visual confirmation."]
        },
        availableActions: [],
        emergencyContact: null
      },
      raw: data
    };

    return legacyResponse;
  }
}
