# 0002: TrainObservation Domain Contract

**Status**: Accepted
**Date**: 2026-07-21

## Context
The system models data returned from external railway systems. Previously, this data was loosely modelled as an `Observation`. However, the architectural design establishes a canonical domain contract specifically named `TrainObservation` to accurately reflect its content and to enforce a rigid schema.

## Decision
We rename `Observation` to `TrainObservation`.

1. **Why Observation became TrainObservation:** The term `Observation` is too generic and could refer to environmental factors, user telemetry, or internal diagnostics. `TrainObservation` makes it explicit that this object represents the raw, factual state of a train as observed by a provider at a specific point in time.
2. **Canonical Domain Contract:** `TrainObservation` serves as the absolute boundary. Anything leaving the `ObservationProvider` must be mapped into this exact object. It contains only observed data—no estimations, extrapolations, or subjective confidence scores.
3. **Identical Terminology:** The architecture, documentation, and implementation must use identical terminology. Diverging names between the architectural design (which mandates `TrainObservation`) and the codebase (which used `Observation`) causes cognitive overhead and ambiguity.

## Alternatives Considered
- *Keeping `Observation` and aliasing it in documentation:* Rejected because cognitive dissonance between architecture docs and code often leads to technical debt and confusion for future contributors.
- *Creating a wrapper `TrainObservation` over `Observation`:* Rejected as it introduces unnecessary indirection. A direct rename preserves simplicity.

## Consequences
- All providers must now map to the `TrainObservation` class.
- Imports and variables across the pipeline (`RailAwareService`, estimators, tests) must be updated.
- Clearer semantic meaning across the codebase.

## Affected Modules
- `server/domain/models/TrainObservation.js` (formerly `Observation.js`)
- `server/application/services/RailAwareService.js`
- `server/awareness-engine/TrainEstimator.js`

## Related ADRs
- 0001: Provider-Independent Pipeline
