# ADR-012: Semantic Distinction for Trains API Contract (`trains: []` vs. Not Attempted)

## Status
Accepted

## Context
In a railway safety-critical application, distinguishing between **"we do not know if a train is nearby because the search could not be executed"** (data/infrastructure resolution failure) and **"we know no trains are nearby because we searched and found none"** (successful query with negative results) is a core safety boundary. 

Under the current implementation, when a user is adjacent to a railway corridor (`trackPresence = true`) but station resolution fails (`resolutionStatus = "UNRESOLVED"`), the train discovery strategy is skipped, and RailRadar is never queried. However, the API still returns `"trains": []`. This creates a contract ambiguity where a negative result and an unattempted search are represented identically, violating the semantic distinction between uncertainty and safety.

### Backend Execution Path Trace
When a request is made with `resolutionStatus = "UNRESOLVED"`:
1. `RailAwareService.evaluateLocation(lat, lng)` is called.
2. It invokes `TrainDiscoveryService.discoverTrain(lat, lng)`.
3. `TrainDiscoveryService` delegates to `TrainDiscoveryStrategyManager.discover(context)`.
4. In `TrainDiscoveryStrategyManager.js`, it loops through the registered strategies:
   - For `RailRadarStrategy`, it evaluates capabilities. Since `stationResolution.status !== "RESOLVED"`, the obtained evidence score is `0`, which is lower than `RailRadarStrategy.minimumEvidenceStrength`.
   - The strategy manager marks `RailRadarStrategy` as skipped (`skippedStrategies.push()`), emits a diagnostic `PREREQUISITE_UNAVAILABLE`, and `continue`s to the next loop iteration.
   - **Result**: `RailRadarStrategy.discover()` is never executed; thus, the **RailRadar API provider is never invoked**.
   - As no strategies succeed, `discoverySuccess` remains `false`, and `executionState.finalResult` is returned as `null`.
5. Back in `TrainDiscoveryService.js`, the service assembles the final result object:
   - `discoveredTrains` is assigned via: `executionState.finalResult?.discoveredTrains || []`.
   - **Source of `[]`**: Because `finalResult` is `null`, it falls back to the default empty array `[]`.
6. Back in `RailAwareService.js`, since `trainTarget` is `null` (no train found), it creates a fallback observation and calls `LegacyApiMapper.js` to structure the JSON response.
7. `LegacyApiMapper.js` assigns `trains: discoveryContext.discoveredTrains` (which is `[]`) and `observation.nearbyTrains: discoveryContext.discoveredTrains` (which is `[]`).

---

## Decision
**Option B: Current behavior is a contract ambiguity and should be revised.**

The API contract must explicitly distinguish between:
1. **Train discovery not attempted or failed**: represented by returning `"trains": null` (or omitting the field) and populating `providerError` if failed.
2. **Train discovery attempted with zero trains found**: represented by returning `"trains": []` when strategies were successfully executed but found no trains.
3. **Train discovery attempted with active trains**: represented by returning `"trains": [{"id": "..."}]`.

---

## Alternatives Considered
### Option A: Retain As-Is (`trains: []` for both states)
- **Rationale**: Returning an empty array `[]` is a safe default in JavaScript that prevents naive client code from crashing (e.g. attempting `.length` or `.map()` on `null`).
- **Rejection Reason**: Directly violates **Non-Negotiable Rule 10 (Never communicate safety by omission)**. If the API returns `trains: []` when it did not run a search, a client developer might inspect `response.trains.length === 0` and display "No trains nearby / safe to cross", converting a system failure ("We don't know") into a false statement of safety. 

---

## Trade-offs
- **Client Complexity**: Forcing `trains` to be `null` when not attempted requires client developers to write defensive code (e.g., using optional chaining `trains?.length` or defaults `trains || []`). 
- **Safety**: This overhead is a positive trade-off because it prevents developers from accidentally treating an unattempted search as a safe, empty result, aligning with the priority hierarchy: (1) Correctness, (2) User safety, (3) Explicit handling of uncertainty.

---

## Consequences
1. The backend mapper (`LegacyApiMapper.js`) and `TrainDiscoveryService.js` must be updated to return `discoveredTrains: null` when discovery was not attempted (executed strategies length is 0) or failed (provider errors are present).
2. The frontend code (e.g., `AwarenessSidebar.jsx` and `LiveMap.jsx`) must be updated to handle a `null` value for `trains` gracefully without throwing TypeErrors (utilizing optional chaining `trains?.length`), and displaying "Currently Unavailable" or "Train discovery not performed" appropriately.
