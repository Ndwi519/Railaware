/**
 * @module client/services/ObservationService
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
 *  - fetchObservation(lat, lng, signal): Promise<Object>
 */

export class NetworkError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'NetworkError';
    this.status = status ?? null;
  }
}

export class ObservationService {
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
  async fetchObservation(lat, lng, signal) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._sessionId) {
      headers['x-session-id'] = this._sessionId;
    }

    const response = await this._fetch(`${this._baseUrl}/api/v1/observation`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lat, lng }),
      signal,
    });

    if (!response.ok) {
      throw new NetworkError(`API returned ${response.status}`, { status: response.status });
    }

    const returnedSessionId = response.headers.get('x-session-id');
    if (returnedSessionId && !this._sessionId) {
      this._sessionId = returnedSessionId;
    }

    return response.json();
  }
}
