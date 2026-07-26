Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.computeEtaSeconds = computeEtaSeconds;
/**
 * @module calculations/eta
 * @responsibility Determine ETA topologically based on documented precedence (ADR-008).
 */

function computeEtaSeconds(providerSpeedKmph, previousProgress, currentProgress, distanceAlongTrackMeters, trackLengthMeters, elapsedMs) {
  // Priority 1: Provider-reported speed
  if (providerSpeedKmph && providerSpeedKmph > 0) {
    const speedMps = providerSpeedKmph * (1000 / 3600);
    return Math.round(distanceAlongTrackMeters / speedMps);
  }

  // Priority 2: Computed speed from segmentProgress
  if (previousProgress !== null && previousProgress !== undefined && currentProgress !== null && currentProgress !== undefined && elapsedMs > 0 && trackLengthMeters > 0) {
    const deltaFraction = Math.abs(currentProgress - previousProgress);
    const distanceTravelledMeters = deltaFraction * trackLengthMeters;

    // Guard against noise where distance is extremely small or zero
    if (distanceTravelledMeters > 0) {
      const speedMetresPerMs = distanceTravelledMeters / elapsedMs;
      const speedMps = speedMetresPerMs * 1000;

      // Sanity check: prevent unrealistic speeds > 250 km/h (approx 70 m/s)
      // If speed is realistic, calculate ETA. Otherwise fallback to Priority 3.
      if (speedMps > 0 && speedMps < 70) {
        return Math.round(distanceAlongTrackMeters / speedMps);
      }
    }
  }

  // Priority 3: ETA unavailable
  return null;
}