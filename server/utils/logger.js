/**
 * @module utils/logger
 * @responsibility Emit structured JSON logs with mandatory fields.
 */

/**
 * Create a structured logger for a named module.
 * @param {string} module 
 * @param {string} [correlationId] 
 */
export function createLogger(module, correlationId) {
  function emit(level, message, context, err) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      ...(correlationId ? { correlationId } : {}),
      message,
      ...(context ? { context } : {}),
    };
    if (err instanceof Error && err.stack) {
      entry.stack = err.stack;
    }
    // In test environments, suppress output unless LOG_LEVEL=debug
    if (process.env.NODE_ENV === 'test' && level !== 'error') {
      if (process.env.LOG_LEVEL !== 'debug') return;
    }
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  return {
    debug: (msg, ctx) => emit('debug', msg, ctx),
    info: (msg, ctx) => emit('info', msg, ctx),
    warn: (msg, ctx) => emit('warn', msg, ctx),
    error: (msg, err, ctx) => emit('error', msg, ctx, err),
    child: (cid) => createLogger(module, cid),
  };
}
