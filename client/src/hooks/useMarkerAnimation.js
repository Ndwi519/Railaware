import { useState, useEffect, useRef } from 'react';

/**
 * useMarkerAnimation
 *
 * Presentation only. Must never gate, delay, or be read by any safety-critical calculation.
 * Applies a simple exponential moving average to smooth out marker transitions on the map.
 *
 * @param {Array|null} rawPosition - [lat, lng]
 * @param {number} smoothingFactor - 0.0 (no movement) to 1.0 (instant snap)
 * @returns {Array|null} - The animated [lat, lng] for rendering
 */
export function useMarkerAnimation(rawPosition, smoothingFactor = 0.3) {
  const [smoothed, setSmoothed] = useState(rawPosition);
  const lastRawRef = useRef(rawPosition);

  useEffect(() => {
    if (!rawPosition) return;

    // Initial position or massive jump (e.g. simulated location teleport)
    if (
      !smoothed ||
      !lastRawRef.current ||
      calculateDistance(rawPosition, lastRawRef.current) > 500
    ) {
      setSmoothed(rawPosition);
      lastRawRef.current = rawPosition;
      return;
    }

    // Apply EMA
    const newLat =
      smoothed[0] +
      smoothingFactor * (rawPosition[0] - smoothed[0]);

    const newLng =
      smoothed[1] +
      smoothingFactor * (rawPosition[1] - smoothed[1]);

    setSmoothed([newLat, newLng]);
    lastRawRef.current = rawPosition;
  }, [rawPosition?.[0], rawPosition?.[1], smoothingFactor]);

  return smoothed;
}

// Simple equirectangular distance approximation (in meters) for fast jitter detection
function calculateDistance(pos1, pos2) {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (pos1[0] * Math.PI) / 180;
  const lat2 = (pos2[0] * Math.PI) / 180;
  const dLat = ((pos2[0] - pos1[0]) * Math.PI) / 180;
  const dLng = ((pos2[1] - pos1[1]) * Math.PI) / 180;

  const x = dLng * Math.cos((lat1 + lat2) / 2);
  const y = dLat;

  return Math.sqrt(x * x + y * y) * R;
}