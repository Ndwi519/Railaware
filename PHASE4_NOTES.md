# Phase 4 Notes: Confidence-Gated Recommendations

## Task 1: Inventory of Current Confidence Signals
An investigation of the current codebase reveals the following about existing confidence-relevant signals:

1. **`RailAwareConfidenceEngine.js` (`server/confidence-engine/`)**: 
   - **Current Implementation**: It evaluates a `currentObservation` and `observationHistory` to produce an `observationConfidence` categorical ordinal (`UNKNOWN`, `LOW`, `MEDIUM`, `HIGH`).
   - **Inputs/Logic**: It relies on heuristics labeled as `[Engineering decision]` or `[Evidence-backed]`, such as downgrading to `MEDIUM` if `ageMs > staleThresholdMs` (15 mins) or if `isActualPosition=false`. It downgrades to `LOW` if there are explicit validation errors or repeated HTTP gaps (>= 2). 
   - **Wiring**: It hardcodes `topologyConfidence: ConfidenceLevel.UNKNOWN` and `providerReliability: ConfidenceLevel.UNASSESSED`.

2. **Station-Resolution Confidence (`server/station-resolution-engine/`)**:
   - **Current Implementation**: The engine iterates through strategies, but currently, only `geometric-projection.js` is implemented (the rest like `offline-graph.js` and `osm-route-relations.js` are stubs returning `success: false`).
   - **Value**: `geometric-projection.js` hardcodes its return value to `confidence: ConfidenceLevel.LOW` because it relies on pure geometry without authoritative topology.

3. **Topology Resolution Status**:
   - A boolean-like state (`RESOLVED` / `UNRESOLVED`) from the station resolver.

4. **Schedule Data Staleness**:
   - `retrievedAt` exists in Phase 3 payloads, but it is a raw timestamp, not a confidence score.

**Summary of Task 1**: The only "real" confidence signals are an ordinal `observationConfidence` derived from heuristics, and a hardcoded `LOW` for `topologyConfidence`. `providerReliability` is entirely unassessed.

---

## Task 2: Assessment of Combining Signals
**Conclusion: DO NOT BUILD THIS.**

Combining these signals into a single "Confidence Score" (e.g., "65% confidence" or "Moderate Confidence") would be a textbook example of **false precision**. There is no principled, mathematically valid way to combine these categorical ordinals for the following reasons:

1. **Orthogonal Risks**: These signals measure fundamentally different types of uncertainty. 
   - `topologyConfidence` measures: *Did we map the user to the correct physical track?*
   - `observationConfidence` measures: *Is the data payload from the provider fresh and well-formed?*
   - `providerReliability` measures: *Is this provider historically accurate?*

2. **Dangerous Masking**: Averaging these orthogonal dimensions obscures the actual risk. If `topologyConfidence` is `LOW` (we might be on the wrong track), but `observationConfidence` is `HIGH` (the provider data is perfectly fresh), a combined "MEDIUM" confidence would mask the critical fact that we might be warning the user about a train on a *different track*. 
3. **Arbitrary Math**: Assigning numeric weights to "LOW" and "HIGH" to compute a weighted average is statistically invalid for ordinal categorical data without a ground-truth probability distribution to anchor them.

**Decision**: Do not implement a combined confidence score with the
signals available today. This is a rejection of one specific proposed
feature after investigation, not a judgment that confidence modeling is
inherently unworkable.

Preserve and continue surfacing the individual evidence dimensions
independently (schedule retrieval time, topology resolution method,
provider availability, station-resolution strategy used) — these remain
valuable as observable facts. Do not aggregate them into a composite
metric.

**Future possibility, not current recommendation**: If a future phase
accumulates real empirical data — station-resolution accuracy rates,
provider false-positive rates, corridor-matching precision — a
statistically calibrated combination method might become defensible. No
such data or model exists today, so this remains a documented possibility
for a future phase, not a plan.
