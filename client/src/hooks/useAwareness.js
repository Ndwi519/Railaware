/**
 * useAwareness
 *
 * Manages observation state and the AbortController lifecycle.
 * Delegates all backend communication to AwarenessService.
 *
 * Responsibilities:
 *  - React state (observationData, observationStatus)
 *  - AbortController lifecycle (abort-on-supersede, cleanup on unmount)
 *  - Refresh request counter
 *  - Calling AwarenessService.fetchAwareness()
 *
 * REFRESH CONTRACT:
 *  1. When lat/lng changes, the effect auto-fetches.
 *  2. When requestId increments (manual refresh or identical-coordinate re-apply),
 *     a fresh fetch is issued regardless of coordinate change.
 *
 * @param {number|null} lat
 * @param {number|null} lng
 * @param {AwarenessService} AwarenessService
 * @returns {{
 *   observationData: Object|null,
 *   observationStatus: string,
 *   requestObservationRefresh: Function
 * }}
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { AwarenessService } from '../services/AwarenessService';

const defaultService = new AwarenessService();
// ACCEPTED TECHNICAL DEBT (Phase 1):
// globalLastFetchTime is module-level global mutable state.
// This could behave unexpectedly under HMR (Hot Module Replacement),
// if multiple concurrent map instances were mounted, or in SSR contexts.
// This tradeoff is accepted for Phase 1 as the application is a single-page,
// single-instance client application.
let globalLastFetchTime = 0;

export function __resetGlobalThrottleForTest() {
  globalLastFetchTime = 0;
} // Module-level throttle to protect against unmount/remount loops

export function useAwareness(lat, lng, AwarenessService = defaultService) {
  const [observationData, setObservationData] = useState(null);
  const [observationStatus, setObservationStatus] = useState('idle');
  const [requestId, setRequestId] = useState(0);
  const abortControllerRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  const requestObservationRefresh = useCallback(() => {
    setRequestId((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (lat == null || lng == null) return;

    let localTimeoutId = null;

    const executeFetch = () => {
      globalLastFetchTime = Date.now();
      lastFetchTimeRef.current = globalLastFetchTime;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setObservationStatus('loading');

      AwarenessService.fetchAwareness(lat, lng, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setObservationData(data);
            setObservationStatus('success');
          }
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            setObservationStatus('cancelled');
          } else if (!controller.signal.aborted) {
            setObservationStatus('error');
          }
        })
        .finally(() => {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        });
    };

    const attemptFetch = () => {
      const now = Date.now();
      const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

      if (now - globalLastFetchTime < 2000 && !isTest) {

        if (localTimeoutId) clearTimeout(localTimeoutId);

        // Trailing-edge debounce / Queue-and-coalesce:
        // Schedule a follow-up fetch exactly when the throttle window clears.
        // Because this timeout captures the current lat/lng via closure,
        // the backend will eventually receive the *most recent* position.
        localTimeoutId = setTimeout(() => {
          attemptFetch();
        }, 2000 - (now - globalLastFetchTime));
        return;
      }

      executeFetch();
    };

    attemptFetch();

    return () => {
      if (localTimeoutId) clearTimeout(localTimeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // ACCEPTED TECHNICAL DEBT (Phase 1):
  // We explicitly remove `AwarenessService` from the dependency array.
  // If a caller passes a different service instance at runtime, the hook will NOT react
  // to that change. This is intentional for Phase 1 where the service is a fixed singleton,
  // preventing unnecessary re-renders or fetch storms if the object identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, requestId]);

  return { observationData, observationStatus, requestObservationRefresh };
}
