# Final Evidence Audit (v1.0.0)

## 1. Files Reviewed
- `client/src/__tests__/LiveMapPage.test.jsx`
- `docs/release-notes-v1.0.0.md`
- `docs/field-validation-report.md`
- `docs/architecture/decisions/ADR-010-adaptive-polling.md`
- `docs/architecture/decisions/ADR-008-topological-position-model.md`
- `docs/architecture/decisions/ADR-009-station-resolution.md`
- `docs/architecture/decisions/ADR-002-safety-by-omission.md`

## 2. Implementation Verified
- **LiveMapPage Integration Test:** Verified by inspection of: `client/src/__tests__/LiveMapPage.test.jsx`. The file does *not* contain a `vi.mock` for `DeveloperDiagnosticsPanel`. The integration test exercises the real DeveloperDiagnosticsPanel.

## 3. Wording Softened & Unsupported Certainty Removed
- **`docs/release-notes-v1.0.0.md`:** 
  - Rewrote the document to state "an implementation" rather than "release candidate" or "production system."
  - Replaced "is designed to ensure" with "The implementation currently returns `UNKNOWN` or `ELEVATED` in the validation scenarios and automated tests when provider or topology information is unavailable."
  - Replaced the hardcoded ~38MB RSS memory benchmark with "Memory usage has not yet been benchmarked under a reproducible workload."
- **`docs/field-validation-report.md`:** 
  - Replaced absolute manual observations (e.g. "Typing is natively isolated", "Field resets cleanly", "Zero React warnings") with "Observed during manual validation that..."
- **`docs/architecture/decisions/ADR-010-adaptive-polling.md`:** 
  - Updated all references to the future adaptive polling implementation to conditional future tense (e.g., "If implemented, adaptive polling would...").
  - Changed "Rejected" alternatives to "Evaluated but is not the preferred direction for future evolution."
- **`docs/architecture/decisions/ADR-008-topological-position-model.md`:** 
  - Explicitly separated "Implemented Architecture" from "Future Migration Work."
  - Softened language around the required new package to "A future implementation would require...".
- **`docs/architecture/decisions/ADR-002-safety-by-omission.md` & `ADR-009-station-resolution.md`:**
  - Softened "Guarantees that users are never explicitly told" to "Provides a structural guardrail so users are never explicitly told."
  - Softened "conclusively proved" and "fully mapped" to "indicated" and "mapped."

## 4. Remaining Assumptions
- The proposed 30s/10s/5s intervals in `ADR-010-adaptive-polling.md` remain strictly labelled as "provisional engineering defaults" that require empirical validation.
- Provider cadence and update limits (`RailRadar`) remain assumptions pending live physical tracking against a non-sandboxed API.

## 5. Remaining Manual Observations
- Observed during manual validation: UI interactions such as map click resets, keystroke isolation, and React console warnings via the Developer Diagnostics Panel.

## 6. Remaining Unverified Areas
- Live physical tracking against moving trains is unverified due to external provider sandboxing.
- Geographic discovery latency variance (Overpass API) under peak loads is not empirically benchmarked.
- Production memory usage and CPU footprint remain unverified under a reproducible, CI-driven automated workload.

---

The documentation has been revised so that implementation, tests, validation evidence, and proposed future work are clearly distinguished. Remaining unverified items are explicitly identified.
