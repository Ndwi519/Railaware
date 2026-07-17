# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-10

### Added
- Complete Topological Position Model (ADR-008) for accurate railway proximity tracking.
- Cascading Station Resolution Engine (ADR-009) to reliably determine bounding stations.
- Emergency Mode UI overlay to ensure immediate user awareness during CRITICAL and HIGH risk states.
- Developer Diagnostics panel for real-time pipeline monitoring during field validation.
- Extensive unit and integration test coverage across the Risk Engine, Corridor Resolver, and RailRadar Provider.
- Rate limiting and Content Security Policies (CSP) to ensure API safety and security.
- Comprehensive documentation including API Contracts, Architecture Decisions, and Testing Guides.

### Changed
- Transitioned from Phase 0 mock and Euclidean distance data to verified empirical geometry based on OpenStreetMap and Overpass API.
- Replaced heuristic assumptions with `UNRESOLVED` states to guarantee 'safety by omission' is never violated.
- UI terminology updated to reflect exact empirical data limits instead of implying unwarranted confidence.
