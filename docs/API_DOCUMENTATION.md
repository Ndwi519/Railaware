# API Documentation

Base Path: \`/api/v1\`

## Endpoints

### \`GET /health\`
Returns system health.
- **Response**: \`{ status: 'ok', timestamp: string }\`

### \`GET /observation\`
Returns the current deterministic observation state machine output.

### \`GET /railways\`
Returns nearby railway corridors resolved from Overpass/OSM.

### \`GET /trains\`
Returns raw (but parsed) train data from the provider.

### \`GET /risk\`
Returns the risk evaluation (confidence, explanations, actions).

### \`GET /diagnostics/phase0\`
Runs or returns the status of Phase 0 validation.
