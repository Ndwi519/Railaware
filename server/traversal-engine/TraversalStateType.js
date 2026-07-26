const TraversalStateType = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  TRACKING: 'TRACKING',
  AT_STATION: 'AT_STATION',
  RECOVERING: 'RECOVERING',
  LOST: 'LOST'
});

module.exports = {
  TraversalStateType
};
