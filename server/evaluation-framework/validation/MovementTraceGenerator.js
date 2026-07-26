const { haversineMetres } = require('../../calculations/haversine.js');

const DETERMINISTIC_NOISE_OFFSETS = [
  { dLat: 0, dLng: 0 },
  { dLat: 0.00003, dLng: 0 },         // ~3m North
  { dLat: 0, dLng: -0.00004 },        // ~4m West
  { dLat: 0.00005, dLng: 0.00005 },   // ~7m Northeast
  { dLat: -0.00002, dLng: -0.00002 }  // ~3m Southwest
];

class MovementTraceGenerator {
  /**
   * Generates a deterministic sequence of GPS ticks along an AssembledCorridor.
   *
   * @param {Object} options
   * @param {Object} options.assembledCorridor The resolved corridor graph
   * @param {number} options.startSegmentIndex Segment to start on
   * @param {number} options.startDistance Initial distance along segment in metres
   * @param {number} options.tickCount Number of ticks to generate
   * @param {number} options.speedMetresPerTick Metres to move per tick
   * @param {boolean} options.isForward Move forward along the segment geometry
   * @param {boolean} options.applyNoise Apply deterministic noise
   * @param {number} [options.preferredBranchId] Branch ID to favor when traversing branch nodes
   * @param {Function} [options.branchSelector] Custom selector for resolving branches when preferredBranchId is not met
   * @returns {Array<{ timestamp: number, lat: number, lng: number, tickIndex: number, expectedBranchId: number, expectedSegmentIndex: number }>}
   */
  static generateTrace(options) {
    const {
      assembledCorridor,
      startSegmentIndex,
      startDistance,
      tickCount,
      speedMetresPerTick,
      isForward,
      applyNoise = false,
      preferredBranchId,
      branchSelector
    } = options;

    const segments = assembledCorridor.getTraversableSegments();
    let currentSegIdx = startSegmentIndex;
    let currentSegDistance = startDistance;

    const ticks = [];
    let baseTime = 1672531200000; // Jan 1, 2023 deterministic start

    for (let i = 0; i < tickCount; i++) {
      let coords = this._getPointAtDistance(segments[currentSegIdx], currentSegDistance);

      // If we've run off the segment, attempt to jump to the connected segment
      while (!coords) {
        const connected = assembledCorridor.getConnectedSegments(
          currentSegIdx,
          isForward ? true : false
        );

        if (connected.length === 0) {
          // Terminal point reached, clamp to end of segment
          coords = this._getPointAtDistance(
            segments[currentSegIdx],
            isForward ? this._getSegmentLength(segments[currentSegIdx]) : 0
          );
          if (!coords) throw new Error("Could not extract coords at boundary.");
          break; // Stop trying to advance segments
        } else {
          // Deterministic branch selection
          let nextSegNode = connected[0]; // fallback
          if (preferredBranchId !== undefined) {
            const matched = connected.find(c => assembledCorridor.getBranchId(c.segmentIndex) === preferredBranchId);
            if (matched) nextSegNode = matched;
          } else if (typeof branchSelector === 'function') {
            const selected = branchSelector(connected, currentSegIdx);
            if (selected) nextSegNode = selected;
          }

          const leftoverDistance = isForward
             ? currentSegDistance - this._getSegmentLength(segments[currentSegIdx])
             : Math.abs(currentSegDistance); // Negative leftover

          currentSegIdx = nextSegNode.segmentIndex;

          // Re-orient direction relative to the new segment if topology inverted
          const nowForward = nextSegNode.isForward !== undefined ? (isForward ? nextSegNode.isForward : !nextSegNode.isForward) : isForward;

          if (nowForward) {
             currentSegDistance = leftoverDistance;
          } else {
             currentSegDistance = this._getSegmentLength(segments[currentSegIdx]) - leftoverDistance;
          }

          coords = this._getPointAtDistance(segments[currentSegIdx], currentSegDistance);
        }
      }

      let lat = coords.lat;
      let lng = coords.lng;

      if (applyNoise) {
        const offset = DETERMINISTIC_NOISE_OFFSETS[i % DETERMINISTIC_NOISE_OFFSETS.length];
        lat += offset.dLat;
        lng += offset.dLng;
      }

      ticks.push({
        tickIndex: i + 1,
        timestamp: baseTime + (i * 10000), // 10s per tick
        lat,
        lng,
        expectedBranchId: assembledCorridor.getBranchId(currentSegIdx),
        expectedSegmentIndex: currentSegIdx
      });

      // Advance for next tick
      currentSegDistance += (isForward ? speedMetresPerTick : -speedMetresPerTick);
    }

    return ticks;
  }

  static _getSegmentLength(segmentGeometry) {
    let len = 0;
    for (let i = 0; i < segmentGeometry.length - 1; i++) {
      len += haversineMetres(segmentGeometry[i].lat, segmentGeometry[i].lng, segmentGeometry[i+1].lat, segmentGeometry[i+1].lng);
    }
    return len;
  }

  static _getPointAtDistance(segmentGeometry, distanceMetres) {
    if (distanceMetres < 0) return null;

    let accumulated = 0;
    for (let i = 0; i < segmentGeometry.length - 1; i++) {
      const p1 = segmentGeometry[i];
      const p2 = segmentGeometry[i+1];
      const dist = haversineMetres(p1.lat, p1.lng, p2.lat, p2.lng);

      if (accumulated + dist >= distanceMetres) {
        // Interpolate between p1 and p2
        const remainder = distanceMetres - accumulated;
        const ratio = remainder / dist;
        return {
          lat: p1.lat + (p2.lat - p1.lat) * ratio,
          lng: p1.lng + (p2.lng - p1.lng) * ratio
        };
      }
      accumulated += dist;
    }

    // Exact end of segment or slightly over (float precision)
    if (distanceMetres <= accumulated + 1) {
       return segmentGeometry[segmentGeometry.length - 1];
    }
    return null; // Fell off the end
  }
}

module.exports = MovementTraceGenerator;
