/**
 * useLocationTracking
 *
 * Encapsulates the Geolocation API watchPosition lifecycle.
 * Yields the raw GPS position and a permission status.
 *
 * When simulation is active the hook halts real GPS tracking and
 * surfaces the simulatedPosition directly as the raw position.
 *
 * @param {boolean} isSimulating
 * @param {Array|null} simulatedPosition - [lat, lng] | null
 * @returns {{ rawPosition: Array|null, permissionStatus: string }}
 */
import { useState, useEffect, useRef } from 'react';

function calculateDistance(pos1, pos2) {
  if (!pos1 || !pos2) return Infinity;
  const [lat1, lon1] = pos1;
  const [lat2, lon2] = pos2;
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useLocationTracking(isSimulating, simulatedPosition) {
  const [rawPosition, setRawPosition] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompting');
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (isSimulating && simulatedPosition) {
      console.log("[Simulated GPS Override]", simulatedPosition[0], simulatedPosition[1]);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setRawPosition((prevPos) => {
        const newPos = simulatedPosition;
        if (prevPos && calculateDistance(prevPos, newPos) < 0.5) return prevPos;
        return newPos;
      });
      setPermissionStatus('granted');
      return;
    }

    if (!navigator.geolocation) {
      setPermissionStatus('denied');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isSimulating) {
          console.log("[GPS]", pos.coords.latitude, pos.coords.longitude);
          setRawPosition((prevPos) => {
            const newPos = [pos.coords.latitude, pos.coords.longitude];
            if (prevPos && calculateDistance(prevPos, newPos) < 0.5) return prevPos;
            return newPos;
          });
        }
        setPermissionStatus('granted');
      },
      (err) => {
        if (err.code === 1) { // 1 === PERMISSION_DENIED
          setPermissionStatus('denied');
        }
        // codes 2 (POSITION_UNAVAILABLE) and 3 (TIMEOUT) are transient;
        // leave permissionStatus and rawPosition as-is and let watchPosition retry.
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isSimulating, simulatedPosition]);

  return { rawPosition, permissionStatus };
}
