# Phase 2 Backlog (carried over from Phase 1 closure)

1. Implement `nearestCrossing` (currently deferred, documented placeholder
   in server/application/services/createSpatialAwarenessService.js).
2. Map visualization of nearby tracks (LiveMapPage.jsx currently text-only in
   sidebar).
3. Investigate and resolve the Vitest worker OOM so the full regression
   suite completes; currently untriaged (see Phase 1 sign-off notes).
4. Verify long-duration (30s+) continuous-movement behavior for the
   useAwareness throttle/coalesce logic — only a 5-step, ~1s-interval
   sequence has been tested so far.
5. Revisit the module-level `globalLastFetchTime` throttle and the
   suppressed useEffect dependency arrays in client/src/hooks/useAwareness.js and
   client/src/hooks/useMarkerAnimation.js if the app's usage pattern changes (multiple
   instances, HMR-sensitive workflows, or a swappable AwarenessService).
6. resolveAllClusters proximity-filter performance measurement at scale
   beyond the current test fixtures (noted as open in the project reference
   document, see server/corridor-resolver/resolver.js).
