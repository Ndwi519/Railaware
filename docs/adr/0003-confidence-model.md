# 0003: Confidence Model

**Status**: Accepted
**Date**: 2026-07-21

## Context
Data retrieved from providers varies in quality. We need a way to quantify this variance so the awareness engine can downgrade precision when uncertainty is high. There are two distinct types of uncertainty: the uncertainty of the data packet itself, and the historical trustworthiness of the provider supplying it.

## Decision
We implement and maintain three independent confidence concepts: `ObservationConfidence`, `ProviderReliability`, and `TopologyConfidence` (Alternative C adopted post-Phase 3 review).

1. **ObservationConfidence:** Represents confidence in a specific observation. It is affected by immediate, instance-level factors such as:
   - Observation age (staleness)
   - Latency in retrieval
   - Timestamp quality (e.g., precise vs. estimated times)
   - Uncertainty margins provided directly with the data packet
2. **ProviderReliability:** Represents the long-term behaviour and trustworthiness of the provider. It is affected by historical factors such as:
   - Consistency of data over time
   - Service availability (uptime)
   - Update regularity
   - Historical performance against known truth
3. **TopologyConfidence:** Represents uncertainty introduced by the geographic world-model estimation. This is fundamentally different from both measurement uncertainty and provider trustworthiness. It describes how confident the system is in the offline track geometry (e.g., authoritative OSM relations vs. geometric projection fallbacks). We elevate topology uncertainty to equal architectural status because track map fidelity is as external and volatile as provider telemetry.
4. **Design Principle - Sources vs Stages:** Confidence dimensions represent independent *sources of uncertainty*, not independent processing stages. A confidence dimension should only become first-class if it represents a fundamentally different category of uncertainty that remains meaningful to downstream consumers. This principle prevents the model from uncontrollably growing with every new processing stage.
5. **Separation Rationale:** These concepts must remain independent throughout the pipeline. A highly reliable provider might still furnish a single, highly delayed (low `ObservationConfidence`) observation. An accurate observation is useless if mapped onto a low-confidence track topology (`TopologyConfidence`). Merging them into a single confidence score destroys contextual nuance and makes it impossible for the `AwarenessEngine` to respond appropriately (e.g., trusting a stale observation on a verified track more than a fresh observation mapped geometrically on an unverified route).

## Alternatives Considered
- *A single combined "Trust Score":* Rejected because it obscures the *reason* for low confidence. We need to distinguish between "the data is old" and "the provider is flaky."

## Consequences
- The confidence evaluation must explicitly output both properties without eagerly merging them.
- Presentation logic can expose provider reliability distinct from observation confidence.

## Affected Modules
- `server/domain/models/ConfidenceAssessment.js`
- `server/confidence-engine/*`

## Related ADRs
- 0001: Provider-Independent Pipeline
