Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ValidationError = exports.TopologyError = exports.RailAwareError = exports.ProviderError = exports.NetworkError = exports.ConfigurationError = exports.CacheError = void 0;
/**
 * @module utils/errors
 * @responsibility Define all typed error classes used across RailAware.
 */

class RailAwareError extends Error {
  constructor(message, context) {
    super(message);
    this.context = context;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
exports.RailAwareError = RailAwareError;
class ConfigurationError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'ConfigurationError';
  }
}
exports.ConfigurationError = ConfigurationError;
class ProviderError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'ProviderError';
  }
}
exports.ProviderError = ProviderError;
class ValidationError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'ValidationError';
  }
}
exports.ValidationError = ValidationError;
class TopologyError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'TopologyError';
  }
}
exports.TopologyError = TopologyError;
class CacheError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'CacheError';
  }
}
exports.CacheError = CacheError;
class NetworkError extends RailAwareError {
  constructor(message, context) {
    super(message, context);
    this.name = 'NetworkError';
  }
}
exports.NetworkError = NetworkError;