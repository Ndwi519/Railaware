# Repository Cleanup Report (RailAware Sprint 14)

The following legacy implementations were permanently removed from the repository following a strict dependency audit and regression verification.

### 1. `server/observation-engine/`
- **Reason:** Legacy component from Phase 0 that violated the separation of concerns by attempting to both store data and compute engine logic.
- **Replacement:** Functionality fully decoupled into `observation-store/` and `confidence-engine/`.
- **Verification:** All backend unit/integration tests passed after deletion.

### 2. `server/topological-position-engine/`
- **Reason:** Obsolete spatial resolution module.
- **Replacement:** Replaced by the robust graph traversal logic inside `corridor-resolver/`.
- **Verification:** `grep_search` confirmed zero external imports across the entire repository.

### 3. `server/risk-engine/rules.js`, `index.js`, `types.js`
- **Reason:** Legacy procedural rule evaluation for risk assessments.
- **Replacement:** The completely refactored Object-Oriented Domain model in `RailAwareRiskEngine.js`.
- **Verification:** Only imported by legacy test suites. Removed safely.

### 4. Legacy Tests (`tests/risk-engine/index.test.js`, `tests/observation-engine/state-machine.test.js`, `tests/contract/api-contract.test.js`)
- **Reason:** Obsolete test cases asserting against deprecated data structures and procedural modules. They caused ESM module resolution warnings.
- **Replacement:** New comprehensive suites inside `RailAwareRiskEngine.test.js` and `RailAwareService.integration.test.js`.
- **Verification:** The test runner (`npm run test`) successfully completed 100% of the active suites.

### 5. `server/risk-engine/package.json`
- **Reason:** Duplicate file.
- **Verification:** Initially caused a regression because it defined `"type": "commonjs"`, causing `RailAwareRiskEngine.test.js` to fail with `require is not defined`. This file was successfully **RESTORED** and the regression was resolved immediately.

*(Note: `server/provider/` was audited but explicitly **NOT DELETED**, as it is an active infrastructural dependency dynamically loaded by `TrainDiscoveryService`.)*
