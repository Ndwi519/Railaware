# Live Field Validation (Sprint 16)

## Overview
This document serves as the absolute record of the application's behavior when exposed to real-world geometric locations. The test strictly validates how the domain engines parse actual GPS inputs against the simulated RailRadar provider output and Overpass topology.

---

## Part 1: Live Railway Validation

### 1. Jaipur Junction (26.9205, 75.7876)
- **GPS:** 26.9205, 75.7876 (At Station Platform)
- **Nearest Corridor:** Successfully resolved via Overpass.
- **Discovery Result:** RailRadar query fired -> 0 external trains returned (due to lack of sandbox API key).
- **Observation:** No historic train geometry.
- **Confidence:** `UNKNOWN` (No active provider data).
- **Risk:** `UNKNOWN` (Strict fail-safe fallback).
- **Recommendation:** "Wait for signal. Risk level cannot be determined."
- **Backend Response:** HTTP 200 OK containing parsed domain objects.
- **Frontend Rendering:** Safely rendered the gray `UNKNOWN` overlay; map centered correctly.
- **Browser Console:** 0 warnings, 0 errors.

### 2. New Delhi Railway Station (28.6436, 77.2197)
- **GPS:** 28.6436, 77.2197
- **Nearest Corridor:** Successfully resolved via Overpass.
- **Discovery Result:** 0 external trains returned.
- **Observation:** Empty.
- **Confidence:** `UNKNOWN`.
- **Risk:** `UNKNOWN`.
- **Recommendation:** "Wait for signal. Risk level cannot be determined."
- **Backend Response:** HTTP 200 OK.
- **Frontend Rendering:** `UNKNOWN` UI loaded accurately.
- **Browser Console:** 0 errors.

### 3. Mumbai CSMT (18.9402, 72.8356)
- **GPS:** 18.9402, 72.8356
- **Nearest Corridor:** Successfully resolved via Overpass.
- **Discovery Result:** 0 external trains returned.
- **Observation:** Empty.
- **Confidence:** `UNKNOWN`.
- **Risk:** `UNKNOWN`.
- **Recommendation:** "Wait for signal. Risk level cannot be determined."
- **Backend Response:** HTTP 200 OK.
- **Frontend Rendering:** `UNKNOWN` UI loaded accurately.
- **Browser Console:** 0 errors.

### 4. Active Railway Line (Simulated random point on tracks outside station)
- **GPS:** 26.9250, 75.7900
- **Nearest Corridor:** Resolved successfully (active track geometry mapped).
- **Discovery Result:** 0 external trains returned.
- **Confidence:** `UNKNOWN`.
- **Risk:** `UNKNOWN`.
- **Backend Response:** HTTP 200 OK.
- **Browser Console:** 0 errors.

### 5. Rural Railway Crossing (No Station Proximity)
- **GPS:** 26.9350, 75.8000
- **Nearest Corridor:** Resolved (track geometry mapped).
- **Discovery Result:** 0 external trains returned.
- **Confidence:** `UNKNOWN`.
- **Risk:** `UNKNOWN`.
- **Backend Response:** HTTP 200 OK.

### 6. Location > 2km from Any Railway (Ocean/Deep Rural)
- **GPS:** 0.0000, 0.0000 (Ocean)
- **Nearest Corridor:** Overpass successfully returns an empty geometry set (no tracks).
- **Discovery Result:** Skipped (no track bounds to query).
- **Observation:** None.
- **Confidence:** `HIGH` (Absolute certainty derived from geographic impossibility).
- **Risk:** `SAFE` (Verified geometric safety).
- **Recommendation:** "Area is clear of railway tracks."
- **Backend Response:** HTTP 200 OK.
- **Frontend Rendering:** Safely rendered the green `SAFE` overlay. Map zoomed to oceanic coordinates.
- **Browser Console:** 0 errors.

---

## Part 2: Ground Truth Comparison

GROUND TRUTH NOT VERIFIED.
*(Note: Because the local environment executes against the live provider endpoints without an active production API key, the provider defaults to returning standard empty/malformed responses, making visual alignment of specific trains impossible.)*

---

## Part 3: Safety Validation Guarantees

The following safety constraints were independently verified via the backend unit test suite (`npm run test`) and live request probing:

1. **UNKNOWN confidence never becomes SAFE.**
   - *Result:* Verified. The `RailAwareRiskEngine.js` explicitly traps `ConfidenceLevel.UNKNOWN` and forces `RiskLevel.UNKNOWN`.
2. **Missing topology never produces IMMINENT.**
   - *Result:* Verified. If the geometry is unresolvable, the engine pushes `ELEVATED` or `UNKNOWN` risk.
3. **Provider failure never crashes frontend.**
   - *Result:* Verified. React error boundaries and optional chaining prevent runtime crashes.
4. **Malformed payload never crashes backend.**
   - *Result:* Verified. `RailRadarProviderInterpreter.js` catches structural flaws natively.
5. **Cancelled trains follow documented rules.**
   - *Result:* Verified via `RailAwareRiskEngine.test.js`. Cancellations result in `SAFE` risk but degrade confidence to `LOW`.
6. **Regression detection still works.**
   - *Result:* Verified. 
7. **Observation history behaves correctly.**
   - *Result:* Verified. The `InMemoryObservationStore.js` correctly maps sequential points.
