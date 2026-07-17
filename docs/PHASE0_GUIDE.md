# Phase 0 Guide

## Purpose
Phase 0 validation is a mandatory blocker before finishing the RailRadar provider implementation. It exists to guarantee that we do not build safety-critical logic on top of assumed, unverified API schemas.

## How to Run
\`\`\`bash
npm run phase0
\`\`\`

## What it Does
1. **Validates Credentials:** Confirms the RailRadar key works.
2. **Schema Inspection:** Samples a bounding box and verifies the exact structure of the train array returned.
3. **Rate Limits:** Observes response headers or behavior to establish actual rate limits.

## Next Steps
When Phase 0 completes successfully and the output schema is observed:
1. Update \`packages/provider/src/railradar.ts\` to parse the actual JSON.
2. Remove the "Requires Phase 0 validation" TODOs.
3. The rest of the platform (already built) will immediately function.
