# RailAware Release Notes (v1.0.0)

## Overview
RailAware v1.0.0 is an implementation of the situational awareness platform architecture. This release transitions the project from the Phase 0 exploratory architecture to a decoupled system implemented in JavaScript.

## Implemented Behavior
*   **Domain Engines:** The backend evaluates geography, uncertainty, and physical safety risks via separate engines (`RailAwareConfidenceEngine`, `RailAwareRiskEngine`, `RailAwareRecommendationEngine`).
*   **Hardware Simulation UI:** The Developer Diagnostics panel exposes developer-controlled GPS simulation.

## Verified Behavior
*   **Safety Over Uncertainty:** Verified by automated tests that the implementation returns `UNKNOWN` or `ELEVATED` when provider or topology information is unavailable, avoiding a false assertion of `SAFE`.

## Known Limitations
*   **Jest ESM Configuration Workaround:** `server/risk-engine/package.json` contains a localized `"type": "commonjs"` configuration because the legacy Jest execution engine fails to parse ES Modules for the domain tests without Babel configuration overhauls. 
*   **Ground Truth Constraints:** Without an active commercial API key for `RailRadar`, physical field verification relies heavily on localized geographic bounding rules (ocean vs track) rather than live tracking metrics.
*   **In-Memory Bounding:** The `StationResolutionEngine` calculates vector distances in memory. Very long corridors slightly increase server payload execution time.

## Unverified Areas
*   **Performance:** Memory usage has not yet been benchmarked under a reproducible workload.
*   **Live Train Ground Truth Tracking:** Live physical tracking is unverified due to provider sandbox constraints. Simulated testing has been executed.

## Future Work
*   **Redis Implementation:** Future implementation would migrate the `InMemoryObservationStore` to a distributed Redis cache to allow horizontally scalable Node deployments.
*   **WebGL Bound Querying:** Future implementation would shift geographic bounds resolution from pure Overpass bounding boxes to local Mapbox vector tiles to drastically reduce the geographic discovery penalty.
*   **Jest Overhaul:** Future implementation would port the testing framework to `Vitest` uniformly across both backend and frontend to resolve all ESM friction natively.
