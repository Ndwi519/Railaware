/**
 * @module utils/errors
 * @responsibility Define all typed error classes used across RailAware.
 */

export class RailAwareError extends Error {
  constructor(message, context) {
    super(message);
    this.context = context;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigurationError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'ConfigurationError';
  }
}

export class ProviderError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'ProviderError';
  }
}

export class ValidationError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'ValidationError';
  }
}

export class TopologyError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'TopologyError';
  }
}

export class RiskEngineError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'RiskEngineError';
  }
}

export class CacheError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'CacheError';
  }
}

export class NetworkError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'NetworkError';
  }
}
