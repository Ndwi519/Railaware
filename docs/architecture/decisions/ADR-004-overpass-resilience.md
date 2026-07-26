# ADR-004: Overpass API Resilience and Request Coalescing

## Context
The primary topological discovery endpoint (Overpass API) is subject to strict public rate limits and latency spikes. A single user standing still might generate multiple GPS update events rapidly, triggering duplicated, overlapping queries that consume server connections and result in HTTP 429 / 504 errors.

## Decision
We implemented a strict, multi-tiered resilience pipeline in the `OverpassClient`:
1. **Grid-Snapped Caching:** Coordinates are rounded to ~500m (0.005°) increments so that minor GPS jitter shares identical cache keys.
2. **In-Flight Request Coalescing:** Identical concurrent requests do not spawn new fetch calls; they join a shared `Promise` queue (`inFlightPromises`).
3. **Transient Failure Cache:** Thundering herds during outages are mitigated by caching pure network failures (timeouts, 50x) for 45 seconds, instantly returning `CACHE FAILURE HIT` to subsequent callers.
4. **Exponential Backoff:** Configurable retry arrays (`[0, 500, 1000, 2000]`) execute specifically on network-level disruptions before yielding a failure.

## Alternatives Considered
- **Redis Queueing:** Utilizing BullMQ or Redis for queueing requests. Rejected because the system requires synchronous, real-time responses to observation POSTs.
- **Client-Side Debouncing Only:** Relying entirely on React `useEffect` aborts. Rejected because multiple physical users in the same train carriage would still DDOS the backend.

## Trade-offs
- **Pros:** Vastly reduces the load on Overpass API and protects our backend from starvation.
- **Cons:** The cache is currently strictly in-memory per Node instance. In a multi-node deployment, identical requests hitting different load-balanced pods will bypass the coalescing layer.

## Consequences
- The system gracefully handles Overpass congestion, converting it safely to `UNRESOLVED` awareness states without hanging Node event loops.
