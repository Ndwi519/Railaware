const { ConfigurationError } = require('../utils/errors.js');

/**
 * Load and validate all required environment variables.
 * Throws ConfigurationError on the first missing required variable.
 * Call once at process startup.
 * @returns {Object} AppConfig
 */
function loadEnv() {
  const railradarKey = requireEnv('RAILRADAR_KEY');
  let rawPort = process.env['PORT'];
  if (rawPort === undefined || rawPort === null || rawPort.trim() === '') rawPort = '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(`PORT must be an integer 1-65535, got: "${rawPort}"`);
  }

  let rawEnv = process.env['NODE_ENV'];
  if (rawEnv === undefined || rawEnv === null || rawEnv.trim() === '') rawEnv = 'development';
  if (rawEnv !== 'development' && rawEnv !== 'production' && rawEnv !== 'test') {
    throw new ConfigurationError(`NODE_ENV must be development | production | test, got: "${rawEnv}"`);
  }

  const rawCors = process.env['CORS_ORIGINS'];
  const corsOrigins = rawCors ? rawCors.split(',').map(s => s.trim()) : ['http://localhost:5173'];

  const railradarMinEvidence = process.env['RAILRADAR_MIN_EVIDENCE'] ?? 'VERIFIED_TOPOLOGY';

  const emergencyPhoneNumber = process.env['EMERGENCY_PHONE_NUMBER'] || null;

  return {
    railradarKey,
    railradarMinEvidence,
    emergencyPhoneNumber,
    provider: {
      timeoutMs: parseStrictPositiveInteger('PROVIDER_TIMEOUT_MS', 3000),
    },
    port,
    nodeEnv: rawEnv,
    corsOrigins,
    apiUrl: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
    overpass: {
      primaryUrl: process.env['OVERPASS_URL'] ?? process.env['PRIMARY_OVERPASS_URL'] ?? 'https://overpass-api.de/api/interpreter',
      secondaryUrl: process.env['SECONDARY_OVERPASS_URL'] || null,
      gridSizeDeg: 0.005,
      cacheTtlSuccessMs: parseNonNegativeInteger('SPATIAL_CACHE_TTL_SECONDS', 30 * 60) * 1000,
      cacheMaxAgeMs: parseNonNegativeInteger('SPATIAL_CACHE_MAX_AGE_SECONDS', 24 * 60 * 60) * 1000,
      cacheMaxEntries: parseStrictPositiveInteger('SPATIAL_CACHE_MAX_ENTRIES', 1000),
      providerCooldownMs: parseNonNegativeInteger('PROVIDER_FAILURE_COOLDOWN_SECONDS', 60) * 1000,
      requestTimeoutMs: 10000,
    }
  };
}

function parseStrictPositiveInteger(name, defaultValue) {
  const val = process.env[name];
  if (val === undefined || val === null || val.trim() === '') return defaultValue;
  const num = Number(val);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
    throw new ConfigurationError(`Environment variable ${name} must be a positive integer (> 0), got: "${val}"`);
  }
  return num;
}

function parseNonNegativeInteger(name, defaultValue) {
  const val = process.env[name];
  if (val === undefined || val === null || val.trim() === '') return defaultValue;
  const num = Number(val);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    throw new ConfigurationError(`Environment variable ${name} must be a non-negative integer (>= 0), got: "${val}"`);
  }
  return num;
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

module.exports = { loadEnv };
