# Testing Guide

## Philosophy
Coverage targets (90%+) say *how much* to test. This says *what matters most*:
1. Business logic
2. Geospatial calculations
3. State transitions (the known/unknown state machine especially)
4. Risk calculations
5. Provider adapters

## Running Tests
To run all tests across the workspace:
\`\`\`bash
npm run test
\`\`\`

To test a specific package:
\`\`\`bash
cd packages/calculations
npm run test
\`\`\`
