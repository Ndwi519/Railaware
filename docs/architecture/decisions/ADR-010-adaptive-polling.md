# ADR 010: Adaptive Observation Polling Strategy

## Context
The RailAware v1.0.0 observation pipeline currently fetches fresh data strictly when the client's GPS coordinates change. This architecture aligns with mobile OS battery-saving patterns and simplifies the frontend state. However, it introduces a critical failure mode: if a user stands completely still near a railway, the client will never fetch updated train locations. 

In a railway safety context, the environment is highly dynamic (trains move up to 300 km/h) even when the observer is stationary. Relying solely on coordinate changes violates Rule 2 (User Safety) and inadvertently creates a Safety-by-Omission scenario (Rule 10), where a stationary user is shown a "safe" state that quickly becomes dangerously stale. 

We require a polling strategy that maintains observation freshness for stationary users while balancing load on the Overpass API, RailRadar API, and the user's mobile data/battery.

## Decision (Proposed for Future Implementation)
We propose to implement an **Adaptive Polling** architecture (Option C from the Design Review) on the frontend client. If implemented, the polling interval would dynamically adjust based on the current state of the observation pipeline. This is NOT IMPLEMENTED in v1.0.0.

These values are PROPOSED engineering defaults. They REQUIRE VALIDATION against:
- measured RailRadar update cadence
- provider rate limits
- observed latency
- production telemetry
- battery usage

- **Unknown topology / Not on corridor**: No polling (rely on GPS updates). 
- **Corridor resolved, no trains nearby**: 30 seconds. 
- **Train detected nearby (Elevated Risk)**: 10 seconds. 
- **High-risk / Critical Emergency state**: 5 seconds.

## Interactions with Current Architecture
If implemented, adaptive polling would interact with our existing systems as follows:

- **Overpass Caching**: Overpass queries for railway topology are computationally expensive. The backend currently caches responses in-memory using the following TTLs:
  - Successful topology: 30 minutes
  - No corridor: 10 minutes
  - Transient failures: 45 seconds
- **Request Coalescing**: Currently, only Overpass requests are coalesced (via `OverpassClient.inFlightPromises`).
- **Transient Failure Cache**: Currently, if RailRadar drops a request due to rate limiting, the backend returns the last known state with an `observation.metadata.providerError` flag. If implemented, adaptive frontend polling would ensure the client recovers immediately once the provider is available again, rather than requiring the user to move.
- **RailRadar Provider Usage**: If implemented, adaptive polling would aggressively hit RailRadar only when a user is demonstrably near a track. This minimizes overall API spend while maximizing safety when it counts.

## Alternatives Considered
- **Option A (Position-driven only)**: Evaluated but is not the preferred direction for future evolution. Fails to warn stationary users of approaching trains.
- **Option B (Position-driven + Manual refresh)**: Evaluated but is not the preferred direction for future evolution. End-users in a crisis cannot be expected to repeatedly hammer a "Refresh" button.
- **Option D (WebSockets / SSE)**: Evaluated but is not the preferred direction for v1.0.0. Offers the best user experience but introduces significant backend complexity (connection management, scaling stateful servers). This will be evaluated for future releases.

## Trade-offs
- **Pros**: Directly solves the stationary user safety flaw; avoids Safety-by-Omission; optimizes battery and provider API calls by being aggressive only when necessary.
- **Cons**: Introduces `setInterval`/`setTimeout` complexity in the React lifecycle; increases baseline backend traffic for users who are near tracks but not moving.

## Future Consequences (If Implemented)
- If implemented, the frontend `LiveMapPage` would need to manage an internal polling loop alongside the `useSmoothedLocation` updates.
- If implemented, the `refreshObservation` contract would require that manual coordinate updates reset the polling timer to prevent race conditions.
- If implemented, the backend infrastructure would need to be sized to handle the increased frequency of requests from users loitering near railway corridors.

## Future Work (Potential Evolution)
- **Redis Persistence**: Long-term 24-hour caching of Overpass data in Redis may be introduced to further reduce load.
- **RailRadar Request Coalescing**: Request coalescing for the RailRadar provider may be introduced to prevent rate limiting when multiple users are observing the same train.
