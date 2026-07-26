"use strict";

const { deepFreeze } = require("../application/utils/deepFreeze.js");

/**
 * @module models/CorridorResolutionResult
 *
 * @purpose An internal orchestration contract that encapsulates the result of corridor
 * projection, graph assembly, and station matching. It acts as the immutable boundary
 * between the `CorridorResolver` and the `Routing Pipeline`.
 *
 * @ownership Created and owned by `CorridorResolver`. Consumed by `TrainDiscoveryService`
 * and passed into the downstream routing components (`DirectionalInference`, `BranchEvidenceBuilder`, etc.).
 *
 * @internal This is strictly an internal orchestration contract. It MUST NEVER be
 * serialized directly through the public API or leaked onto user-facing payloads.
 *
 * @immutability
 * - `nearestCorridor`, `projectionResult`, and `stationsOutput` (DTOs) are recursively frozen using `deepFreeze`.
 * - `assembledCorridor` is intentionally left untouched because it is a domain object. Its immutability comes from private `#fields`, its own constructor-level `Object.freeze(this)`, and encapsulation.
 *
 * @relationships
 * - Generated after `ResolverResponseFactory` wraps the basic graph-relative metrics.
 * - `TrainDiscoveryService` evaluates its contents to construct the `RouteContext`.
 * - It serves as a precursor to `RoutingPipelineResult`, which ultimately logs the routing decisions.
 */
class CorridorResolutionResult {
  /**
   * @param {Object} args
   * @param {Object} args.nearestCorridor - (Required) Graph-relative metrics & station matching results.
   * @param {Object} [args.projectionResult=null] - (Optional) Internal mathematical projection data.
   * @param {Object} [args.assembledCorridor=null] - (Optional) Internal physical graph topology data.
   * @param {Array} [args.stationsOutput=null] - (Optional) Internal geometric station matching data.
   */
  constructor({ nearestCorridor, projectionResult, assembledCorridor, stationsOutput } = {}) {
    if (!nearestCorridor) {
      throw new Error("CorridorResolutionResult requires nearestCorridor");
    }

    this.nearestCorridor = deepFreeze(nearestCorridor);
    this.projectionResult = deepFreeze(projectionResult ?? null);
    // AssembledCorridor is a domain object rather than a DTO.
    // deepFreeze intentionally skips class instances (see deepFreeze.js),
    // so immutability is enforced by AssembledCorridor itself via its
    // constructor and private (#) fields.
    this.assembledCorridor = assembledCorridor ?? null;
    this.stationsOutput = deepFreeze(stationsOutput ?? null);

    Object.freeze(this);
  }
}

module.exports = { CorridorResolutionResult };
