# ADR-008: Transition from Geographic to Topological Position Model

## Context
RailAware originally envisioned a Geographic Position Model for tracking live trains (plotting precise `lat`/`lng` coordinates to calculate safety distances via Haversine). However, execution depends strictly on evidence from the primary data provider, RailRadar. 

## Evidence from Phase 0
Phase 0 endpoint probing proved:
- The provider does NOT return live train GPS coordinates.
- The provider does NOT return train heading.
- The provider DOES return fractional progress between stations (`segmentProgress`), `previousHalt`, `nextHalt`, and timestamps.
- Station-to-station routing and candidate train discovery work reliably.

## Historical Decision
The architecture pivoted the core location architecture from a Geographic Position Model to a Topological Position Model. 
Instead of relying on absolute GPS coordinates for trains, the architecture establishes:
1. Snapping the user's GPS position onto the nearest railway geometry to compute a `userSegmentFraction`.
2. Comparing this against the train's `segmentProgress` along the same topological edge.
3. Computing distance strictly as "distance along track" rather than point-to-point geographic distance.

## Alternatives Considered
- **Fabricating GPS coordinates**: We could artificially translate `segmentProgress` into a fake `lat`/`lng` coordinate and feed it back into the original geographic pipeline. This was rejected because it violates the core safety tenet: "Never communicate safety by omission or guess." Fabricating coordinates implies precision we do not possess.
- **Dropping RailRadar**: Considered looking for another provider. Rejected because RailRadar is the designated data source for Phase 0, and we must adapt to its verified capabilities.

## Trade-offs
- **Pros:** Respects the actual data schema, prevents presenting false precision to the user, and aligns with the provider's capabilities.
- **Cons:** Significantly increases the complexity of the Corridor Resolver (which must now project points onto polylines and identify topological bounding stations) and would require a dedicated interpolation engine for advanced positioning.

## Consequences

### Implemented Architecture
- The Corridor Resolver handles an `UNRESOLVED` state when it cannot match geographic geometry to topological station codes.
- The Observation Engine and Awareness Engine consume topological fields (`trainSegmentFraction`, `approaching`, `distanceAlongTrack`) instead of geographic `lat`/`lng`.
- The UI communicates "Estimated" positions to avoid implying GPS precision.

### Future Migration Work
- A future implementation would require a new `topological-position-engine` package to handle interpolation and track-distance calculations.

## Direction and ETA Priority Design Rules

To fully conform to this model, the following design rules are non-negotiable:

### 1. Topological Direction
Geographic compass bearings (e.g., "North-East", "145 degrees") are invalid for trains.
Direction must be expressed topologically in the UI (e.g., "Approaching from [Station]", "Moving toward [Station]", "Passed your location").

### 2. ETA and Speed Priority
ETA must follow strict evidence-backed precedence:
- **Priority 1:** Provider-reported `speedToNextStationKmph`.
- **Priority 2:** Computed speed from `ΔsegmentProgress / Δtime` multiplied by the known segment length.
- **Priority 3:** ETA unavailable. (If no previous observation exists or provider speed is absent, never fabricate speed. Return `eta = null` and expose the reason: "ETA unavailable").
