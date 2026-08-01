# RailAware API Documentation

All endpoints are strictly separated by the level of certainty and authorization of the data they provide.

---

## 1. Spatial Awareness Endpoint

The core spatial engine that resolves physical track infrastructure around a user.

- **Method**: `POST`
- **Path**: `/api/v1/awareness`
- **Description**: This endpoint guarantees physical ground truth based on topological map data (OpenStreetMap/Overpass). It will return known physical tracks, stations, and legal crossings within a 300-meter radius. It does **not** know or guarantee anything about actual trains.

### Request Body
```json
{
  "lat": 28.6427,
  "lng": 77.2197
}
```

### Example Response
```json
{
  "nearbyTracks": [
    {
      "id": "1317674192-77366984",
      "crossTrackDistanceMetres": 12.5,
      "side": "unknown",
      "geometry": [
        { "lat": 28.6428, "lng": 77.2198 }
      ]
    }
  ],
  "nearestCrossing": null,
  "nearestStation": null,
  "disclaimer": "RailAware provides situational awareness based on public data. It is NOT a substitute for visual confirmation. Always obey local safety signals."
}
```

---

## 2. Scheduled Services Endpoint

- **Method**: `GET`
- **Path**: `/api/v1/schedule/corridor/:id`
- **Description**: Returns published static timetable schedules for a given corridor ID (resolved via `/api/v1/awareness`).
- **Safety Note**: This endpoint strictly provides scheduled intention. It explicitly **never implies live position** or realtime delays. If a train is scheduled at 10:00 AM, it guarantees only that it is published to arrive at that time, not that the physical track is clear or occupied.

### Example Response
```json
{
  "corridorId": "1317674192-77366984",
  "retrievedAt": "2026-08-01T17:28:00.000Z",
  "scheduledServices": [
    {
      "trainNumber": "12004",
      "trainName": "Shatabdi Express",
      "scheduledDeparture": {
        "station": "NDLS",
        "time": "10:20"
      },
      "scheduledArrival": {
        "station": "LKO",
        "time": "10:15"
      },
      "source": {
        "type": "published_timetable",
        "live": false
      }
    }
  ],
  "status": "success"
}
```

---

## 3. Observation / Research Endpoint

- **Method**: `POST`
- **Path**: `/api/v1/observation`
- **Description**: Experimental research-tier endpoint designed to aggregate third-party train location providers and assess confidence.
- **Safety Note**: This is **explicitly experimental**. It outputs probabilistic location scoring (HIGH/MEDIUM/LOW/UNASSESSED) and must never gate the core safety presentation. It cannot guarantee train presence or absence.

### Request Body
*Example response shape. Field values below are illustrative placeholders,
not real captured data. The presence of a `trains` array does not imply
that live train positions are available or authoritative — see this
project's non-capabilities statement in the README.*
```json
{
  "lat": 28.6427,
  "lng": 77.2197,
  "corridorId": "1317674192-77366984"
}
```

### Example Response
```json
{
  "observation": null,
  "confidence": {
    "level": "UNASSESSED",
    "score": 0,
    "reasons": []
  },
  "awareness": null,
  "assistance": null,
  "trains": [
      {
        "trainNumber": "12004",
        "trainName": "UNKNOWN",
        "status": "EXPERIMENTAL_DATA_NO_LIVE_POSITIONS",
        "distance": null,
        "lastUpdated": null
      }
  ],
  "error": null
}
```
