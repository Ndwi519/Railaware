# API Contract Reconciliation (Sprint 10)

This document serves as the single source of truth for the communication contract between the RailAware frontend and backend.

## 1. Actual Backend Schema
*(Emitted by `LegacyApiMapper.js` after backend pipeline processing)*

```typescript
type BackendResponse = {
  observation: {
    trainId?: string; // Present if train targeted
    status: string; // 'unknown' | 'running' | 'cancelled' | etc.
    segmentProgress?: number | null;
    previousStation?: string | null;
    nextStation?: string | null;
    delayMinutes?: number | null;
    lastUpdatedAt?: string | null;
    nearbyTrains: Array<{ id: string }>; // Legacy fallback
  };
  risk: {
    level: string; // 'unknown' | 'safe' | 'elevated' | 'imminent'
    reasons: string[]; // Explanations for the risk
    explanation?: string; // Mapped from recommendation.directive
    recommendedAction?: string; // Mapped from recommendation.userAction
  };
  corridor: {
    corridorGeometry?: Array<{ lat: number, lng: number }>;
    userSegmentFraction?: number;
    segmentLengthKm?: number;
    nearestBoundingStations?: { from: string, to: string } | null;
    resolutionStatus: string; // 'RESOLVED' | 'UNRESOLVED'
    stationResolutionDetails?: any;
  } | null;
  trains: Array<{ id: string }>; // Actual trains returned by provider
  metadata: {
    providerError: string | null;
  }
}
```

## 2. Incompatibility Mapping Table

| Frontend Property Expected | True State | Resolution Strategy |
| :--- | :--- | :--- |
| `risk.recommendedAction` | **A** (Computed as `action` originally) | Mapped in `LegacyApiMapper.js` as `recommendedAction`. |
| `risk.explanation` | **A** (Computed as `directive`/`reasons`) | Mapped in `LegacyApiMapper.js` as `explanation` from `directive`. |
| `observation.trackPresence` | **C** (Intentionally Removed) | Removed from UI. Equivalent check is `!!corridor`. |
| `observation.providerStatus` | **A** (Available in `metadata`) | Handled in UI using `metadata.providerError != null`. |
| `observation.trainPresence` | **A** (Available via `trains`) | Handled in UI using `trains.length > 0`. |
| `observation.estimatedDistanceMeters` | **C** (Intentionally Removed) | Removed from UI (speculative prediction forbidden). |
| `observation.etaSeconds` | **C** (Intentionally Removed) | Removed from UI (speculative prediction forbidden). |

## 3. Justification for Removed Fields (State C)

The following fields were permanently removed from the UI contract because they directly violate the new Non-Negotiable Architectural Rules defined in Phase 1:

1. **`estimatedDistanceMeters`**: Requires deterministic train geometries and constant real-time speeds, which over-promises precision beyond what the provider actually guarantees. Replaced with generalized `risk.level` proximity (Imminent/Elevated).
2. **`etaSeconds`**: Predicting an ETA requires inventing a velocity model the provider does not supply. In a safety-critical application, predicting "5 minutes away" using mathematical guesses is inherently unsafe. We explicitly refuse to render ETA and now present "ETA: Unavailable".
3. **`trackPresence`**: Replaced implicitly by the presence of the `corridor` object itself. If a corridor is found near the GPS location, the user is adjacent to the track. Passing a redundant 'yes'/'no' string introduces state desynchronization.

## 4. Final Verified Contract
The frontend is now strictly bound only to data deterministically emitted by the actual provider engines and properly filtered through the mapper. All speculative fields have been successfully removed without silent deletion of UI cards.
