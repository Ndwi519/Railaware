

class RailRadarDiscoveryMapper {
  /**
   * Converts provider DTOs into application domain models.
   * @param {Object} rawDto 
   * @param {Object} context 
   */
  map(rawDto, context) {
    if (!rawDto || !rawDto.trainTarget) {
      return { trainTarget: null, journey: null };
    }

    const { trainTarget } = rawDto;
    
    // We do not have sufficient verifiable data to construct a deterministic Journey
    // Do not fabricate a Journey with Date.now() IDs or 'UNKNOWN' placeholders.
    return { trainTarget, journey: null };
  }
}

module.exports = RailRadarDiscoveryMapper;
