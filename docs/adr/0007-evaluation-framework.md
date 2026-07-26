# 0007: Evaluation Metrics Vocabulary & Semantics

**Status**: Accepted
**Date**: 2026-07-21

## Objective
This ADR establishes a shared, precise semantic language for all evaluation reporting, dashboards, experiments, benchmarks, and future provider integrations. It defines what is measured, why it is measured, what each metric means, and explicitly what it does *not* mean. This ensures objective measurement across the provider-independent pipeline.

---

## 1. Architectural Principles
- **Separation of Production and Evaluation:** The production pipeline determines awareness. The evaluation framework measures how well that pipeline performs. Evaluation must never influence production behaviour.
- **Separation of Metrics from KPIs:** Metrics answer "What is measured?" Evaluation profiles or benchmarks (defined elsewhere) answer "What value do we hope to achieve?" Acceptable thresholds, targets, and typical ranges are not embedded in metric definitions.
- **Metric Lifecycle:** Every metric must explicitly identify where it is produced and where it is consumed to make ownership explicit and prevent silent redefinition.

---

## 2. Orthogonal Taxonomy

Metrics belong to two orthogonal classification systems: Category (which subsystem is measured) and Metric Type (what kind of measurement is taken).

**Metric Types**:
- **Performance Metrics**: Measure time, latency, and throughput.
- **Accuracy Metrics**: Measure mathematical or spatial error against ground truth.
- **Behaviour Metrics**: Measure categorical outcomes, false positives, awareness timing, and recall.

**Categories**:
- **Observation**: Provider data quality.
- **Estimation**: TrainEstimator accuracy.
- **Awareness**: AwarenessEngine quality.
- **Provider**: External service stability.
- **Simulation**: Evaluation harness results.

---

## 3. Definition of Ground Truth

Several accuracy and behaviour metrics depend on "ground truth."
Ground truth is **not** simply "another provider's output." Comparing one provider against another measures variance, not error.

Acceptable sources of truth include:
- Surveyed replay datasets.
- Manually verified, timestamped human observations.
- High-precision onboard GPS telemetry specifically captured for evaluation.
- Simulation truth models (where the simulator *defines* reality).

---

## 4. Metric Definitions

### A. Observation Metrics
Measure the quality of incoming provider observations *before* they are processed.

* `ObservationAge`
  - **Type**: Performance
  - **Definition**: Elapsed time between the provider's observation timestamp and RailAware ingestion.
  - **Units**: Seconds
  - **Interpretation**: Lower is fresher.
  - **Explicit Non-Goal**: Does NOT mean network Round Trip Time (RTT).
  - **Produced by**: ObservationProvider
  - **Consumed by**: Confidence Engine, Metrics Reports

* `UpdateInterval`
  - **Type**: Performance
  - **Definition**: Time elapsed since the previous observation for the same train.
  - **Units**: Seconds
  - **Interpretation**: Evaluates consistency of polling stability.
  - **Explicit Non-Goal**: Does NOT mean the provider's scheduled service frequency.
  - **Produced by**: ObservationProvider
  - **Consumed by**: Metrics Reports

### B. Estimation Metrics
Measure how accurately `TrainObservation`s are transformed into `EstimatedTrainState`.

* `PositionError`
  - **Type**: Accuracy
  - **Definition**: The spatial error between the estimated train position and the reference ground truth position.
  - **Units**: Metres
  - **Interpretation**: Lower is more geographically accurate.
  - **Explicit Non-Goal**: Does NOT assume a specific implementation (e.g. haversine vs. 3D geometry), nor does it mean confidence margin.
  - **Produced by**: Evaluation Framework
  - **Consumed by**: Metrics Reports, Experiments

* `InterpolationError`
  - **Type**: Accuracy
  - **Definition**: The component of `PositionError` introduced specifically by assuming uniform speed across a track segment.
  - **Units**: Metres
  - **Interpretation**: Evaluates the cost of not having continuous geographic telemetry.
  - **Explicit Non-Goal**: Does NOT measure provider unreliability.
  - **Produced by**: Evaluation Framework
  - **Consumed by**: Metrics Reports

### C. Awareness Metrics
Measure the quality of the final `AwarenessContext`.

* `AwarenessLatency`
  - **Type**: Performance
  - **Definition**: Elapsed time between the provider's observation timestamp and the generation of the final `AwarenessContext`.
  - **Units**: Seconds
  - **Interpretation**: Measures the internal pipeline's processing overhead on top of data staleness.
  - **Explicit Non-Goal**: Does NOT mean `ObservationAge`.
  - **Produced by**: Evaluation Framework
  - **Consumed by**: Metrics Reports

* `MissedAwarenessEvent` (False Negative)
  - **Type**: Behaviour
  - **Definition**: Occurrences where the true state was `DANGER_ZONE` but the system reported `DISTANT` or `APPROACHING`.
  - **Units**: Count
  - **Interpretation**: Direct indicator of critical system failure to warn.
  - **Explicit Non-Goal**: Does NOT mean dropped network packets.
  - **Produced by**: Evaluation Framework
  - **Consumed by**: Metrics Reports

