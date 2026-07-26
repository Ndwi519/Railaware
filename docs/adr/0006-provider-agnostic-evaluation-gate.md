# 0006: Provider-Agnostic Evaluation Gate

**Status**: Accepted
**Date**: 2026-07-21

## Context
There is a risk in developing a complex Evaluation Framework based solely on simulated data: the framework may unconsciously couple itself to the quirks of the simulator rather than reality. We must ensure the core pipeline truly supports real-world, unpredictable data before investing in evaluation logic.

## Decision
The implementation is strictly phased, with a provider-independent evaluation gate.

1. **Phased Strategy:** The core pipeline (Phase 1) and Simulation (Phase 2) are built first. However, Phase 4 (Evaluation Framework) is explicitly gated behind Phase 3.
2. **Provider-Agnostic Gate:** Phase 4 must not begin until at least one *real* `ObservationProvider` (e.g., RailRadar) has successfully produced a `TrainObservation`, passed it through the pipeline, generated an `AwarenessContext`, and rendered it operationally.
3. **Why Provider-Agnostic:** The gate is not tied to RailRadar specifically. Any real provider satisfies the gate. The goal is to prove the architecture works against reality, not against a specific vendor.

## Alternatives Considered
- *Building the Evaluation Framework immediately after Simulation:* Rejected. This creates the engineering risk of "simulation-only development" resulting in an evaluation framework that fails when confronted with messy, real-world provider data.

## Consequences
- Development velocity on the Evaluation Framework is intentionally stalled until real data integration is verified.
- Guarantees the Evaluation Framework is measuring reality-tested architecture.

## Affected Modules
- Project Management / Implementation Plan

## Related ADRs
- 0001: Provider-Independent Pipeline
