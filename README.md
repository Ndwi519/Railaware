# RailAware

RailAware is an evidence-based, safety-critical mobile companion app designed to provide real-time situational awareness for individuals operating near Indian Railways infrastructure.

## Core Philosophy: Evidence-Driven Safety
RailAware adheres to a non-negotiable set of engineering principles (see [AGENTS.md](AGENTS.md)). The most critical rule defines: **Never communicate safety by omission.** If the system cannot prove a track is clear, the implementation degrades to a conservative `UNRESOLVED` state rather than risk a false negative.

## Architecture
RailAware leverages a **Topological Position Model** (ADR-008). Because raw GPS coordinates lack semantic meaning in rail safety, the backend snaps all user locations to the nearest known OpenStreetMap railway geometry, calculating progress along that topological segment.

The implementation invokes a **Cascading Station Resolution Engine** (ADR-009) to resolve track geometry into official Indian Railways station pairs, which the risk engine then uses to query provider data.

RailAware utilizes a **Client/Server Architecture** ([ADR-001](docs/architecture/decisions/ADR-001-client-server.md)).

### Components
- **`client/`**: The React/Vite frontend (PWA) displaying Leaflet maps and Risk Assessments.
- **`server/`**: The Express Node.js backend executing deterministic risk logic.
  - `observation-engine`: Deterministic state machine managing pipeline phases.
  - `corridor-resolver`: Snaps raw GPS to OpenStreetMap topology.
  - `station-resolution-engine`: Resolves topological bounds into station codes.
  - `risk-engine`: Evaluates real-time threat levels.
  - `provider`: RailRadar API integration.

## Getting Started

### Prerequisites
- Node.js (v20+)
- npm
- An active `RAILRADAR_KEY`

### Setup
1. Clone the repository.
2. Run `npm install` from the root, which will install both client and server dependencies.
3. Copy `.env.example` to `.env` and configure your API keys.

### Running Locally
```bash
npm run dev
```
This will launch both the Express Backend (Port 3001) and the Vite Frontend (Port 5173).

## Developer Diagnostics
When running in `development` mode, the UI exposes a **Developer Diagnostics Panel** via the gear icon in the top right. This panel allows you to spoof GPS locations and inspect the full observation pipeline state (Corridor Resolution, Station Resolution attempts, Provider freshness, and Risk calculation) without needing a physical device near a track.

## License
MIT
