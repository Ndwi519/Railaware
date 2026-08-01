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
      "id": 1317674192,
      "type": "way",
      "distance": 12.5,
      "point": { "lat": 28.6428, "lon": 77.2198 },
      "tags": { "railway": "rail", "usage": "main" }
    }
  ],
  "nearestCrossing": {
    "distance": 150,
    "point": { "lat": 28.644, "lon": 77.221 }
  },
  "discoveryContext": {
    "gridReference": "28.645_77.220",
    "corridor": { "id": "1317674192-77366984" }
  },
  "awareness": {
    "status": "TRACKS_NEARBY",
    "distanceMetres": 12.5
  }
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
  "scheduledServices": [
    {
      "trainNumber": "12004",
      "trainName": "Shatabdi Express",
      "direction": "SOUTHBOUND",
      "scheduledArrival": "10:15:00",
      "scheduledDeparture": "10:20:00",
      "sourceStation": "NDLS",
      "destinationStation": "LKO"
    }
  ]
}
```

---

## 3. Observation / Research Endpoint

- **Method**: `POST`
- **Path**: `/api/v1/observation`
- **Description**: Experimental research-tier endpoint designed to aggregate third-party train location providers and assess confidence.
- **Safety Note**: This is **explicitly experimental**. It outputs probabilistic location scoring (HIGH/MEDIUM/LOW/UNASSESSED) and must never gate the core safety presentation. It cannot guarantee train presence or absence.

### Request Body
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
  "confidence": {
    "observationConfidence": "UNASSESSED",
    "providerReliability": "UNKNOWN",
    "topologyConfidence": "UNKNOWN"
  },
  "liveTrains": [
    {
      "id": "12004",
      "lat": 28.6500,
      "lng": 77.2100,
      "provider": "MockProvider"
    }
  ]
}
```
