# Phase 3 Pipeline Verification

This document traces the path of a live observation through the Provider-Independent Pipeline, proving architectural correctness and adherence to ADR 0001 and ADR 0002.

## 1. Provider Boundary (RailRadarProviderInterpreter)
The raw JSON payload from RailRadar is received by the `RailRadarProviderInterpreter`.
No business logic occurs here. The interpreter merely validates the payload schema, extracts fields like `actualArrival`, `delayArrival`, and `speedToNextStationKmph`, and maps them to the canonical domain contract.

## 2. Canonical Domain Contract (TrainObservation)
The interpreter produces a `TrainObservation` object.
- The train identity is mapped to the `Train` model.
- The `isActualPosition` flag is inferred (if available) or omitted.
- The state is mapped to `TrainStatus` (e.g. `RUNNING`, `CANCELLED`).
From this point forward, the system knows nothing about "RailRadar" or its idiosyncrasies.

## 3. Train Estimator
The `TrainObservation` is passed to the `TrainEstimator`.
The estimator applies generic physics (ETA calculations based on `segmentProgress`, `speedToNextStationKmph`, and `distance`) and geometric projection to normalize the train's location into an `EstimatedTrainState`.

## 4. Confidence Engine
The `RailAwareConfidenceEngine` receives the `TrainObservation` (and history) to produce decoupled confidence metrics:
- `observationConfidence`: The fidelity and completeness of the observation data.
- `providerReliability`: Set to `UNASSESSED` (pending Phase 4).
- `topologyConfidence`: Populated by the orchestrator based on the track/corridor geometry resolution.

## 5. Awareness Engine (RailAwareAwarenessEngine)
The engine accepts the `EstimatedTrainState`, the `ConfidenceAssessment`, and the `Journey` context.
It outputs an `AwarenessContext`. It enforces safety-critical invariant checks:
- It requires both `observationConfidence` and `providerReliability` to be explicitly declared as non-empty strings.
- It applies the decision matrix (e.g., if topology is `HIGH` and no trains are found, it outputs `NO_TRAINS_FOUND` with the explanation that absence of evidence does not imply an all-clear state, as per ADR-002).

## Conclusion
The live payload successfully traverses:
`ObservationProvider` -> `TrainObservation` -> `TrainEstimator` -> `EstimatedTrainState` -> `RailAwareAwarenessEngine` -> `AwarenessContext`.

No generic logic leaks into the provider, and no provider specifics leak into the application logic, strictly fulfilling Phase 3 requirements.
