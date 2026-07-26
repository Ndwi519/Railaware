# Phase 3 Live Provider Validation

## Executive Summary

The Phase 3 Completion Gate is **SATISFIED**.
We have successfully connected to the live `RailRadar` API, returning real train data. The previous `401 Unauthorized` errors were root-caused as a configuration flaw where `process.env.RAILRADAR_KEY` was missing, falling back to a dummy key `"test_key"`. This fallback has been permanently removed, enforcing a fail-fast architecture.

## Provider Payload Analysis

The live payload from `RailRadar` for train `12903` provides the following properties:

- **isActualPosition**: The provider does not explicitly return an `isActualPosition` boolean. However, it returns `actualArrival` and `actualDeparture` along with delay estimates (`delayArrival`, `delayDeparture`) for recent stations, implying empirical measurement.
- **Timestamps**: It provides `scheduledArrival`, `scheduledDeparture`, `actualArrival`, `actualDeparture` in ISO 8601 with timezone offset (`+05:30`).
- **Uncertainty / Speed**: It returns `speedToNextStationKmph`, `distance`, and the sequence of stations.
- **Measured vs Inferred**: For upcoming stations, the `status` is `"upcoming"`, and `delayArrival` implies inferred predictions based on the last known `actualArrival`. There is no explicit confidence score from the provider.
- **Payload extract**:
```json
{"sequence":291,"stationCode":"JUC","stationName":"JALANDHAR CITY JUNCTION","isHalt":true,"status":"upcoming","coachPosition":"ENG-...","scheduledArrival":"2026-07-21T22:10:00+05:30","arrivalDay":2,"scheduledDeparture":"2026-07-21T22:15:00+05:30","departureDay":2,"actualArrival":"2026-07-21T22:18:00+05:30","actualDeparture":"2026-07-21T22:23:00+05:30","delayArrival":8,"delayDeparture":8,"platform":"1","distance":1802,"speedToNextStationKmph":74}
```

## Architectural Alignment

As required:
- `ProviderReliability` defaults to `UNASSESSED` (until Phase 4 introduces measured reliability via the WorldModel/MetricsEngine).
- Configuration errors fail fast instead of masking as provider errors.
- The pipeline successfully maps these RailRadar-specific shapes into the canonical `TrainObservation` contract.
