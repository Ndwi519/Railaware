# 0001: Provider-Independent Pipeline

**Status**: Accepted
**Date**: 2026-07-21

## Context
The RailAware application aims to be resilient to changes in data providers, such as switching from RailRadar to NTES or CRIS. The architecture must enforce a boundary so that the core processing engine does not depend on provider-specific behavior, and providers do not perform application-specific logic.

## Decision
We establish a frozen, strict pipeline:
`ObservationProvider -> TrainObservation -> TrainEstimator -> EstimatedTrainState -> RailAwareAwarenessEngine -> AwarenessContext -> Presentation`

1. **Provider-independent Architecture:** No provider-specific logic is allowed above the `ObservationProvider` layer.
2. **Observation-centric Design:** The system operates purely on observations passed up from the provider, unaware of the actual implementation or source logic behind them.
3. **Provider Isolation:** All data providers must implement the `ObservationProvider` interface. Providers are only responsible for acquiring and mapping data to `TrainObservation`. They are forbidden from performing estimation, awareness generation, or confidence assessment.
4. **Dependency Direction:** Dependencies must strictly flow downwards. The application layers depend on the domain contracts, and the providers implement these contracts.

## Alternatives Considered
- *Allowing providers to return raw data and parsing it in the engine:* This was rejected because it leaks provider-specific details (such as JSON schemas or endpoints) into the core engine.
- *Allowing providers to evaluate confidence or state:* This was rejected because the rules for confidence and awareness are business logic, which must be centrally maintained and provider-agnostic.

## Consequences
- The core engine is decoupled from the external data source, allowing for an evaluation framework to substitute a `SimulationProvider` seamlessly.
- New providers can be integrated strictly by implementing the data mapping logic.
- The rigid pipeline guarantees predictable data flow and facilitates easier unit testing for domain logic.

## Affected Modules
- `server/application/services/RailAwareService.js`
- `server/awareness-engine/*`
- `server/provider/*`

## Related ADRs
- 0002: TrainObservation Domain Contract
- 0006: Provider-Agnostic Evaluation Gate
