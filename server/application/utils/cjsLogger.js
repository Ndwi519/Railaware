/**
 * @module application/utils/cjsLogger
 * @responsibility Emit structured JSON log entries compatible with the server-wide log format.
 *
 * This module exists because the main `utils/logger.js` is pure ESM and cannot be
 * require()'d from CommonJS modules without dynamic import() which breaks Jest's
 * synchronous module resolution. This adapter produces identical JSON output.
 *
 * Public API:
 *  - createCjsLogger(module: string): Logger
 *
 * @param {string} moduleName  Value placed in the `module` field of every log entry.
 * @returns {{ error: Function, warn: Function, info: Function, debug: Function }}
 */
function createCjsLogger(moduleName) {
  function emit(level, message, err) {
    if (process.env.NODE_ENV === 'test' && level !== 'error') return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module: moduleName,
      message,
    };
    if (err instanceof Error) entry.error = err.message;
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  return {
    debug: (msg) => emit('debug', msg),
    info:  (msg) => emit('info', msg),
    warn:  (msg) => emit('warn', msg),
    error: (msg, err) => emit('error', msg, err),
  };
}

module.exports = { createCjsLogger };
