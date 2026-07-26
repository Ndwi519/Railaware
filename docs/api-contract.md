# API Contract

This document serves as the single source of truth for the communication contract between the RailAware frontend and backend.

## 1. Actual Backend Schema
*(Emitted directly by `RailAwareService.js` domain engines)*

```typescript
type BackendResponse = {
  observation: {
    id: string;
    train: {
      number: string;
      name?: string;
      startDate?: string;
    };
    status: string; // 'UNKNOWN' | 'RUNNING' | 'CANCELLED' | 'NOT_STARTED' | etc.
    currentSegment: {
      previousStation: { code: string; name?: string };
      nextStation?: { code: string; name?: string } | null;
    } | null;
    segmentProgress: number | null;
    isActualPosition: boolean;
    delayMinutes: number | null;
    lastUpdatedAt: string | Date | null;
    recordedAt: string | Date;
    validationErrors: string[];
  } | null;
  confidence: {
    level: string; // 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH'
    topologyConfidence: string;
    observationConfidence: string;
    providerReliability: string;
    reasons: string[];
    assessedAt: string | Date;
  } | null;
  awareness: {
    status: string; // 'UNKNOWN' | 'AT_STATION' | 'APPROACHING_STATION' | 'DISTANT' | 'CANCELLED' | 'NO_TRAINS_FOUND'. This remains the canonical awareness state.
    trainAlongTrackDistanceMetres: number | null;
    userAlongTrackDistanceMetres: number | null;
    distanceMetres: number | null;
    direction: string | null;
    approaching: boolean | null;
    confidence: string; // 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH'
    lastUpdatedAt: string | Date | null;
    explanation: string;
    requiresProminentDisplay: boolean; // A derived backend-owned presentation semantic used only to simplify presentation logic.
  } | null;
  discoveryContext: {
    trainTarget: string | null;
    journey: any | null;
    corridor: {
      corridorGeometry?: Array<{ lat: number, lng: number }>;
      userSegmentFraction?: number;
      segmentLengthKm?: number;
      nearestBoundingStations?: { from: string, to: string } | null;
      resolutionStatus: string; // 'RESOLVED' | 'UNRESOLVED'
      stationResolutionDetails?: any;
    } | null;
    discoveredTrains: Array<{ id: string }> | null; // Actual trains returned by provider
    providerError: string | null;
    strategyDiagnostics: Array<any>;
    trace?: { stages: Array<any>; startTime?: number };
  } | null;
  assistance: {
    emergencyContact: {
      number: string;
      description: string;
    } | null;
    guidance: {
      title: string;
      instructions: string[];
    };
    availableActions: Array<'DIAL_EMERGENCY'>;
  } | null;
}
```

## 2. API Semantics

### awareness.status
This field remains the **canonical awareness state**. All downstream clients must rely on `awareness.status` for determining proximity logic and safety state.

### awareness.requiresProminentDisplay
This is a **derived backend-owned presentation semantic**. It evaluates to `true` when the user needs immediate visual alerting (e.g., status is `APPROACHING_STATION` or `AT_STATION`). The frontend overlay is strictly driven by this boolean, completely decoupling the UI from raw status evaluation.

### discoveryContext.discoveredTrains
To satisfy Non-Negotiable Rule 10 (never communicate safety by omission), the API contract strictly distinguishes between unattempted train discovery and a verified empty discovery:

| `discoveredTrains` | Meaning | Action / Interpretation |
| :--- | :--- | :--- |
| `null` | Discovery not attempted OR failed | Do not assume safety. Show uncertainty. |
| `[]` | Discovery attempted, no trains found | Verified zero trains. |
| Populated Array | Discovery attempted, trains found | Verified active trains nearby. |

### discoveryContext.providerError
In a scenario where train discovery is attempted but the provider fails (e.g., due to rate limit, timeout, network error, or malformed data):
- The returned `discoveryContext` preserves the exact structure as a successful payload.
- The `discoveryContext.discoveredTrains` property (along with other unused context fields) MUST be explicitly set to `null`.
- The `discoveryContext.providerError` property will be populated with the error message.
- A client must interpret this `null` state as **unknown** rather than "no trains" and show an appropriate error / unavailable banner.
