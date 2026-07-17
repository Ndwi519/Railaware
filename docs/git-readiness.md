# Git Readiness Report (RailAware v1.0.0)

## Build Artifacts & Ignored Folders
The following directories should be actively ignored by version control to prevent repository bloating and leaking compiled assets:
- `client/node_modules/`
- `server/node_modules/`
- `client/dist/`
- `server/logs/` (and `.log` files)
- `.env`, `.env.local`

## Environment Files
The platform relies on external secrets that **MUST NOT** be committed.
- `RAILRADAR_API_KEY` (Required for provider integration)
- `OVERPASS_URL` (Optional override for corridor resolving)
- Ensure a `.env.example` is committed that lists these keys as empty templates.

## Recommended `.gitignore` Additions
Ensure the root `.gitignore` contains the following:
```
# Dependency directories
node_modules/
jspm_packages/

# Production builds
dist/
build/

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
server/execution.log
server/logs/

# Testing
coverage/

# IDEs and Editors
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

## Files to Commit
All files within the following core structural directories (minus the ignored entries above) are finalized and safe for tracking:
- `client/src/`
- `client/public/`
- `server/application/`
- `server/calculations/`
- `server/confidence-engine/`
- `server/corridor-resolver/`
- `server/domain/`
- `server/observation-store/`
- `server/provider/`
- `server/provider-railradar/`
- `server/recommendation-engine/`
- `server/risk-engine/`
- `server/station-resolution-engine/`
- `server/tests/`
- `docs/`
- `server.js` and all `package.json` config files.
