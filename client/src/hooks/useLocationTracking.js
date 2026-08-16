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
 * @returns {{ rawPosition: Array|null, permissionStatus: string, geoError: object|null, requestPermission: function }}
 */
import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [geoError, setGeoError] = useState(null);
  const watchIdRef = useRef(null);
  const hasCalledInitialPosition = useRef(false);

  // 1. Initial Permission Check
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          setPermissionStatus(result.state);
          result.onchange = () => {
            setPermissionStatus(result.state);
          };
        })
        .catch(() => {
          // Fallback if query fails
          setPermissionStatus('prompt');
        });
    } else {
      // Permissions API unavailable, fallback to prompt
      setPermissionStatus('prompt');
    }
  }, []);

  // 2. Explicit User Action to Request Permission
  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoError(null);
        hasCalledInitialPosition.current = true;
        setPermissionStatus('granted');
        setRawPosition((prevPos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          if (prevPos && calculateDistance(prevPos, newPos) < 0.5) return prevPos;
          return newPos;
        });
      },
      (err) => {
        setGeoError({ code: err.code, message: err.message });
        if (err.code === 1) { // PERMISSION_DENIED
          setPermissionStatus('denied');
        }
        // If code === 2 or 3 (POSITION_UNAVAILABLE, TIMEOUT)
        // do not set to denied, keep existing permission status
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }, []);

  // 3. Continuous Tracking (Real GPS)
  useEffect(() => {
    if (isSimulating) return;

    if (permissionStatus === 'granted') {
      if (!hasCalledInitialPosition.current) {
        hasCalledInitialPosition.current = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeoError(null);
            setRawPosition((prevPos) => {
              const newPos = [pos.coords.latitude, pos.coords.longitude];
              if (prevPos && calculateDistance(prevPos, newPos) < 0.5) return prevPos;
              return newPos;
            });
          },
          () => {}, // Let watchPosition handle errors
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGeoError(null);
          setRawPosition((prevPos) => {
            const newPos = [pos.coords.latitude, pos.coords.longitude];
            if (prevPos && calculateDistance(prevPos, newPos) < 0.5) return prevPos;
            return newPos;
          });
        },
        (err) => {
          setGeoError({ code: err.code, message: err.message });
          if (err.code === 1) { // PERMISSION_DENIED
            setPermissionStatus('denied');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    }
  }, [permissionStatus, isSimulating]);

  // 4. Simulation Tracking
  useEffect(() => {
    if (isSimulating && simulatedPosition) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setRawPosition((prevPos) => {
        const newPos = simulatedPosition;
        if (prevPos && calculateDistance(prevPos, newPos) < 0.5) return prevPos;
        return newPos;
      });
      // Do not override user's real permission state permanently just for simulation,
      // but conceptually simulation acts as 'granted' for the map.
      setPermissionStatus('granted');
    }
  }, [isSimulating, simulatedPosition]);

  return { rawPosition, permissionStatus, geoError, requestPermission };
}
