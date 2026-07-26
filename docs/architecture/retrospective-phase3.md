# Architectural Retrospective (Phase 3)

## 1. Which original architectural assumptions were validated?
- **Decoupled Architecture Resilience**: The core assumption that we could isolate provider idiosyncrasies behind `ObservationProvider` was completely validated. The live RailRadar payload differed significantly from our initial mock structures, but correcting this only required changes to the `RailRadarProviderInterpreter`. The downstream `TrainEstimator` and `AwarenessEngine` required zero structural changes to consume the real data.
- **Independent Confidence Dimensions**: The separation of `ObservationConfidence` and `ProviderReliability` proved necessary and correct. When inspecting live API responses, it became evident that telemetry latency (observation age) and overall provider uptime are unrelated variables that cannot be collapsed without destroying domain context.

## 2. Which assumptions proved incorrect?
- **GPS Telemetry Assumption**: We originally assumed that a premium provider like RailRadar would expose raw, continuous 2D GPS coordinates (latitude, longitude, bearing) for running trains. This proved incorrect. The provider exposes a 1D, railway-specific observation (`segmentProgress` between two `stationCodes`).
- **Singular Uncertainty Source**: We originally modelled uncertainty as purely a factor of the provider's measurement and reliability. We underestimated the impact of *our own* geometric projection. This led to the post-hoc elevation of `TopologyConfidence` to an equal architectural pillar, as the offline track map introduces as much uncertainty as the provider itself.

## 3. Which implementation decisions changed because of the live provider investigation?
- **The Confidence Model**: The `combine()` method in the Confidence Engine was permanently removed, forcing the orchestrator to pass the decoupled confidence pillars directly to the `AwarenessEngine` (and the UI).
- **Configuration Fail-Fast**: We discovered that missing API keys were failing silently into mock fallbacks, masking themselves as provider 401s. This prompted a hard refactor to enforce fail-fast configuration policies.

## 4. Would we design the provider abstraction differently today?
**No.** The existing abstraction proved highly resilient. Even though RailRadar supplied a fundamentally different coordinate space (1-dimensional railway events vs. 2-dimensional geographic telemetry), the `ProviderInterpreter` -> `TrainObservation` -> `EstimatedTrainState` chain absorbed the impedance mismatch entirely.
If we were designing it today, knowing that providers favor 1D segment fractions, we might make `segmentProgress` a more central first-class citizen in our documentation, but the data structures (specifically `EstimatedTrainState` owning the geographic coordinates while `TrainObservation` owns the logical network location) were already perfectly positioned to handle this reality.
