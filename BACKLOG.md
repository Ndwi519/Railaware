# RailAware Backlog & Limitations

This document captures the known design limitations accepted in v1.0.0 and areas for future architectural refinement. 

## Known Limitations (By Design)

1. **Vitest Worker OOM (Test Environment)**: The full client test suite occasionally triggers Out-of-Memory (OOM) errors in the Vitest worker. This has been definitively isolated to Leaflet/JSDOM memory accumulation across multiple complex mapping tests (e.g., `LiveMapPage.test.jsx`). This is accepted as a test-environment limitation and not a production issue. Tests can be run successfully in isolation (`npx vitest run <file>`).
2. **In-Memory Caching**: Both `scheduleResponseCache` and `ScheduleCorridorCache` are purely in-memory. They do not survive server restarts and are not shared across instances. The system is currently restricted to single-node deployments.
3. **Topology Coupling**: The schedule feature depends on a preceding `/api/v1/awareness` request within the same node process to seed the `ScheduleCorridorCache`. If the cache expires or a client hits the schedule endpoint directly without a prior awareness resolution, it falls back gracefully to an empty state.
4. **Overpass Cold-Start Latency**: Initial latency (2-10+s) recurs when crossing into a new ~500m grid cell. For a moving user, this means repeated delays during active travel rather than a one-time cost.

## Future Work (Requires New Evidence or Engineering)

1. **Persistent Topology Bounding**: Replace `ScheduleCorridorCache`'s process-local runtime dependency with persistent or deterministically regenerable corridor→station metadata.
2. **Overpass Endpoint Resilience**: Implement an Overpass endpoint failover/fallback list instead of relying on a single hardcoded URL.
3. **Pre-fetching / Larger Cache Grid**: To solve the cold-start latency limitation, consider pre-fetching the adjacent grid cell in the direction of travel, or adopting a larger overlapping cache grid.
4. **Configuration Consistency**: Centralize the independently-defined 15-minute TTL constants (`ScheduleCorridorCache`'s `TTL_MS` and `server.js`'s `SCHEDULE_CACHE_TTL_MS`) into one shared config value.
5. **Formalize API Contract**: Formalize the schedule endpoint's response contract explicitly so all outcomes (success, provider failure, corridor not found) consistently return the same top-level shape.
6. **Cache Hydration Verification**: Confirm whether `ScheduleCorridorCache` ever populates with real bounding-station pairs against a genuinely two-station-bounded test location.
7. **Cache Invalidation Strategy**: Revisit cache invalidation if transitioning to persistent/distributed caching in the future.
