# RailAware v1.0.0 Release Report

## 1. System Overview
RailAware is a resilient, real-time railway safety application designed to detect approaching trains based on a user's geographical proximity to railway corridors. Built entirely on evidence-based deterministic architecture, the platform guarantees that safety is never inferred, assumed, or communicated by omission. 

## 2. Architecture Summary
- **Backend**: Express.js orchestrator wrapping a strict CommonJS Domain Layer.
- **Frontend**: React + Vite SPA using `useSmoothedLocation` for GPS tracking.
- **Engine Pipeline**: `TrainDiscoveryService` -> `RailRadarProvider` -> `ProviderInterpreter` -> `ObservationStore` -> `ConfidenceEngine` -> `RiskEngine` -> `RecommendationEngine` -> `LegacyApiMapper`.
- **Infrastructure**: Immutable, single-responsibility, side-effect-free architecture isolating provider translation from analytical logic.

## 3. Evidence Summary
The core confidence and risk thresholds are mathematically justified by Phase 0 empirical testing (`phase0_evidence.zip`), including:
- **Topology Limits**: Overpass querying strictly limited to 500m bounding.
- **Staleness Threshold**: Observations > 15 minutes old automatically degrade confidence to `LOW`.
- **Segment Regression**: Non-monotonic `segmentProgress` triggers fallback `MEDIUM` confidence rather than rejection, matching observed physical realities in the Phase 0 dataset.

## 4. Provider Limitations
- **Data Completeness**: RailRadar payloads occasionally omit `previousHalt` or `nextHalt`, rendering topology partially unresolvable.
- **Latency / API Limits**: Overpass and RailRadar are susceptible to `429 Too Many Requests` and `504 Gateway Timeout` under load.
- **Geolocation Inaccuracy**: Train tracking is fundamentally limited to the GPS refresh rate of the provider application running on user devices on the trains.

## 5. Known Limitations
- The `InMemoryObservationStore` does not persist historical observations across server restarts or horizontally scaled instances.
- The `corridorResolver` relies purely on local bounding caching and real-time OSM data; widespread regional OSM outages will paralyze Train Discovery.

## 6. Testing Performed (Sprint 8 Acceptance Test)
| Test Target | Status | Notes |
| :--- | :--- | :--- |
| **Browser Demo (No Railway)** | **COMPLETE** | Evaluated via Chromium Subagent. Location spoofed, Risk degraded to `UNKNOWN`. |
| **Browser Demo (Jaipur Junction)** | **COMPLETE** | Evaluated via Chromium Subagent. Location spoofed to `[26.92049, 75.78757]`. Risk correctly evaluated. |
| **Failure: Overpass Timeout** | **COMPLETE** | Handled natively. Triggered `UNKNOWN` Risk with `[Engineering decision] API unavailable` reason displayed in browser UI. |
| **Failure: Overpass 429** | **NOT VERIFIED** | Browser subagent automation failed due to host machine `C:\` drive disk space exhaustion (`ENOSPC`). |
| **Failure: RailRadar 429** | **NOT VERIFIED** | See above. |
| **Failure: RailRadar Auth** | **NOT VERIFIED** | See above. |
| **Failure: Malformed Payload** | **NOT VERIFIED** | See above. |
| **Release Audit: npm test** | **NOT VERIFIED** | `jest-haste-map` failed to allocate cache space on `C:\`. |

## 7. Release Checklist
- [x] Phase 0 Frozen & Validated
- [x] Domain Architecture Implemented
- [x] E2E Integration Pipeline (Backend) Verified
- [x] HTTP 500 Failure Trap Validation
- [x] API Backwards Compatibility Verified
- [ ] Automated Jest Suites Passing (Blocked by Host Disk Space)
- [ ] Repository Cleaned & Finalized

## 8. Open Issues
- **Host Disk Exhaustion**: The host machine `C:\` drive is at 100% capacity, blocking Jest and Chromium file caching.
- **Missing Git Tracking**: The workspace root `E:\Railaware` is currently not initialized as a `.git` repository, complicating rollback and CI/CD versioning.

## 9. Future Enhancements
- **Redis Observation Store**: Migrate `InMemoryObservationStore` to a Redis instance to allow multi-instance horizontal scaling.
- **Dockerization**: Containerize the Express backend and React frontend into isolated environments to mitigate host environment faults (e.g. `ENOSPC`).
- **Telemetry Aggregation**: Introduce Datadog or Prometheus logging to monitor Risk Engine states dynamically in production.
