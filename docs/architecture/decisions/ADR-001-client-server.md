# ADR-001: Client/Server Repository Architecture

## Context
RailAware requires a frontend client (for displaying maps, risk assessments, and GPS coordinates) and a backend service (for proxying RailRadar requests, caching, and executing deterministic risk algorithms). The repository was originally structured as a Turborepo, but the complexity was unnecessary for a simple two-tier application.

## Decision
We transitioned the repository to a straightforward Client/Server architecture:
- `client/`: A Vite/React application.
- `server/`: An Express/Node.js application.

## Alternatives Considered
- **Turborepo with Shared Packages:** Originally utilized, but it introduced heavy symlinking overhead and package management friction for a project that fundamentally only needed an API and a UI.
- **Next.js Fullstack:** Next.js API routes were considered, but a dedicated Express server allowed for easier lifecycle management of the `InMemoryObservationStore` and in-flight request coalescing logic.

## Trade-offs
- **Pros:** Drastically simplified dependency installation; distinct environment boundary between frontend and backend.
- **Cons:** Shared code (such as TypeScript interfaces or common algorithms) must be duplicated or extracted carefully between the two independent roots.

## Consequences
- `npm run dev` now utilizes `concurrently` to launch both `client` and `server` sequentially from the root without complex workspace tooling.
