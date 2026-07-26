# 0005: Terminology and Scope Framing

**Status**: Accepted
**Date**: 2026-07-21

## Context
The application provides information regarding train positions, which users might interpret as safety-critical warnings. Using improper terminology implies the system is a certified, fail-safe safety system, which it is not (due to reliance on uncertified third-party data providers). We must architecturally codify the terminology to mitigate this liability and misinterpretation.

## Decision
We mandate specific terminology to frame the scope correctly:

1. **Situational Awareness vs Warning System:** We exclusively use "Situational Awareness" instead of "Warning System". The system *informs* the user of the situation; it does not *warn* them of absolute danger or certify absolute safety.
2. **Confidence Assessment vs Risk Assessment:** We use "Confidence Assessment" to evaluate the data quality. We explicitly reject "Risk Assessment", which implies an evaluation of physical danger to life.
3. **Avoidance of Safety-Certification Implications:** Terminology that sounds like regulated railway safety language (e.g., "Clear", "Track Circuit Verified") is avoided. The architecture reflects this by naming engines appropriately (e.g., `RailAwareAwarenessEngine` and `ConfidenceEngine`).

## Alternatives Considered
- *Using standard railway terms for familiarity:* Rejected because it implies a level of systemic integration and safety certification that RailAware lacks by definition.

## Consequences
- All UI text, API responses, and class names must adhere to "Awareness" and "Confidence".
- Future contributors are bound by these semantic boundaries when naming new modules or properties.

## Affected Modules
- `server/awareness-engine/*`
- `server/confidence-engine/*`
- `server/domain/models/AwarenessContext.js`

## Exceptions
- Explicit architectural and developer-facing exceptions are maintained in [terminology-exceptions.md](../architecture/terminology-exceptions.md). These exceptions are strictly prohibited from leaking into user-facing presentation layers.

## Related ADRs
- 0004: Operational vs Evaluation UI
