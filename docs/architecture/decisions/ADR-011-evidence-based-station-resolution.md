# ADR-011: Evidence-Based Station Resolution

## Context
Following the establishment of the Cascading Station Resolution Architecture (ADR-009), we identified a critical architectural ambiguity regarding how station resolution outputs (status, method, confidence, and source) are propagated and consumed by downstream components like the StrategyManager and the Provider adapters. 

Providers possess varying tolerances for the accuracy of bounding stations. Some providers strictly require verified topological codes to return accurate live train data, while others may accept loosely inferred bounding stations. Furthermore, downstream awareness engines require explicit confidence indicators to assess the overall safety level. Mixing provider capability checks with confidence scoring violated separation of concerns and could compromise the non-negotiable rule to "never communicate safety by omission" or fabricate data.

To resolve this, we require a strict, normative hierarchy of evidence, a clear separation between provider capability and downstream confidence, and explicit rules governing the provenance of resolution metadata.

## Decision

We are extending ADR-009 with a formalized, evidence-based station resolution model. This model standardizes the resolution vocabulary, establishes a normative Evidence Strength Hierarchy, defines clear ownership of provenance data, and introduces a strict Provider Capability Contract.

### 1. Conceptual Separation
The following concepts are now explicitly separated across the domain:
- **ResolutionStatus**: The state of the station resolution attempt itself.
- **ResolutionMethod**: The highest-strength method used to achieve resolution.
- **Confidence**: The reliability assessment of the resolution, used downstream for awareness calculation.
- **EvidenceSource**: The underlying datasets utilized during the resolution process.

### 2. Standardized Vocabularies

Do not mix station-resolution state with discovery pipeline state.

**StationResolutionStatus** (Owned by `StationResolutionEngine`):
- `RESOLVED`
- `UNRESOLVED`
*(The StationResolutionEngine must only report whether station resolution succeeded or failed).*

**DiscoveryStatus** (Owned by `StrategyManager`):
- `SUCCESS`
- `FAILED`
- `SKIPPED`
- `PREREQUISITE_UNAVAILABLE`
- `ERROR`
*(Note: `PREREQUISITE_UNAVAILABLE` is produced by the discovery pipeline when a strategy cannot execute, not by the StationResolutionEngine).*

**ResolutionMethod**:
- `VERIFIED_TOPOLOGY`
- `OFFLINE_GRAPH`
- `PROVIDER_GRAPH`
- `GEOMETRIC_PROJECTION`

**Confidence**:
- `HIGH`
- `MEDIUM`
- `LOW`

**EvidenceSource**:
- `OSM_TRACK_GEOMETRY`
- `OSM_STATION_NODE`
- `OSM_ROUTE_RELATION`
- `OFFLINE_GRAPH`
- `PROVIDER_TOPOLOGY`

### 3. Evidence Strength Hierarchy
Evidence strength is provider-independent. The architecture depends only on the existence of a total ordering—not fixed numeric values.

- Stronger evidence always supersedes weaker evidence.
- Exact ordering between `VERIFIED_TOPOLOGY` and `OFFLINE_GRAPH` may evolve depending on authoritative datasets.
- `GEOMETRIC_PROJECTION` is explicitly permanently defined as the weakest evidence level.

### 4. Geometric Projection Strategy
A new strategy, `GeometricProjectionStrategy`, is introduced to handle fallback scenarios where verified topology is absent. To ensure safety, this strategy is strictly governed and must validate configurable constraints including:
- `maximumProjectionDistance`
- `maximumAlongTrackGap`
- `minimumStationCount`
- `minimumCorridorCoverage`

These values are configuration parameters calibrated separately from this ADR. 

Additionally, the strategy:
- Must project candidate stations directly onto the resolved geometric corridor.
- Must ensure candidates remain constrained to the same corridor.
- Must **never** perform raw nearest-neighbour matching (which can cause snapping to adjacent, disconnected lines).
- Must order resolved stations strictly by distance along the corridor.
- Must return `UNRESOLVED` immediately if any admissibility requirements are not met.

*(Note: The term "Geometric Inference" may be used to describe the underlying mathematics, but the term "heuristic" is strictly forbidden in this architecture.)*

### 5. Formalized Evidence Sources
The metadata contract explicitly supports arrays of sources:
`evidenceSources: EvidenceSource[]`

This reflects the reality that multiple datasets may contribute to one resolution.
Example:
```json
[
  "OSM_TRACK_GEOMETRY",
  "OSM_STATION_NODE",
  "OFFLINE_GRAPH"
]
```

### 6. Provenance Ownership
The `StationResolutionEngine` is the **sole owner** of provenance metadata:
- `status`
- `method`
- `confidence`
- `confidenceReasons`
- `evidenceSources`

These fields are **immutable** once a resolution has been produced. Downstream components (StrategyManager, Provider adapters, Awareness Engine, UI, RailAwareService, etc.) may consume this metadata, but they must **never** modify or reinterpret it.

### 7. Provider Capability Contract
Providers must explicitly declare the minimum strength of evidence they require to function correctly. This is defined by a single, consistent model:

```typescript
interface ProviderCapability {
    minimumEvidenceStrength: ResolutionMethod;
}
```

