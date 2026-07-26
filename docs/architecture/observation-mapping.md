# Observation Transformation Pipeline

This document explains the complete transformation chain, identifying *why* the abstractions exist and how uncertainty is managed as data flows from the provider to the awareness client.

## Transformation Chain

### 1. Raw Provider Payload → `TrainObservation`
**Source:** The raw JSON payload from the `ObservationProvider` (e.g. RailRadar).
- **Transformation:** Extracts 1D railway topology (previous/next stations, `segmentProgress`) and operational status.
- **Assumptions:** Assumes the provider's station codes match our unified station registry. Assumes `segmentProgress` is a linear fractional distance.
- **Uncertainty Introduced:** Zero. The mapping is strict. Missing fields become `null`.
- **Discarded Information:** Display-level data such as coach positions, platform numbers, and scheduling days.

### 2. `TrainObservation` → `EstimatedTrainState`
**Source:** The `TrainObservation` (1D state) combined with the physical corridor geometry.
- **Transformation:** The `TrainEstimator` loads the OSM physical track polyline connecting the bounding stations, calculating the total geographic length. It then travels `segmentProgress` % along that polyline to compute a 2D GPS coordinate (latitude/longitude) and instant heading (bearing).
- **Assumptions:** Assumes the track geometry accurately represents the physical rails. Assumes the train travels at a roughly uniform speed between periodic coordinate updates.
- **Uncertainty Introduced:** High. This is the single largest source of geographic uncertainty in the system. Geometric projection introduces error whenever the actual track geometry deviates from the offline polyline, or if the provider's internal progress calculation uses a non-linear formula.
- **Discarded Information:** None. The 1D context remains attached to the state.

### 3. `EstimatedTrainState` → `AwarenessContext`
**Source:** The estimated 2D position of the train, relative to the end user's device coordinates.
- **Transformation:** The `RailAwareAwarenessEngine` computes the Haversine distance between the user and the estimated train. It evaluates this distance against configured thresholds to assign a semantic status (`DISTANT`, `APPROACHING_STATION`, `DANGER_ZONE`).
- **Assumptions:** Assumes the user's GPS coordinates are reasonably accurate.
- **Uncertainty Introduced:** None geometrically, but semantic thresholds introduce hard boundaries (e.g., 990m is DANGER, 1010m is APPROACHING).
- **Discarded Information:** Precise bearing and raw train coordinates are hidden behind the semantic `status` and `distanceMetres` to prevent the UI from over-representing precision.

## Why These Abstractions Exist
The separation between `TrainObservation` (what the provider *claims* about the railway network) and `EstimatedTrainState` (where the train *physically* is) is paramount. It allows us to decouple proprietary provider logic from our internal GIS engine. If a future provider supplies true 2D GPS coordinates directly, they map straight into `EstimatedTrainState` without needing geometric projection, completely bypassing the estimation uncertainty.
