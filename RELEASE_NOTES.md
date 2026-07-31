# RailAware Release Notes

## Version: v0.2.0-phase2
**Release Status:** Approved for Release

### Summary
Phase 2 builds upon the live application loop by integrating structural topology elements (crossings, stations) and completing the frontend map visualization, moving from a text-only debug interface to a fully interactive map view.

### Major Changes
- **Map Visualization**: Introduced `LiveMapPage.jsx` providing a full Leaflet-based map overlay of the user's location, proximity rings, railway corridors, and estimated train positions.
- **Topology Resolution**: The Overpass API integration now queries and resolves adjacent `railway=crossing` and `railway=level_crossing` nodes dynamically, exposing `nearestCrossing` and `nearestStation` proximity distances to the UI.
- **UI Service Adapter Layer**: Finalized `AwarenessService.js` to decouple the frontend from raw backend API shapes, implementing safe defaults and robust status mappings.
- **Robustness**: Hardened the location tracking hook (`useLocationTracking.js`) to elegantly degrade into a fullscreen permission error if geolocation is revoked mid-session, and implemented a clear fallback overlay when the network connection is lost.
- **Performance**: The backend graph topological clustering operations (`resolveAllClusters`) were measured and verified to execute in `~7.6ms` (excluding one-time network fetch).
- **Throttling Verification**: E2E `playwright` validation successfully proved the 2000ms trailing-edge throttle safely coalesces rapid mid-session coordinate changes.

---

## Version: v0.1.0-phase1
**Release Status:** Approved for Release

### Summary
Phase 1 established the end-to-end integration of the backend routing pipeline with the React frontend, proving out the core spatial awareness loop.

### Major Changes
- **Application Loop**: Wired the `createSpatialAwarenessService` across the boundary to feed React state hooks (`useAwareness.js`), driving a live update cycle.
- **Coordinate Smoothing**: Implemented `useMarkerAnimation` to provide smooth interpolation of GPS coordinates, mitigating jitter for moving users.
- **Corridor Assembly**: The internal `CorridorResolver` successfully traverses Overpass data to emit structured topological corridors (`AssembledCorridor`), resolving disparate ways into unified paths.
- **UI Scaffolding**: Built the initial `AwarenessSidebar.jsx` and `DeveloperDiagnosticsPanel` to expose system state, observation confidence, and topological gap reporting directly to the user.
- **Validation**: Introduced deterministic fixture-based testing (injecting cached NDLS data) to stabilize integration tests and prevent network flakes during CI.
