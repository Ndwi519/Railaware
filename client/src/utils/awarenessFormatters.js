export const formatStatus = (status) => {
  if (status === null || status === undefined) {
    return 'Unavailable';
  }
  const map = {
    'AT_STATION': 'At Target Station',
    'APPROACHING_STATION': 'Approaching Target Station',
    'DEPARTED_STATION': 'Departed Target Station',
    'DISTANT': 'Distant',
    'NO_TRAINS_FOUND': 'No Trains Found',
    'UNKNOWN': 'Unknown',
    'CANCELLED': 'Train Cancelled'
  };
  return map[status] || status.replace(/_/g, ' ');
};

export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return 'Distance unavailable';
  return `~${meters} m`;
};

export const formatConfidence = (confidence) => {
  if (confidence === null || confidence === undefined) {
    return 'Confidence unavailable';
  }
  const map = {
    'HIGH': 'High Certainty',
    'MEDIUM': 'Moderate Certainty',
    'LOW': 'Low Certainty',
    'UNKNOWN': 'Unknown Certainty'
  };
  return map[confidence] || confidence.charAt(0).toUpperCase() + confidence.slice(1).toLowerCase().replace(/_/g, ' ');
};