* `FalseAwarenessEvent` (False Positive)
  - **Type**: Behaviour
  - **Definition**: Occurrences where the system reported `DANGER_ZONE` but the true state was `DISTANT`.
  - **Units**: Count
  - **Interpretation**: Overly pessimistic confidence handling leading to alert fatigue.
  - **Explicit Non-Goal**: Does NOT mean invalid JSON payloads.
  - **Produced by**: Evaluation Framework
  - **Consumed by**: Metrics Reports

* `AlertLeadTime`
  - **Type**: Behaviour
  - **Definition**: Duration between the status changing to `DANGER_ZONE` and the physical train crossing the true danger boundary.
  - **Units**: Seconds
  - **Interpretation**: Measures the practical warning time given to a user.
  - **Explicit Non-Goal**: Does NOT mean ETA to the next station.
  - **Produced by**: Evaluation Framework
  - **Consumed by**: Metrics Reports

### D. Provider Metrics
Measure providers over time. These evaluate the external service, not RailAware.

* `ProviderUptime`
  - **Type**: Performance
  - **Definition**: Proportion of HTTP requests that receive a successful 2xx response.
  - **Units**: Percentage
  - **Interpretation**: Evaluates external infrastructure stability.
  - **Explicit Non-Goal**: Does NOT mean the data returned is accurate.
  - **Produced by**: HTTP Client / API Adapters
  - **Consumed by**: Metrics Reports

* `ProviderResponseLatency`
  - **Type**: Performance
  - **Definition**: Time taken for the provider HTTP request to complete.
  - **Units**: Milliseconds
  - **Interpretation**: Evaluates network and API speed.
  - **Explicit Non-Goal**: Does NOT mean `ObservationAge`.
  - **Produced by**: HTTP Client
  - **Consumed by**: Metrics Reports

**Note on `ProviderReliability`**: `ProviderReliability` is a domain property of the confidence model (see ADR 0003), not a direct evaluation metric. It is derived from combining Provider Metrics (like uptime and historical accuracy) over time.

### E. Simulation Results
Measure the outcomes of the deterministic evaluation harness.

* `ScenarioCoverage`
  - **Type**: Behaviour
  - **Definition**: Proportion of defined edge-case scenarios successfully executed.
  - **Units**: Percentage
  - **Explicit Non-Goal**: Does NOT mean code coverage (e.g. Jest/Istanbul).
  - **Produced by**: Simulator
  - **Consumed by**: Test Reports

* `ScenariosPassed`
  - **Type**: Behaviour
  - **Definition**: Count of simulated scenarios that met all their assertions.
  - **Units**: Count
  - **Explicit Non-Goal**: Does NOT mean production accuracy.
  - **Produced by**: Simulator
  - **Consumed by**: Test Reports

**Note on Simulation Configuration**: Parameters such as `InjectedUncertaintyVariance`, `ReplaySpeed`, and `RandomSeed` describe the *configuration* of a simulation, not the outcome. They must remain separate from Simulation Results.

---

## 5. Separation Rules
Metric conflation is explicitly prohibited. The following separations are architectural invariants:

- **Provider metrics ≠ Estimation metrics**
- **Observation metrics ≠ Awareness metrics**
- **Simulation metrics ≠ Production metrics**
- **Performance metrics ≠ Correctness metrics**
- **Confidence metrics ≠ Accuracy metrics** (Confidence is estimated uncertainty; accuracy is measured error against truth)
- **Availability ≠ Reliability**
- **Latency ≠ Freshness**
- **Precision ≠ Confidence**
- **Configuration ≠ Results** (e.g., injected variance vs. scenarios passed)

---

## 6. Naming Rules
Metric names must be:
- Unambiguous
- A singular concept
- Expressed in domain language
- Provider independent
- Implementation independent

### Prohibited / Ambiguous Terminology
The following terms are banned from the metrics glossary because they conflate dimensions or imply subjective judgment:
- `quality` (Use specific terms: `ObservationAge`, `PositionError`)
- `score` (Use specific ratios or rates)
- `health` (Use `ProviderUptime` or `UpdateInterval`)
- `status` (Reserved for `TrainStatus` or `AwarenessStatus`)
- `overall` (Prohibited; explicitly violates dimension independence)
- `confidenceScore` / `trustScore` (Use `ObservationConfidence`, `TopologyConfidence`, `ProviderReliability`)

---

## 7. Future Extensibility
To add a new metric to the framework, the proposer must specify:
1. Category
2. Metric Type
3. Definition
4. Units
5. Interpretation
6. Produced By / Consumed By
7. Relationship to existing metrics

No metric should be added without fitting an existing category or introducing a clearly justified new category.
