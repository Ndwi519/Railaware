class TopologyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TopologyError';
  }
}

module.exports = {
  TopologyError
};
