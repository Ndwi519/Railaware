# RailAware Project Handover

## 1. ADR Index

The RailAware architecture is governed by seven foundational Architecture Decision Records (ADRs). These decisions are frozen and authoritative.

- **ADR 0001: The Pipeline Pattern**
  - **Problem:** Data processing logic was deeply entangled across controllers, services, and models, making testing and predictability impossible.
  - **Decision:** Implement a strictly unidirectional pipeline.
  - **Rationale:** Separates acquisition from estimation and awareness, ensuring determinism.
  - **Impact:** Forced the creation of isolated engines (`TrainEstimator`, `ConfidenceEngine`, `AwarenessEngine`).
  - **Key Files:** `server/application/services/RailAwareService.js`

- **ADR 0002: Provider Independence**
  - **Problem:** Core logic depended on provider-specific fields (e.g., RailRadar keys).
  - **Decision:** Providers must map external data to standard domain models (`TrainObservation`) before it enters the pipeline.
  - **Rationale:** Swapping or adding a provider should never require refactoring core business logic.
  - **Impact:** Introduced the `ObservationProvider` contract.
  - **Key Files:** `server/provider/railradar.js`, `server/domain/contracts/ProviderInterpreter.js`

- **ADR 0003: Confidence Model**
  - **Problem:** A single numeric `confidenceScore` conflated data staleness, provider downtime, and topology errors, leading to dangerous assumptions.
  - **Decision:** Split confidence into three orthogonal pillars: `ObservationConfidence`, `TopologyConfidence`, and `ProviderReliability`.
  - **Rationale:** Prevents collapsing distinct failure modes into one ambiguous score.
  - **Impact:** Eliminated `overallConfidence` completely.
  - **Key Files:** `server/confidence-engine/RailAwareConfidenceEngine.js`

- **ADR 0004: Presentation Layer Consumes Awareness Context**
  - **Problem:** The frontend UI contained duplicated logic to determine if a train was dangerous based on distances and confidence levels.
  - **Decision:** The backend emits an `AwarenessContext` with a boolean `requiresProminentDisplay`. The frontend strictly obeys this flag.
  - **Rationale:** Concentrates all safety logic in the backend, removing cognitive load from the client.
  - **Impact:** Frontend UI components became purely structural.
  - **Key Files:** `server/awareness-engine/RailAwareAwarenessEngine.js`, `client/src/components/EmergencyMode.jsx`

- **ADR 0005: Explicit Null Safety & Zero-Train Ambiguity**
  - **Problem:** A missing array of trains could mean "Network Error" or "Verified Zero Trains".
  - **Decision:** Never communicate safety by omission. A failed discovery yields `null` (Unknown). A successful discovery with no trains yields `[]` (Verified Safe).
  - **Rationale:** Ensures the system fails into a state of visible uncertainty rather than false safety.
  - **Impact:** Heavily constrained the `TrainDiscoveryService` responses.
  - **Key Files:** `server/application/services/TrainDiscoveryService.js`

- **ADR 0006: Estimation Ownership**
  - **Problem:** Distance calculations were bleeding into the Provider and Awareness modules.
  - **Decision:** The `TrainEstimator` owns all distance math.
  - **Rationale:** Ensures single-responsibility for geographic and topological math.
  - **Impact:** `AwarenessEngine` became a pure rules engine, completely agnostic of how distances are calculated.
  - **Key Files:** `server/awareness-engine/TrainEstimator.js`

- **ADR 0007: Evaluation Framework & Metrics**
  - **Problem:** Production performance metrics were conflated with engineering accuracy KPIs, and evaluation required mutating production code.
  - **Decision:** Build a fully decoupled Evaluation Platform using a strict metric taxonomy (`ObservationAge`, `PositionError`, `MissedAwarenessEvent`).
  - **Rationale:** Enables objective performance measurement without corrupting the live system.
  - **Impact:** Created the `evaluation-framework` directory.
  - **Key Files:** `server/evaluation-framework/metrics/MetricsEngine.js`, `server/evaluation-framework/simulation/SimulationRunner.js`

---

## 2. Repository Guide

RailAware is split into distinct domains to enforce architectural boundaries.

- `server/`
  - `application/`: Orchestrates the pipeline. Contains `RailAwareService` which ties all engines together.
  - `awareness-engine/`: Houses `TrainEstimator` (physical distance) and `AwarenessEngine` (subjective safety state determination).
  - `confidence-engine/`: Evaluates data staleness, schema validation, and topology integrity.
  - `assistance-engine/`: Responsible for generating emergency guidance instructions based on awareness states.
  - `provider/`: External integration logic. Responsible exclusively for fetching and molding 3rd-party data into the `TrainObservation` domain model.
  - `domain/`: Pure data models (`Train`, `TrainObservation`, `AwarenessContext`) and contracts (`ObservationProvider`).
  - `evaluation-framework/`: The decoupled evaluation harness. Drives isolated instances of the production engines using mock data for deterministic metrics generation.
  - `calculations/`: Pure mathematical utility functions (e.g., Haversine distance, segment interpolation).

- `client/`
  - The React frontend. It acts as a passive consumer of the `AwarenessContext`. It contains zero geographic distance mathematics and zero threshold logic.

- `docs/`
  - Architecture documentation, including the authoritative `adr/` directory.

---

## 3. Version 1.0 Retrospective

### Major Architectural Decisions
The most defining architectural decision was the aggressive decoupling of **estimation** (objective distance) from **awareness** (subjective safety). By forcing these into separate engines (`TrainEstimator` vs `AwarenessEngine`), the system became highly testable and logically sound.

### Key Risks Encountered
1. **Provider Data Fidelity:** RailRadar does not provide raw GPS telemetry; it provides a 1-Dimensional topology containing `previousHalt` and `nextHalt`.
   - **Resolution:** The architecture was adapted to trust this topological model via `TrainEstimator`, projecting fractional `segmentProgress` along known geographic corridors rather than attempting to force GPS triangulation.
2. **False Safety from Omission:** The system initially risked defaulting to a "safe" state when external APIs timed out or failed.
   - **Resolution:** ADR 0005 strictly mandated explicit `null` propagation, ensuring that API failures cascade into a highly visible "UNKNOWN" safety state, protecting the user from false confidence.

### Lessons Learned
- **Architecture Precedes UI:** Deferring UI implementation until the core data pipeline was mathematically sound prevented massive rework. The UI became trivially simple to build once the `AwarenessContext` was fully established.
- **Isolate Evaluation Early:** Building a decoupled evaluation framework (ADR 0007) exposed the need for perfect determinism inside the production engines.

### Recommendations for Future Development
- Avoid the temptation to put "smart" logic in the frontend. Maintain the paradigm where the backend dictates `requiresProminentDisplay`.
- Validate any new external providers via rigorous Phase 0 empirical capturing before integrating them into the pipeline. Never architect around assumptions of how an API "should" behave.
