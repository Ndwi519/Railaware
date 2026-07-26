# RailAware Maintainer's Guide

This document is a practical guide for extending, modifying, and maintaining the RailAware platform. It enforces the architectural invariants established in Version 1.0.

---

## 1. Extension Guide

### Adding a New Provider
Providers are the only modules permitted to interface with external APIs.
1. **Create the Integration:** Build the API integration inside `server/provider/new_provider.js`.
2. **Implement the Contract:** Wrap the integration in a class implementing the `ProviderInterpreter` contract (see `server/domain/contracts/ProviderInterpreter.js`).
3. **Molding Data:** Your interpreter MUST return a standard `TrainObservation` object. Do not leak provider-specific keys, authentication details, or anomalous failure types beyond the boundary.
4. **Constraining ADR:** **ADR 0002 (Provider Independence)** dictates that the rest of the application must be completely unaware of the provider's existence.
5. **Common Mistake:** Throwing generic errors. Wrap all HTTP failures in a `ProviderError` so the pipeline can gracefully decay into an "UNKNOWN" safety state.

### Adding a New Evaluation Metric
1. **Location:** Modify `server/evaluation-framework/metrics/MetricsEngine.js`.
2. **Semantics:** Follow the naming convention established in **ADR 0007** (e.g., `MeanPositionError`, `FalseNegatives`). Avoid injecting engineering KPIs like `Target: 0` into the metric itself. The metric merely measures reality.
3. **Validation:** Ensure the metric logic leverages the `EvaluationRecorder` ledger containing `truth` and `pipelineResult`. Never invoke production engine logic directly from within the `MetricsEngine`.

### Adding a New Evaluation Scenario
1. **Schema Validation:** Define the scenario inside `server/evaluation-framework/data/scenarios/`. The scenario JSON must rigidly adhere to the Zod schema defined in `scenarios/models.js`.
2. **Determinism Required:** Do not use runtime dates (like `new Date()`) inside scenarios. Hardcode `recordedAt` timestamps to ensure deterministic evaluation hashes.

### Modifying the TrainEstimator
1. **Scope:** `TrainEstimator` owns *all* distance math. If you need to change how `segmentProgress` interpolates across a corridor, do it here.
2. **Constraining ADR:** **ADR 0006 (Estimation Ownership)** prohibits leaking distance mathematics into the provider or awareness layers.
3. **Common Mistake:** Returning an arbitrary distance when data is missing. If the distance cannot be calculated, return `null`.

### Modifying the AwarenessEngine
1. **Scope:** `AwarenessEngine` consumes physical distances and translates them into semantic safety statuses (e.g., `APPROACHING_STATION`).
2. **Constraining ADR:** **ADR 0005 (Null Safety)** dictates that missing or invalid distances MUST map to `status: 'UNKNOWN'`, never `status: 'DISTANT'`. Absence of evidence is not evidence of safety.

---

## 2. Known Limitations

### Accepted Limitations (Intentional Design Trade-offs)
- **Topological 1D Model over 2D Telemetry:** RailRadar provides `previousHalt` and `nextHalt`, but not continuous geographic coordinates. The system intentionally maps this 1D topology onto physical corridors rather than attempting impossible GPS triangulation.
- **Corridor Resolution:** Due to the scope of national railway networks, the `CorridorResolver` may rely on localized overpass stubs. Expanding to a national database is an infrastructure scaling task, not an architectural defect.

### Technical Debt
- **Evaluation Schema Duplication:** The Zod schemas inside `evaluation-framework/scenarios/models.js` slightly duplicate the standard domain models. This is tolerated to maintain absolute module isolation between production and evaluation.

### Remaining Assumptions (Requiring Future Empirical Validation)
- **Active Segment Progress Inference:** During Phase 0 testing, stationary trains omitted the `segmentProgress` payload field. It is currently inferred that moving trains will populate this field. If they do not, the system falls back gracefully to node-to-node topology logic, but this assumption requires live testing.

---

## 3. Maintenance Checklist

Before approving any Pull Request, maintainers MUST verify the following invariants:

- [ ] **ADR Compliance:** Does the change violate any of the 7 foundational ADRs?
- [ ] **Provider Independence:** Does `TrainEstimator` or `AwarenessEngine` check for provider-specific properties (e.g., `if (obs.provider === 'RailRadar')`)? **(Violates ADR 0002 if true)**.
- [ ] **Confidence Independence:** Have `ObservationConfidence`, `TopologyConfidence`, or `ProviderReliability` been combined into a unified score or weighted average? **(Violates ADR 0003 if true)**.
- [ ] **Null Safety:** Does a failed API call or missing payload result in an assumption of safety? **(Violates ADR 0005 if true. Must result in UNKNOWN or NO_TRAINS_FOUND explicitly)**.
- [ ] **Evaluation Isolation:** Does the production pipeline (`server/application/`) import any modules from `server/evaluation-framework/`? **(Violates ADR 0007 if true)**.
- [ ] **Deterministic Evaluation:** Have all evaluation scenarios been executed? Does the hash match exactly? If not, identify the source of time-dependent logic bleeding into the calculation.
- [ ] **Documentation Updates:** If an architectural change was legitimately approved via a new ADR, have `ARCHITECTURE.md` and `HANDOVER.md` been updated to reflect the evolution?
