# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Shadow Mode Validation Harness executing deterministic synthetic movement scenarios.
- Regression test coverage for conservative branch retention and topological bounding stations.

### Fixed
- **Defect-001**: Restored the `TrajectoryObservation` contract (`latitude`/`longitude`) inside `TrainDiscoveryService`.
- **Defect-002**: Ensured `station-matcher` retains necessary topological properties (`corridorSegmentIndex`) to allow `RouteContextBuilder` to determine bounding stations correctly.
- **Defect-003**: Implemented a conservative branch retention fallback in `RouteSelection` to prevent `AMBIGUOUS` routing states on curves.
- **Defect-004**: Secured the architectural boundary in `ResolverResponseFactory` by implementing a strict whitelist to prevent internal routing metadata from leaking into the public station DTO.

## [1.0.0] - 2026-07-10

### Added
- Complete Topological Position Model (ADR-008) for accurate railway proximity tracking.
- Cascading Station Resolution Engine (ADR-009) to reliably determine bounding stations.
- Emergency Mode UI overlay to ensure immediate user awareness during CRITICAL and HIGH awareness states.
- Developer Diagnostics panel for real-time pipeline monitoring during field validation.
- Extensive unit and integration test coverage across the Awareness Engine, Corridor Resolver, and RailRadar Provider.
- Rate limiting and Content Security Policies (CSP) to ensure API safety and security.
- Comprehensive documentation including API Contracts, Architecture Decisions, and Testing Guides.

### Changed
- Transitioned from Phase 0 mock and Euclidean distance data to verified empirical geometry based on OpenStreetMap and Overpass API.
- Replaced heuristic assumptions with `UNRESOLVED` states to guarantee 'safety by omission' is never violated.
- UI terminology updated to reflect exact empirical data limits instead of implying unwarranted confidence.
