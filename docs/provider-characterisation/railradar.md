# RailRadar Provider Characterisation

**Endpoint**: `GET https://api.railradar.in/v1/trains/:id/live`
**Authentication**: Bearer Token (API Key) via `Authorization` header.
**Response Semantic**: Station event sequence with server-side physical inferences.

## Response Schema & Semantics

The payload structure returned for a live train consists of an outer metadata wrapper and an inner array of station events.

```json
{
  "success": true,
  "data": {
    "trainNumber": "12903",
    "status": "running",
    "previousHalt": { "stationCode": "JP", "stationName": "JAIPUR" },
    "nextHalt": { "stationCode": "FL", "stationName": "PHULERA JUNCTION" },
    "currentLocation": {
      "stationCode": "FL",
      "segmentProgress": 0.82
    },
    "lastUpdatedAt": "2026-07-21T12:00:00Z",
    "isLive": true,
    "stations": [
      {
        "sequence": 1,
        "stationCode": "JP",
        "scheduledDeparture": "...",
        "actualDeparture": "...",
        "delayDeparture": 5
      },
      ...
    ]
  }
}
```

### Significant Fields
- **`currentLocation.segmentProgress`**: A fractional value representing the physical progress of the train between `previousHalt` and `nextHalt`. This is the most crucial field distinguishing RailRadar from generic NTES, as it represents a 1-dimensional interpolation along the track segment.
- **`status`**: Operational state of the train (e.g. `running`, `cancelled`).
- **`lastUpdatedAt`**: The timestamp of the last telemetry or calculation update.
- **`previousHalt` / `nextHalt`**: The bounding stations.

### Observed Limitations
- **No Continuous Telemetry**: The provider does *not* expose raw 2D GPS coordinates (latitude, longitude) or heading (bearing degrees).
- **Interpolated Progress**: The derivation of `segmentProgress` by the upstream provider has not been independently verified. It is treated as an opaque upstream scalar.

### Inferred Assumptions
- If `segmentProgress` is provided, we assume it correlates linearly with the physical track distance between the bounding stations.
- The absence of `isActualPosition` requires us to assume that all real-time updates are provider-inferred based on their own unknown confidence threshold.

### Ignored Fields
- `coachPosition`: Details regarding train consist layout are discarded as they do not affect safety or geographic awareness.
- `arrivalDay` / `departureDay`: Used for scheduling; discarded as we only care about absolute temporal state.
- `platform`: Ignored.

### Mapping into TrainObservation
The one-dimensional railway observation (`segmentProgress` between two `stationCode`s) is mapped directly into our `TrainObservation` domain model. RailAware then takes ownership of projecting this 1D position onto a 2D `EstimatedTrainState` using our offline track geometries. This confirms the resilience of the provider-independent architecture: we decouple the provider's specific interpolation from our geographic engine.
