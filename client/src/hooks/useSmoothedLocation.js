import { useState, useEffect, useRef } from 'react';

/**
 * Applies an Exponential Moving Average (EMA) to smooth GPS jitter
 * @param {Array<number>} rawPosition - [lat, lng]
 * @param {number} smoothingFactor - 0.0 (no update) to 1.0 (no smoothing)
 * @returns {Array<number>} Smoothed [lat, lng]
 */
export function useSmoothedLocation(rawPosition, smoothingFactor = 0.3) {
  const [smoothed, setSmoothed] = useState(rawPosition);
  const lastRawRef = useRef(rawPosition);

  useEffect(() => {
    if (!rawPosition) return;
    
    // Initial position or massive jump (e.g. simulated location teleport)
    if (!smoothed || !lastRawRef.current || calculateDistance(rawPosition, lastRawRef.current) > 500) {
      console.log("[useSmoothedLocation Snap]", rawPosition[0], rawPosition[1]);
      setSmoothed(rawPosition);
      lastRawRef.current = rawPosition;
      return;
    }

    // Apply EMA
    const newLat = smoothed[0] + smoothingFactor * (rawPosition[0] - smoothed[0]);
    const newLng = smoothed[1] + smoothingFactor * (rawPosition[1] - smoothed[1]);
    
    setSmoothed([newLat, newLng]);
    lastRawRef.current = rawPosition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPosition]); // Intentionally omitting smoothed and smoothingFactor to prevent feedback loops

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
