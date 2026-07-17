# RailAware Architecture

RailAware utilizes a strictly delineated client/server architecture, enforcing hard boundaries between infrastructure adapters, external providers, the deterministic state machine, and the user interface.

## 1. Overall Request Flow
The core request pipeline originates from the user GPS location (`/api/v1/observation`):

1. **Client** (Next.js/React): Triggers an observation request with GPS coordinates.
2. **API Layer** (Express): Maps incoming REST requests to the `RailAwareService`.
3. **TrainDiscoveryService**: Orchestrates the backend discovery logic.
   - Invokes **CorridorResolver** to query Overpass API.
   - If a topological corridor is found, invokes **StationResolutionEngine** to extract bounding stations.
   - If bounding stations exist, queries the **RailRadarProvider** for live trains on that corridor segment.
4. **RailRadarProviderInterpreter**: Normalizes the proprietary RailRadar data into standardized deterministic domain objects (`Observation`).
5. **InMemoryObservationStore**: Safely caches the latest state.
6. **RailAwareConfidenceEngine**: Analyzes the observation to assign a data confidence score based on recency and completeness.
7. **RailAwareRiskEngine**: Evaluates the observation and its confidence to calculate absolute physical risk to the user.
8. **RailAwareRecommendationEngine**: Converts the abstract risk score into actionable safety directives.
9. **LegacyApiMapper**: Serializes the engines' outputs back into the API contract.

## 2. Component Responsibilities

### Domain Orchestrators
- **RailAwareService**: The primary facade connecting the HTTP layer to the domain.
- **TrainDiscoveryService**: The central coordinator that orchestrates discovering topology (`CorridorResolver`), bounding stations (`StationResolutionEngine`), and live trains (`RailRadarProvider`).
- **InMemoryObservationStore**: A stateful in-memory cache retaining recent `Observation` entities.

### Engines (Business Logic / Stateless)
- **RailAwareConfidenceEngine**: Determines how much trust the system should place in the data.
- **RailAwareRiskEngine**: An exact implementation of the project's Core Risk Engine. It is NOT an additional abstraction layer; it is the sole arbiter of "Safety by Omission." It maps `Observation` to `RiskLevel`.
- **RailAwareRecommendationEngine**: Translates `RiskLevel` into human-readable instructions.
- **StationResolutionEngine**: A pluggable engine that cascades through configured strategies to bind arbitrary topologies to physical station identifiers.
  - **OsmRouteRelationsStrategy**: Extracts station refs from OSM route relations.
  - **OsmRelationMembersStrategy**: Extracts station refs from generic OSM relation members.
  - **RailRadarRouteGeometryStrategy**: Stubbed strategy for provider route geometry.
  - **OfflineGraphStrategy**: Stubbed strategy for a proprietary dataset.

### Infrastructure & Providers (Stateful/Adapters)
- **RailRadarProvider**: The strict sandbox that communicates with the RailRadar API. The rest of the application must never know its endpoints.
- **RailRadarProviderInterpreter**: The translation layer mapping RailRadar schemas to our strict domain models.
- **LegacyApiMapper**: The serialization layer standardizing the output for the React frontend.

## 3. Dependency Relationships
- The **Domain** (Risk Engine, Confidence Engine, Recommendation Engine) has **NO dependencies** on infrastructure, providers, or Express.
- The **TrainDiscoveryService** relies on abstract interfaces (implemented by `CorridorResolver` and `StationResolutionEngine`).
- The **RailRadarProvider** is entirely independent of the core domain and merely outputs plain JSON arrays which the `Interpreter` parses.

## 4. Statefulness
- **Stateful**: `InMemoryObservationStore` (Observation Cache), `OverpassClient` (Cache & In-Flight Coalescing map).
- **Stateless**: Risk, Confidence, and Recommendation Engines, Mappers, Express routes.
