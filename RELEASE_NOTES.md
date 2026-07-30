# RailAware v1.0 Release Notes

## Release
**Version:** 1.0.0

**Release Status:** Approved for Release

---

## Summary

RailAware v1.0 completes the migration from prototype infrastructure to the production-oriented architecture defined during the engineering certification process.

The release introduces a controlled API serialization boundary, configurable persistent observation storage, calibrated routing constraints, and completes the transition to the Graph Foundation routing pipeline while preserving compatibility with the existing application architecture.

---

## Major Changes

### API

- Introduced `ApplicationMapper`
- Controllers now return DTOs rather than internal application objects
- Internal routing context is no longer serialized

### Persistence

- Added `RedisObservationStore`
- Dependency Injection selects persistent storage when configured
- Existing in-memory implementation retained for development and testing

### Routing

- Graph Foundation is the authoritative routing implementation
- Transitional duplicate routing logic removed
- RouteContextBuilder now drives corridor mapping

### Geometric Projection

- Projection constraints calibrated
- Geometric fallback enabled through configuration

### Evaluation Framework

- Evaluation endpoints disabled in production
- Development tooling preserved for local and CI environments

---

## Validation

Completed validation includes:

- Unit tests
- Integration tests
- ValidationHarness execution
- API contract verification
- Dependency injection verification
- Routing verification

---

## Compatibility

No intentional breaking changes to the public API were introduced.

---

## Known Operational Requirements

Production deployments should provide:

- REDIS_URL (recommended for persistent observation storage)
- RAILRADAR_KEY
- Remaining documented environment variables

---

## Final Status

The repository has completed engineering certification and implementation verification.

**Release Status:** Approved for Release

**Version:** v1.0.0
