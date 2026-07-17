# Module System Audit

## Current State
RailAware currently operates with a mixed module system across its architecture:

### 1. Client (`client/`)
- **System:** Strict ESM (ECMAScript Modules).
- **Justification:** Powered by Vite and React, the frontend utilizes native `import`/`export` syntax and is bundled specifically for modern browser environments.

### 2. Server (`server/`)
- **System:** Mixed ESM and CommonJS.
- **Package.json Configuration:** Declares `"type": "module"`.
- **ESM Usage:**
  - Modern infrastructure entry points (`server.js`).
  - Configuration (`config/env.js`).
  - Network adapters (`corridor-resolver/overpass.js`).
- **CommonJS Usage:**
  - Core domain logic (`risk-engine`, `confidence-engine`, `recommendation-engine`).
  - Application orchestration (`application/bootstrap/createRailAwareService.js`).
  - Legacy integrations migrated from Phase 0 (`RailRadarProvider`).

## Why Both Exist?
This mixture is **intentional but technical debt**. 
During the migration from the Phase 0 Turborepo architecture (which used CommonJS across its independent domain packages), the core business logic was copied directly into the new `server/` monorepo directory to preserve test stability and non-negotiable architectural boundaries. 
The newer infrastructure (Express, `node-fetch`, Overpass instrumentation) was written utilizing standard ESM to take advantage of modern Node features like Top-Level Await and native standard `fetch`.

## How Node Supports It
Node.js (v24.14) allows packages specified as `"type": "module"` to natively support CommonJS files under the `.cjs` extension, or in our case, through the implicit `require()` usage natively supported in modern environments for interop, provided the ESM entry point doesn't enforce strict isolated context boundaries that conflict with `module.exports`.

## Future Migration Plan
Yes, a migration is planned. 
The mixed usage is considered technical debt that should not persist beyond `v1.0.0`. 
**Action Plan:**
1. Methodically rewrite all `module.exports` and `require()` calls in the domain engines (e.g., `RailAwareRiskEngine`, `StationResolutionEngine`) to use explicit `export` and `import`.
2. Ensure Jest is uniformly configured to run under `--experimental-vm-modules` for all test suites.
3. Eliminate `require()` entirely from the backend source code to achieve a 100% ESM monorepo.
