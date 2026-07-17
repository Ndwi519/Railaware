export const formatStatus = (status) => {
  if (!status) return 'Unknown Status';
  const map = {
    'AT_STATION': 'At Target Station',
    'APPROACHING_STATION': 'Approaching Target Station',
    'DEPARTED_STATION': 'Departed Target Station',
    'DISTANT': 'Distant',
    'NO_TRAINS_FOUND': 'No Trains Found',
    'UNKNOWN': 'Unknown Status',
    'CANCELLED': 'Train Cancelled'
  };
  return map[status] || status.replace(/_/g, ' ');
};

export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return 'Distance unavailable';
  return `~${meters} m`;
};

export const formatConfidence = (confidence) => {
  if (!confidence) return 'Unknown';
  const map = {
    'HIGH': 'High Certainty',
    'MEDIUM': 'Moderate Certainty',
    'LOW': 'Low Certainty',
    'UNKNOWN': 'Unknown Certainty'
  };
  return map[confidence] || confidence.charAt(0).toUpperCase() + confidence.slice(1).toLowerCase().replace(/_/g, ' ');
};
