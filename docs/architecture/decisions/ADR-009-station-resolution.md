# ADR-009: Cascading Station Resolution Architecture

## Context
Following the shift to the Topological Position Model (ADR-008), the system requires bounding Indian Railways station pairs to query live train data via RailRadar's topological `trainsBetween` endpoint. 
To preserve the non-negotiable rule of "never fabricate data," we investigated whether these bounding stations could be derived from public geographic topologies (OpenStreetMap, OpenRailwayMap, Indian Railways datasets).

## Phase 0 Evidence
The investigation indicated that while some major trunk lines are mapped as `route=railway` relations in OSM (complete with sequential stops and official IR codes), the dataset is fundamentally incomplete. Thousands of miles of branch lines and local tracks exist purely as isolated geographic geometries without topological station mappings.
Furthermore, the verified data provider (RailRadar) does not expose an accessible station database.

## Decision
Instead of halting development or concluding that station resolution is permanently impossible without a proprietary offline dataset, this document establishes a **Cascading Station Resolution Architecture**.

In the current implementation, the `StationResolutionEngine` acts as a pluggable gateway that iterates through a configured set of `ResolutionStrategy` implementations. 

### Resolution Order
1. **OSM Route Relations:** Queries Overpass for relations and traverses them for verified `ref` tags.
2. **OSM Relation Members:** Looks for generic members.
3. **RailRadar Route Geometry:** (Stubbed) Examines provider geometric overlays.
4. **Offline Railway Graph:** (Stubbed) Intended for a future compiled dataset.
5. **UNRESOLVED:** The terminal safety net.

## Architectural Specifications
- **No Heuristics:** Strategies must not infer or guess station codes based on proximity or name fuzzy matching. A verified code source (`ref`, `ref:IR`, or `provider`) is required.
- **Explicit Trails:** Instead of a generic failure boolean, every attempt yields a `ResolutionAttempt` detailing the execution duration and reason for failure, preserving a precise diagnostic audit log.
- **Provider-Agnostic Risk Engine:** The Risk Engine only consumes the final `StationReference` output. It is isolated from how the station was derived.

## Consequences
- **Implemented & Future Extension:** The current implementation iterates through configured `ResolutionStrategy` modules. The architecture enables future extensions, allowing proprietary databases to plug in as a new `ResolutionStrategy` without rewriting downstream logic.
- **Fallback Behavior:** For regions where OSM topology is incomplete, the implementation explicitly degrades to the `UNRESOLVED` state, resulting in a "Live train information unavailable" UI status. This is a specified safety fallback.
