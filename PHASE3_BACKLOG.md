# Phase 3 Backlog & Known Limitations

## Implementation Limitations
1. **In-Memory Cache (Schedule & Topology)**: Both the `scheduleResponseCache` and `ScheduleCorridorCache` (which maps `corridorId` to stations) are purely in-memory. They do not survive server restarts, will be lost upon cache eviction, and are not shared across horizontally scaled backend instances.
2. **Topology Coupling**: The schedule feature depends on a preceding `/api/v1/awareness` request within the same node process to seed the `ScheduleCorridorCache`. If a client queries `/api/v1/schedule/corridor/:id` without a prior awareness resolution on that exact instance, or after the cache TTL expires, it gracefully falls back to the empty state.
3. **No Distributed State**: The current design lacks a Redis/Memcached layer, restricting it to single-node deployments for cache consistency.

## Future Refinements
1. **Overpass Endpoint Resilience**: Implement an Overpass endpoint failover/fallback list instead of relying on a single hardcoded URL in the configuration.
2. **Persistent Topology Bounding**: Replace `ScheduleCorridorCache`'s process-local runtime dependency with persistent or deterministically-regenerable corridor→station metadata.
3. **Configuration Consistency**: Centralize the two independently-defined 15-minute TTL constants (`ScheduleCorridorCache`'s `TTL_MS` and `server.js`'s `SCHEDULE_CACHE_TTL_MS`) into one shared config value so they can't drift apart over time.
4. **Formalize API Contract**: Document and formalize the schedule endpoint's response contract explicitly so all three outcomes (success, provider failure, corridor not found) consistently return the same top-level shape (`status`, `scheduledServices`, optional `reason`, optional `cacheInfo`).
5. **Cache Hydration Verification**: Confirm whether `ScheduleCorridorCache` ever populates with real bounding-station pairs against a genuinely two-station-bounded test location (unconfirmed against available fixtures as of this session).
6. Cache Invalidation Strategy: ScheduleCorridorCache currently assumes a corridor→station mapping stays valid for its TTL regardless of underlying OSM data changes, corridor assembly logic changes, or station-matching threshold changes. Not a concern at 15-minute in-memory TTL today, but becomes a real design question if persistent/distributed caching (Refinement #2) is implemented later.