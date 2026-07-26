# Prototype Session Lifecycle

## Overview
During the prototype phase of the RailAware routing pipeline, the system utilizes a simplified session lifecycle to manage stateful trajectory observations. This document explains the design decisions, expected behavior, and limitations of this approach.

## Client Behavior
The frontend `ObservationService` is responsible for capturing the initial session identifier returned by the backend (`x-session-id` header).
Once this identifier is acquired, the client intentionally retains it for the lifetime of the application session and does **not** replace it if the server subsequently returns a new one.

### Why this is acceptable in Shadow Mode
The routing pipeline currently operates in **Shadow Mode**, meaning the trajectory and movement inferences are computed but do not drive the final, authoritative user-facing awareness status (which relies on legacy station resolution). Because this is an experimental evaluation phase, robust session renegotiation, authentication, or persistent syncing mechanisms are deliberately deferred. The prototype focuses strictly on validating trajectory aggregation logic under simulated bounds.

## Server Behavior
The backend `TrajectoryManager` implements an in-memory, bounded LRU (Least Recently Used) cache to store active session trajectories.

### Temporary Degradation on Session Eviction or Restart
If the server restarts, or if an active session is evicted due to the LRU capacity limit being reached, the server's record of that trajectory is permanently lost.
However, because the client continues sending the previously acquired session identifier, the server will simply recreate a new, empty trajectory mapped to that same identifier.

**The only behavioral consequence of this is temporary degradation:**
- The `DirectionalInference` engine will evaluate the new, single-observation trajectory and return `INSUFFICIENT_HISTORY`.
- As the client continues to transmit new location updates, the trajectory will rebuild over a short period until enough observations are collected to resume accurate movement state calculation (`MOVING`, `STATIONARY`, etc.).

### Cross-Session Contamination Is Impossible
Because every request requires an explicit session identifier, and the backend maintains a strict 1-to-1 mapping of `sessionId` to `SessionTrajectory`, no two users can ever share or contaminate the same trajectory history. A fresh observation against an evicted or unrecognized session identifier unambiguously results in a fresh, isolated trajectory for that identifier.

## Constraints
- **No Automatic Renegotiation:** The client will not discard its local session identifier to match a new server-issued one mid-session.
- **No Expiration Protocols:** Sessions do not have time-based TTLs; they expire strictly via LRU eviction under memory constraints.
- **No Authentication:** The prototype relies purely on the opaque `x-session-id` header for state correlation.
