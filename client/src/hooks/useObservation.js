/**
 * useObservation
 *
 * Manages observation state and the AbortController lifecycle.
 * Delegates all backend communication to ObservationService.
 *
 * Responsibilities:
 *  - React state (observationData, observationStatus)
 *  - AbortController lifecycle (abort-on-supersede, cleanup on unmount)
 *  - Refresh request counter
 *  - Calling ObservationService.fetchObservation()
 *
 * REFRESH CONTRACT:
 *  1. When lat/lng changes, the effect auto-fetches.
 *  2. When requestId increments (manual refresh or identical-coordinate re-apply),
 *     a fresh fetch is issued regardless of coordinate change.
 *
 * @param {number|null} lat
 * @param {number|null} lng
 * @param {ObservationService} observationService
 * @returns {{
 *   observationData: Object|null,
 *   observationStatus: string,
 *   requestObservationRefresh: Function
 * }}
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { ObservationService } from '../services/ObservationService';

const defaultService = new ObservationService();

export function useObservation(lat, lng, observationService = defaultService) {
  const [observationData, setObservationData] = useState(null);
  const [observationStatus, setObservationStatus] = useState('idle');
  const [requestId, setRequestId] = useState(0);
  const abortControllerRef = useRef(null);

  const requestObservationRefresh = useCallback(() => {
    setRequestId((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (lat === null || lng === null) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setObservationStatus('loading');

    observationService.fetchObservation(lat, lng, controller.signal)
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

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [lat, lng, requestId, observationService]);

  return { observationData, observationStatus, requestObservationRefresh };
}
