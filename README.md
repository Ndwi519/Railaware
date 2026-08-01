# RailAware

## Problem Statement

RailAware was built in response to a real-world incident involving an emergency stop and evacuation onto active train tracks at night. In that situation, passengers had to make a safety-critical decision about their physical surroundings with zero information about that environment. The problem was not simply "we didn't know where the train was"; it was that people were forced to guess whether an adjacent track was safe or dangerous with no contextual awareness.

## Capabilities

RailAware is designed to provide immediate situational awareness to passengers. Its current capabilities include:
- **Nearby Track Detection**: Identifying the number and distance of nearby railway tracks.
- **Nearest Legal Crossing**: Finding the closest safe pedestrian crossing or underpass.
- **Nearest Station**: Identifying the closest railway station to the user's location.
- **Scheduled Services**: Displaying expected trains on nearby corridors (explicitly timetable-derived, not live tracking).
- **Guided Emergency Instructions**: Actionable safety advice for passengers who are near active tracks.
- **Offline Resilience**: Essential safety guidance remains available without a network connection for previously-visited locations using Progressive Web App (PWA) caching.

## Non-Capabilities

> RailAware intentionally does not claim to detect or predict approaching trains. Based on the investigation documented in this project's history, no authoritative, public, location-based live train-position data source exists for Indian Railways today. Rather than approximate or imply certainty the available evidence doesn't support, the application is scoped to what it can honestly know.

## Architecture Overview

- **Backend Spatial Pipeline**: The system pulls spatial data via Overpass API, builds a local corridor graph, resolves tracks into logical corridors through a clustering algorithm, and assembles them into coherent routes.
- **Three-Endpoint Separation**: The backend cleanly separates its API into three distinct domains:
  - `/api/v1/awareness`: The core spatial awareness engine (tracks, crossings).
  - `/api/v1/schedule/corridor/:id`: Timetable-based scheduled services.
  - `/api/v1/observation`: A research-tier endpoint for probabilistic position observations.
- **Frontend Data Flow**: The client architecture strictly separates raw GPS position data from smoothed location coordinates, ensuring the safety-critical presentation state remains robust against transient location jitter.
- **Service Worker / Offline Layer**: The frontend employs a robust Service Worker strategy that caches spatial payload data. When a true network failure occurs, the cache acts as a seamless fallback, rendering an explicit offline banner to clearly indicate the staleness of the data.
- **Provider Abstraction**: Data from external providers (e.g., RailRadar) is tightly encapsulated behind a robust provider abstraction. The core system remains entirely provider-agnostic.

For a detailed view, see the [Architecture Documentation](docs/ARCHITECTURE.md).

## Safety Principles

- Never claim more certainty than the evidence supports.
- Never combine independent uncertainty signals into a single misleading score.
- Never let cached/offline data masquerade as live data.
- Never let a real backend error be silently replaced with stale cached data — only genuine connectivity failure triggers cache fallback.
- Research/exploratory work never gates or destabilizes the verified product path.

## How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Environment Setup
Create a `.env` file in the `server` directory. The application can run using mock fixtures if external provider credentials are not available.

### Starting the Application

1. **Start the Backend Server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start the Frontend Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

The client will be available at `http://localhost:5173` and will proxy requests to the backend API running on `http://localhost:3001`.
