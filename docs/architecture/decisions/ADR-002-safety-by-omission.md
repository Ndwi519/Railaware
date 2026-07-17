# ADR-002: Safety By Omission (Strict Determinism)

## Context
RailAware processes incomplete data from external providers (Overpass, RailRadar). When geographical infrastructure is absent or when a third-party API fails, the system must decide whether to assume the area is safe (no trains found) or unknown. 

## Decision
This architectural doctrine establishes a "Safety by Omission" rule across the entire stack. A lack of evidence of danger is NEVER interpreted as evidence of safety.

## Alternatives Considered
- **Heuristics & Interpolation:** Guessing train positions based on schedules when live data is unavailable.
- **Fail-Open Fallbacks:** Defaulting to "Clear" when APIs time out to improve User Experience.

## Trade-offs
- **Pros:** Provides a structural guardrail so users are never explicitly told a track is safe when the system actually lacks visibility.
- **Cons:** Significantly increases the frequency of `UNRESOLVED` states during network latency, which may frustrate users expecting binary clear/danger signals.

## Consequences
- Confirmed by implementation that the Risk Engine evaluates all network timeouts, parse errors, and missing infrastructure mapping directly to the `UNRESOLVED` Topological Gap state.
- UI elements mandate explicit color/text pairs to display "Unknown" distinct from "Safe".
