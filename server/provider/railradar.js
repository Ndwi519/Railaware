Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RailRadarProvider = void 0;
exports.authHeaders = authHeaders;
exports.endpoints = void 0;
var _index = require("../utils/index.js");
var _validation = require("./validation.js");
const log = (0, _index.createLogger)('provider:railradar');
const BASE_URL = "https://api.railradar.in";
const endpoints = exports.endpoints = {
  liveTrain: trainNumber => `${BASE_URL}/v1/trains/${trainNumber}/live`,
  trainsBetween: (fromStationCode, toStationCode) => `${BASE_URL}/v1/trains/between/${fromStationCode}/${toStationCode}`
};
function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`
  };
}
async function fetchWithRetryAndTimeout(url, options, retries = 2, timeoutMs = 5000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) continue;
        throw new _index.ProviderError(`RailRadar responded with ${res.status} for ${url}`);
      }
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        log.warn(`Request timed out (attempt ${attempt + 1})`, {
          url
        });
      } else {
        log.warn(`Request failed (attempt ${attempt + 1})`, {
          url,
          error: err.message
        });
      }
      if (attempt === retries) throw new _index.ProviderError(`Provider request failed after ${retries + 1} attempts: ${err.message}`);
    }
  }
}
class RailRadarProvider {
  config;
  constructor(config) {
    this.config = config;
  }
  async discoverNearbyTrains(fromStation, toStation) {
    log.debug('Discovering trains between stations', {
      fromStation,
      toStation
    });
    const res = await fetchWithRetryAndTimeout(endpoints.trainsBetween(fromStation, toStation), {
      headers: authHeaders(this.config.railradarKey)
    },
    this.config.provider?.retryCount ?? 2,
    this.config.provider?.timeoutMs ?? 3000
    );
    const json = await res.json();

    // Strict Zod Validation
    const parsed = _validation.DiscoverTrainsSchema.safeParse(json);
    if (!parsed.success) {
      log.error('RailRadar discoverNearbyTrains payload malformed', {
        errors: parsed.error.issues
      });
      throw new _index.ProviderError('Malformed provider payload');
    }
    const data = parsed.data;
    if (!data.success || !data.data || !data.data.trains) {
      return [];
    }
    return data.data.trains.map(t => ({
      id: t.train.number,
      name: t.train.name,
      departure: t.from?.departure,
      arrival: t.to?.arrival
    }));
  }
  async getLiveTrainProgress(trainNumber) {
    log.debug('Fetching live train topological progress', {
      trainNumber
    });
    const res = await fetchWithRetryAndTimeout(endpoints.liveTrain(trainNumber), {
      headers: authHeaders(this.config.railradarKey)
    },
    this.config.provider?.retryCount ?? 2,
    this.config.provider?.timeoutMs ?? 3000
    );
    const json = await res.json();

    // Strict Zod Validation
    const parsed = _validation.LiveTrainProgressSchema.safeParse(json);
    if (!parsed.success) {
      log.error('RailRadar getLiveTrainProgress payload malformed', {
        errors: parsed.error.issues
      });
      throw new _index.ProviderError('Malformed provider payload');
    }
    const validatedJson = parsed.data;
    if (!validatedJson.success || !validatedJson.data) {
      throw new _index.ProviderError('Invalid response from RailRadar for live train');
    }
    const data = validatedJson.data;
    const currentLocation = data.currentLocation || {};
    return {
      id: data.trainNumber,
      status: data.status,
      previousStation: data.previousHalt?.stationCode || currentLocation.stationCode,
      nextStation: data.nextHalt?.stationCode,
      segmentProgress: currentLocation.segmentProgress || 0,
      isActualPosition: currentLocation.isActualPosition ?? false,
      lastUpdatedAt: data.lastUpdatedAt,
      isLive: data.isLive
    };
  }
}
exports.RailRadarProvider = RailRadarProvider;