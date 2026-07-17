import { ConfigurationError } from '../utils/errors.js';

/**
 * Load and validate all required environment variables.
 * Throws ConfigurationError on the first missing required variable.
 * Call once at process startup.
 * @returns {Object} AppConfig
 */
export function loadEnv() {
  const railradarKey = requireEnv('RAILRADAR_KEY');
  const rawPort = process.env['PORT'] ?? '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(`PORT must be an integer 1-65535, got: "${rawPort}"`);
  }

  const rawEnv = process.env['NODE_ENV'] ?? 'development';
  if (rawEnv !== 'development' && rawEnv !== 'production' && rawEnv !== 'test') {
    throw new ConfigurationError(`NODE_ENV must be development | production | test, got: "${rawEnv}"`);
  }

  const railradarMinEvidence = process.env['RAILRADAR_MIN_EVIDENCE'] ?? 'VERIFIED_TOPOLOGY';

  return {
    railradarKey,
    railradarMinEvidence,
    port,
    nodeEnv: rawEnv,
    apiUrl: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
    overpass: {
      url: process.env['OVERPASS_URL'] ?? 'https://overpass-api.de/api/interpreter',
      gridSizeDeg: 0.005,
      cacheTtlSuccessMs: 30 * 60 * 1000,
      cacheTtlNoCorridorMs: 10 * 60 * 1000,
      cacheTtlTransientFailureMs: 45 * 1000,
      maxAttempts: 4,
      retryDelaysMs: [0, 500, 1000, 2000],
      requestTimeoutMs: 10000,
    }
  };
}

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    throw new ConfigurationError(
      `Required environment variable "${name}" is missing or empty. ` +
        `Copy .env.example to .env and set the value before starting.`,
    );
  }
  return val;
}
