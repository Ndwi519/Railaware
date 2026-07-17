# RailAware Developer Guide

## Getting Started

1. Clone the repository.
2. Ensure Node.js 20+ and npm 10+ are installed.
3. Run \`npm install\`.
4. Copy \`.env.example\` to \`.env\` and populate variables.
5. Run \`npm run dev\` to start all services in parallel.

## Turborepo Commands
- \`npm run build\` - Build all apps and packages
- \`npm run test\` - Run Vitest across all packages
- \`npm run lint\` - Run ESLint
- \`npm run phase0\` - Execute the Phase 0 validation tooling

## Rules
Please refer strictly to \`AGENTS.md\` for all non-negotiable architectural and safety rules before making any changes.
