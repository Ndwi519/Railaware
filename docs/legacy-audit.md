# Legacy Dependency Audit (RailAware Sprint 14)

## Objective
To identify and verify obsolete implementations prior to permanent deletion. No file is deleted unless it is proven to be completely disconnected from the active production pipeline.

---

### 1. `server/observation-engine/`
- **Imported anywhere?** Yes, but strictly within legacy testing boundaries (`tests/observation-engine/state-machine.test.js` and `tests/contract/api-contract.test.js`) and by the obsolete `risk-engine/rules.js`.
- **Referenced dynamically?** No.
- **Executed by npm scripts?** Only incidentally via `jest` test discovery.
- **Verdict:** **SAFE TO DELETE**. Replaced structurally by `observation-store` and `confidence-engine`.

### 2. `server/topological-position-engine/`
- **Imported anywhere?** No. Grep search confirms zero external imports.
- **Referenced dynamically?** No.
- **Executed by npm scripts?** No.
- **Verdict:** **SAFE TO DELETE**. Replaced structurally by `corridor-resolver`.

### 3. `server/provider/`
- **Imported anywhere?** **YES**. It is actively imported by `createRailAwareService.js` (line 15) and passed into `TrainDiscoveryService`.
- **Referenced dynamically?** Yes, the orchestrator depends on it for legacy geographic bounding via `provider/railradar.js`.
- **Executed by npm scripts?** Yes.
- **Verdict:** **UNSAFE TO DELETE**. It is currently a critical dependency for Train Discovery. 

### 4. `server/risk-engine/rules.js`, `index.js`, `types.js`
- **Imported anywhere?** Only by `tests/risk-engine/index.test.js`. Not imported by `RailAwareRiskEngine.js`.
- **Referenced dynamically?** No.
- **Executed by npm scripts?** Only incidentally via `jest` test discovery.
- **Verdict:** **SAFE TO DELETE**. Replaced strictly by the OOP `RailAwareRiskEngine.js`.

### 5. `server/risk-engine/package.json`
- **Imported anywhere?** No.
- **Referenced dynamically?** No.
- **Executed by npm scripts?** No.
- **Verdict:** **SAFE TO DELETE**. Extraneous package file causing module resolution warnings.

### 6. Legacy Tests (`tests/risk-engine/index.test.js`, `tests/observation-engine/state-machine.test.js`, `tests/contract/api-contract.test.js`)
- **Imported anywhere?** No.
- **Referenced dynamically?** Discovered dynamically by Jest.
- **Executed by npm scripts?** Yes, during `npm test`.
- **Verdict:** **SAFE TO DELETE**. These tests assert against deprecated models and cause CI/CD failures due to legacy ES module resolution conflicts.
