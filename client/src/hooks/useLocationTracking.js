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
      setRawPosition(simulatedPosition);
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
          setRawPosition([pos.coords.latitude, pos.coords.longitude]);
        }
        setPermissionStatus('granted');
      },
      (_err) => {
        setPermissionStatus((prev) => prev === 'prompting' ? 'denied' : prev);
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
