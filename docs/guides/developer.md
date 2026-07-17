# Developer Guide

Welcome to RailAware! This guide outlines the setup and workflow for contributing to the platform.

## Setup

1. **Install Dependencies**: `npm install`
2. **Environment Variables**: Copy `.env.example` to `.env`. You must provide a valid `RAILRADAR_KEY`. 
3. **Run Dev Server**: `npm run dev`

## Simulating Scenarios (Developer Diagnostics)

Since RailAware requires you to be physically near a railway track to trigger the Observation Engine, testing from a desk requires GPS simulation.

1. Start the dev server and open `http://localhost:5173`.
2. Click the gear icon in the top right corner to open the **Developer Diagnostics Panel**.
3. Click "ENABLE SIMULATION".
4. Click anywhere on the map near a railway line.
5. The map will instantly "snap" your location, and the right-hand panel will display the real-time API response from the local backend, including:
   - Corridor Resolver geometry and station resolution attempts.
   - Provider API freshness.
   - The final output of the Risk Engine.

## Testing Rules
- Every mathematical/topological change requires unit tests.
- Run `npm test` before committing.

## Architectural Rules
Read `AGENTS.md` before writing a single line of code. We prioritize correctness, explicitness, and safety over "clean" or clever code. If a provider endpoint is unknown, we do not guess its shape. We leave a blocker.
