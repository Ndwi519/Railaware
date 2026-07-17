# Field Testing Report

## Provider Behaviour Validation

This section documents the empirical validation of the RailRadar provider under real-world execution.

### Architectural Correctness vs Empirical Reality
- **Verified Architecturally:** The application code is topologically correct and conforms to ADR-008. There is zero legacy geographic calculation present.
- **Verified Empirically:** The provider's ability to supply monotonic, stable topological data (`segmentProgress`) across station segments over time.

### Final Empirical Verdict: FAIL
The empirical validation of `segmentProgress` stability (Assumption A8) failed significantly. While the application is architecturally sound, the provider exhibits severe regressions in `segmentProgress`. 

For example, a moving train's progress repeatedly jumped backward (e.g., from 1.0 back to 0.46, and 1.0 to 0.16) beyond any acceptable 1% tolerance margin. The data is heavily non-monotonic and actively violates the core requirement of the Topological Position Engine.

### Specific Assumptions
- **A1 (Topological Fields):** PARTIAL - Moving train payload successfully yielded valid segmentProgress, but stationary payload responses failed schema inspection.
- **A2 (Candidate Discovery):** PASS - Successfully identified candidate payloads at all 3 test locations with adequate request budgeting limits.
- **A3 (Topological Cadence):** PASS - The train provided > 2 topological updates within the 25-minute test bounds.
- **A4 (Rate limits):** PASS - The long polling completed without exhausting API quotas.
- **A8 (Topological Stability):** FAIL - `segmentProgress` is erratic and frequently regresses backwards across multiple polls, actively breaking the monotonic interpolation rule.

### Outstanding Unknowns
- It is still unknown whether these massive regressions are inherent to all RailRadar updates, or specific anomalies for train 19665 during this specific 25-minute window.
- The schema for stationary trains requires further provider consultation, as it lacked identifiable topological values during this polling cycle.
