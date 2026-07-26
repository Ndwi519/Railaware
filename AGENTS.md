# AGENTS.md — RailAware Permanent Engineering Rules

## Non-Negotiable Rules

1. Architecture before UI. Never build UI around unimplemented backend assumptions.
2. Every module has a single responsibility. No "god files."
3. Use the strongest practical typing and validation mechanisms supported by the chosen technology stack. For this project, JavaScript is the implementation language, so enforce correctness through strict module boundaries, schema validation, runtime validation, comprehensive testing, JSDoc where beneficial, and clear interfaces.
4. Every function has one purpose.
5. Every module is independently testable, with unit tests for every algorithm.
6. Never duplicate logic.
7. Never hardcode provider details — always behind the provider abstraction. **The rest of the application must never import RailRadar directly.** Only the provider package may know endpoints, authentication, response shapes, or rate limits. Replacing RailRadar with another provider should require changes only inside the provider package.
8. Never collapse unknown into false. Every nullable field exists for a reason; respect the Observation model exactly as specified in `BUILD_PROMPT.md`.
9. Do not fake APIs, invent endpoints, invent authentication schemes, or invent provider response shapes. If something is genuinely unknown pending Phase 0, leave a TODO stating precisely: **"Requires Phase 0 validation"** — not a guessed implementation.
10. **Never communicate safety by omission.** "We don't know" and "no train nearby" are different claims and must never collapse into the same message or code path. This rule takes precedence over all other engineering rules if a conflict arises.

---

## Engineering Decision Framework

Whenever multiple technically valid implementations exist, evaluate them in this priority order. Never sacrifice a higher priority to optimize a lower one:

1. Correctness
2. User safety
3. Explicit handling of uncertainty
4. Simplicity
5. Maintainability
6. Testability
7. Performance
8. Scalability

Examples: prefer explicit state machines over implicit boolean logic; prefer readable code over clever code; prefer maintainability over fewer lines of code; prefer provider independence over provider-specific optimizations.

---

## Do Not Over-Engineer

This project's specification is detailed enough that there's a real risk of over-architecting in response. Counter that explicitly:

- Do not introduce abstractions until at least two concrete use cases exist.
- Avoid unnecessary factories, repositories, service locators, dependency injection containers, or generic frameworks unless they solve an existing, demonstrated problem.
- Optimize for clarity over extensibility. A simple module that does one thing well beats a flexible one built for hypothetical future needs.

---

## Coding Conventions

- Prefer named exports over default exports.
- One component per file. One class (if any) per file.
- Prefer pure functions; avoid mutable global state.
- No side effects during module imports.

---

## Git Workflow

- One milestone per branch.
- One logical change per commit.
- Commit messages follow Conventional Commits.
- Do not mix refactoring and feature work in the same commit.

---

## Testing Philosophy

Coverage targets (see Code Quality below) say *how much* to test. This says *what matters most* — prioritize in this order:

1. Business logic
2. Geospatial calculations
3. State transitions (the known/unknown state machine especially)
4. awareness calculations
5. Provider adapters

Avoid excessive snapshot testing. Prefer deterministic tests over mocking where practical.

---

## Configuration Policy

- Environment-specific values (API keys, base URLs) belong in environment variables.
- Operational thresholds (noise thresholds, timeouts, cache TTLs) belong in configuration files.
- Business rules (e.g. the awareness-status escalation logic) belong in code.

Never mix the three — a business rule hidden in an environment variable, or an operational threshold hardcoded in business logic, is a Configuration Policy violation even if it technically works.

---

## Architecture Decision Records — Mandatory, Not Optional

Whenever an architectural decision changes the project in a non-trivial way, create an ADR. Each must include: Context, Decision, Alternatives considered, Trade-offs, Consequences. Do not silently change architecture — an undocumented deviation is treated the same as a rule violation.

---

## Dependency Policy

Before adding any dependency: (1) check whether the functionality already exists in the standard library or an already-approved dependency, (2) prefer well-maintained libraries with active communities, (3) avoid dependencies that solve only a few lines of code, (4) state why the dependency is necessary. Minimize dependency count.

---

## Performance Goals

- Initial page load < 2 MB.
- Time to interactive < 3s on a mid-range Android device.
- API response < 500ms when cache is warm.
- Corridor resolution target < 1s.

These are goals to design toward, not hard blockers for early milestones — but flag explicitly if a milestone's implementation is likely to miss one.

---

## Observability

Every backend service emits structured logs. Every unexpected error includes: timestamp, module, correlation/request ID, severity, and (server-side only) stack trace. No `console.log` in production code paths.

---

## Error Taxonomy

Use specific error types, not generic exceptions: `ConfigurationError`, `ProviderError`, `ValidationError`, `TopologyError`, `AwarenessEngineError`, `CacheError`, `NetworkError`. Each should carry enough context to be actionable in logs without needing to reproduce the failure.

---

## API Versioning

Prefix every endpoint with `/api/v1/`. Future breaking changes create `/api/v2/` rather than modifying v1's contract. Never silently break existing clients.

---

## Accessibility

Since this app is intended for use during emergencies, accessibility is a safety requirement, not a nice-to-have:
- Keyboard accessible.
- High-contrast mode available.
- Screen reader labels on all status/warning content.
- Color is never the only indicator of danger — danger states use text + icon + color together.

---

## Security & Privacy

Since this application handles GPS location data:

- Do not persist GPS history — only the current position needed for the active session.
- Request only the minimum permissions required (location; notifications only if the user opts in).
- Never send location data to third parties except the configured train-data provider and explicitly user-selected emergency contacts.
- Keep all secrets (API keys, etc.) in environment variables, never committed to the repository.
- Validate all external input, including anything returned by the train-data provider before it's trusted downstream.

---

## Definition of Done

A milestone is complete only if all of the following hold — do not report a milestone finished otherwise:

- Code compiles with no errors.
- Lint passes.
- Tests pass.
- Documentation for that milestone is updated (not deferred to "later").
- No TODOs remain except approved "Requires Phase 0 validation" blockers.
- Public interfaces are documented.
- Example usage is provided where appropriate (e.g. how to call a new package's exported functions).

---

## Code Quality

- Every file states its purpose, responsibility, dependencies, and public API at the top.
- No dead code. No TODOs except genuine external blockers explicitly marked "Requires Phase 0 validation" (or equivalent).
- No magic numbers — configuration lives in config files.
- Target 90%+ test coverage: unit, integration, fixture-based, and Playwright E2E where applicable.

---

## Documentation

Generate and keep current: README, architecture doc, API docs, per-package docs, developer guide, deployment guide, testing guide, Phase 0 guide, contribution guide, and ADRs for any non-obvious design choice — especially anywhere a Non-Negotiable Rule shaped the implementation.

---

## Critical Requirements (repeated because they matter most)

Never invent APIs, provider responses, endpoints, or authentication schemes. Never remove uncertainty that the data doesn't support removing. Never silently modify the architecture defined in `BUILD_PROMPT.md`. When something is genuinely unknown pending external validation, say so explicitly rather than filling the gap with a plausible guess.
