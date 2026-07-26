class DirectionalInferenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DirectionalInferenceError';
  }
}

class ValidationError extends DirectionalInferenceError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = {
  DirectionalInferenceError,
  ValidationError
};
