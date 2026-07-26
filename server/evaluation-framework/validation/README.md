# Shadow Mode Validation Harness

This validation framework executes deterministic synthetic movement scenarios through the production RailAware orchestration pipeline, proving the pipeline's routing invariants against a known truth.

## Architecture & Philosophy

- **Production Fidelity**: The harness evaluates locations through the production entry point (`RailAwareService.evaluateLocation()`), ensuring session continuity, state transitions, and object ownership are identical to production.
- **Strict Isolation**: A fresh `createRailAwareService` instance is generated for every execution. Application state, caches, and dependency singletons are fully isolated between runs, avoiding leakage.
- **Fixture Injection**: External network dependencies (e.g. Overpass API) are replaced via dependency injection using deterministic fixtures (`ndls_success.json`).
- **Independent Oracle**: The expected state for each tick is derived solely from the synthetic scenario definition and geometry. Production logic (`projectOntoCorridor` or `BranchEvidenceBuilder`) is never used to determine the expected result.
- **Deterministic Traversal**: `MovementTraceGenerator` determines the correct branch trajectory upfront using explicit definitions (`preferredBranchId`) rather than relying on arbitrary topological orderings.
- **Defect Policy**: If the validation harness exposes routing defects, the harness *should fail*. The failures will be cataloged and fixed in separate milestone branches. We do not modify production code simply to silence validation failures.

## Usage

```bash
npm run test:validation
```

## Failure Classification

Failures detected by the harness are grouped to simplify triage:

*   **`APPLICATION_EXCEPTION`**: The orchestration logic crashed or threw an unexpected error before routing assertions could complete.
*   **`DEPENDENCY_WIRING`**: The application executed, but failed due to mismatched object property names or broken integration boundaries (e.g., destructing `lat`/`lng` when the contract specifies `latitude`/`longitude`).
*   **`ROUTING_PIPELINE`**: An invariant assertion mismatch, meaning the algorithm output deviated from reality.
*   **`SCENARIO_EXPECTATION`**: The scenario Oracle expectation doesn't match the required contract or scenario bounds.
*   **`FIXTURE_LIMITATION`**: The validation failure is a consequence of insufficient geometric fidelity or truncated routes in the fixture itself rather than the code.
*   **`HARNESS_ERROR`**: Scenario syntax or evaluation bounds issues.
*   **`UNKNOWN`**: Internal, unclassified failure.

## Discovered Defects

The following defects were discovered natively by the harness and subsequently resolved in the routing pipeline:
1. **Defect-001 (DiscoveryContext Observation Contract)**: Resolved a wiring bug where the `TrajectoryObservation` exposed `latitude` and `longitude`, but `TrainDiscoveryService` attempted to destructure `{ lat, lng }`.
2. **Defect-002 (RouteContextBuilder Topology Loss)**: Fixed an issue where `station-matcher.js` stripped topology metadata (like `corridorSegmentIndex`), preventing `RouteContextBuilder` from locating bounding stations.
3. **Defect-003 (Conservative Branch Retention)**: Improved routing correctness so the pipeline securely retains the train on its current branch when approaching distant curves/forks rather than throwing `AMBIGUOUS`.
4. **Defect-004 (Public Station DTO Leak)**: An architectural boundary regression introduced during the Defect-002 fix was secured, ensuring internal routing metadata is explicitly stripped by `ResolverResponseFactory` before public serialization.
5. **Defect-005 (Evaluation Router Trust Boundary)**: Transformed the incidental safety of the evaluation framework into a structural trust boundary by implementing an explicit `EvaluationMapper` DTO and restricting the framework to developer/CI environments via conditional mounting (Model A).

## Evaluation Framework API & Trust Boundary

The evaluation orchestration pipeline leverages an API available exclusively in non-production environments (`NODE_ENV != 'production'`). By explicitly conforming to Deployment Model A, the framework operates strictly as Developer and CI tooling.

To guarantee that simulated responses never inadvertently serialize internal production metadata, the Evaluation Router passes all simulated pipeline results through a rigorous serialization boundary (`EvaluationMapper`). This guarantees:
- Topological variables (e.g. `assembledCorridor`, `routingResult`) are explicitly stripped.
- Only vetted metric and UI trace fields (e.g., `awareness`, `discoveryContext.trace`) are successfully serialized to clients.