We use `minimumEvidenceStrength` rather than "method" because providers care about the minimum acceptable evidence quality, not necessarily the exact operational method that produced it. 

Because the Evidence Strength Hierarchy is normative and ordered, the `StrategyManager` will simply compare the obtained `ResolutionMethod` against the provider's `minimumEvidenceStrength`. 

### 8. Provider Admissibility vs. Confidence
Provider capability checking and downstream confidence evaluation are fundamentally different stages in the pipeline. 

- **Provider Admissibility** determines whether a provider will accept the resolution and if train discovery may proceed.
- **Confidence** influences the downstream awareness assessment.
- **Invariant**: Confidence must **never** be used as the provider admission gate.

**Execution Flow:**
```text
ResolutionMethod
        ↓
Provider Capability Check
        ↓
   Accepted / Rejected
        ↓
   Confidence
        ↓
   Awareness Engine
```

### 9. Provider Configuration (Provisional)
For the current active provider, RailRadar:
- RailRadar currently defaults to `minimumEvidenceStrength: VERIFIED_TOPOLOGY`.
- This conservative configuration remains in effect until external validation of RailRadar's station-code handling has been completed.
- `GEOMETRIC_PROJECTION` is intentionally NOT enabled for RailRadar while that validation remains outstanding.
- **Action Item**: We must verify RailRadar's actual station-code handling requirements during Phase 0 validation before enabling `GEOMETRIC_PROJECTION` for this provider.

## Architecture Invariants
This architecture is governed by the following mandatory invariants:
- Stronger evidence supersedes weaker evidence.
- Weaker evidence never overwrites stronger evidence.
- Provider admissibility is independent from confidence.
- Provenance metadata is immutable.
- Downstream components never reinterpret provenance.
- ResolutionStatus and ResolutionMethod are orthogonal.
- Evidence sources are append-only.
- Geometric projection remains corridor constrained.
- Raw nearest-neighbour selection is prohibited.
- **Confidence Ceiling Rule**: Confidence is an upper bound, never a guarantee. `GEOMETRIC_PROJECTION` must never produce `HIGH` confidence unless another ADR explicitly changes this rule.

## Alternatives Considered
- **Set-based Provider Capabilities (`Set<ResolutionMethod>`)**: Considered allowing providers to pick and choose discrete methods. Rejected because station resolution methods represent a hierarchy of evidence strength. There is no logical scenario where a provider accepts `GEOMETRIC_PROJECTION` but rejects `VERIFIED_TOPOLOGY`. A threshold approach (`minimumEvidenceStrength`) is cleaner and more accurate to the domain.
- **Merging Confidence and Admissibility**: Considered letting the Awareness Engine decide if a provider should run based on confidence levels. Rejected because it violates separation of concerns; providers know their own API contracts, while the Awareness Engine assesses user safety.

## Consequences
- **Positive**: Strict immutability and provenance ownership prevent subtle data tampering bugs in downstream mappers or awareness engines.
- **Positive**: The Provider Capability contract prevents us from over-promising data to providers that require high-fidelity topological inputs.
- **Positive**: Historical replay becomes deterministic. Because provenance is immutable, historical observations can always be replayed using exactly the evidence available at the time.
- **Negative**: The system will more frequently fall back to `PREREQUISITE_UNAVAILABLE` when connected to strict providers in poorly mapped regions, leading to a degraded (but safe) UI experience.

## Open Questions
- How will RailRadar respond to bounding stations derived via `GEOMETRIC_PROJECTION`?

## Related ADRs
- ADR-002: Safety by Omission
- ADR-008: Topological Position Model
- ADR-009: Cascading Station Resolution Architecture

## Changelog
- **Refinement Pass**: 
  - Separated `StationResolutionStatus` from `DiscoveryStatus` (`PREREQUISITE_UNAVAILABLE`).
  - Generalized Evidence Strength to depend on total ordering.
  - Renamed capability field to `minimumEvidenceStrength`.
  - Expanded Geometric Projection constraints (`maximumProjectionDistance`, `maximumAlongTrackGap`, `minimumStationCount`, `minimumCorridorCoverage`).
  - Established Confidence Ceiling invariant for Geometric Projection.
  - Formalized array-based `EvidenceSource` schema.
  - Extracted core rules into a dedicated Architecture Invariants section.
  - Added deterministic historical replay to positive consequences.
  - Added Required Implementation Checklist.
- **Initial Document**: Formalized domains, established hierarchy, defined provenance ownership, and introduced the provider capability threshold.

## Required Implementation Changes
- [x] Add ResolutionMethod enum
- [x] Add EvidenceSource enum
- [x] Add confidenceReasons
- [x] Add evidenceSources
- [x] Add GeometricProjectionStrategy
- [x] Update StationResolutionEngine
- [x] Update StrategyManager admission logic
- [x] Rename DiscoveryStatus.UNSUPPORTED → PREREQUISITE_UNAVAILABLE
- [x] Update AwarenessEngine
- [x] Update RailAwareService
- [x] Add tests covering every evidence level
- [ ] Verify RailRadar capability before enabling geometric projection
