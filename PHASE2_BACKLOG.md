# Phase 2 Backlog (carried over from Phase 1 closure)

1. [DONE] Implement `nearestCrossing` (currently deferred, documented placeholder
   in server/application/services/createSpatialAwarenessService.js).
2. [DONE] Map visualization of nearby tracks (LiveMapPage.jsx currently text-only in
   sidebar).
3. [PARTIALLY RESOLVED] Vitest worker OOM — suspected to be related to jsdom/Vitest worker memory behavior; root cause has not been conclusively isolated (isolated suites pass; full-suite run still OOMs; specific leaking file/mechanism not yet bisected); individual/isolated test suites run
   cleanly, but a full combined suite run still triggers worker OOM.
   Functional correctness is verified via isolated runs. Full-suite
   stability remains open.
4. [DONE] Verify long-duration (30s+) continuous-movement behavior for the
   useAwareness throttle/coalesce logic — only a 5-step, ~1s-interval
   sequence has been tested so far.
5. [DONE] Revisit the module-level `globalLastFetchTime` throttle and the
   suppressed useEffect dependency arrays in client/src/hooks/useAwareness.js and
   client/src/hooks/useMarkerAnimation.js if the app's usage pattern changes (multiple
   instances, HMR-sensitive workflows, or a swappable AwarenessService).
6. [DONE] resolveAllClusters proximity-filter performance measurement at scale
   beyond the current test fixtures (noted as open in the project reference
   document, see server/corridor-resolver/resolver.js).
7. [FLAGGED — NOT A BLOCKER] Overpass cold-start latency (2-10+s observed,
   variable) recurs each time a user crosses into a new ~500m grid cell,
   not just once per session. For a moving user, this could mean repeated
   multi-second delays during active use, not a one-time cost. Consider for
   Phase 3: pre-fetching the adjacent grid cell in the direction of travel,
   or a larger/overlapping cache grid.