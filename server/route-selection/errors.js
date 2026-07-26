/**
 * Error thrown when an invalid operation is attempted within Route Selection.
 */
class RouteSelectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RouteSelectionError';
  }
}

/**
 * Error thrown when input Evidence is invalid.
 */
class ValidationError extends RouteSelectionError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = {
  RouteSelectionError,
  ValidationError
};
