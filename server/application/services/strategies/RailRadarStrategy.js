/**
 * @module application/services/strategies/RailRadarStrategy
 * @responsibility Station-based train discovery using the RailRadar provider.
 *
 * Supports discovery only when a valid railway corridor is present in context.
 * Lazily resolves station codes via the shared RequestCache and delegates
 * all network I/O to the injected provider.
 *
 * Dependencies: RailRadarProvider, RequestCache (via context), StationResolver (via context).
 * Public API: supports(context), discover(context), id(), name()
 */
const TrainDiscoveryStrategy = require('./TrainDiscoveryStrategy.js');
const { DiscoveryStatus, ResolutionStatus, ResolutionMethod } = require('../../../domain/types/enums.js');
const { createCjsLogger } = require('../../utils/cjsLogger.js');

const log = createCjsLogger('discovery:railradar');

class RailRadarStrategy extends TrainDiscoveryStrategy {
  constructor(railRadarProvider, minEvidenceStrength = ResolutionMethod.VERIFIED_TOPOLOGY) {
    super();
    this.provider = railRadarProvider;
    this.minimumEvidenceStrength = minEvidenceStrength;
  }

  name() {
    return 'RailRadar (Station Based)';
  }

  id() {
    return 'railradar';
  }

  /**
   * A cheap metadata-only check. Never performs network or heavy I/O here.
   */
  supports(context) {
    if (!context.corridor) {
      return { supported: false, reason: 'No valid railway corridor found near GPS coordinates.' };
    }
    return { supported: true, reason: null };
  }

  async discover(context) {
    const startTime = Date.now();
    const providerRequests = [];

    try {
      // Station resolution is guaranteed to be completed by the StrategyManager 
      // if capability checking is enforced. We just pull from cache.
      const stationResolution = await context.cache.getOrCreate(
        'stationResolution',
        () => context.services.stationResolver.resolve(context.location, context.corridor)
      );

      // Defensive check: StrategyManager should have guarded this via minimumEvidenceStrength,
      // but if station resolution is missing/inconsistent, fail deterministically without throwing.
      if (
        stationResolution.status !== ResolutionStatus.RESOLVED ||
        !stationResolution.previousStation?.code ||
        !stationResolution.nextStation?.code
      ) {
        return {
          status: DiscoveryStatus.ERROR,
          provider: this.name(),
          confidence: null,
          discoveredTrains: [],
          trainTarget: null,
          providerRequests: [],
          diagnostics: [],
          elapsedTimeMs: Date.now() - startTime,
          reason: 'Station resolution was unavailable or inconsistent with provider admission.',
          error: null,
          providerData: null,
        };
      }

      const fromCode = stationResolution.previousStation.code;
      const toCode = stationResolution.nextStation.code;

      const pStartTime = Date.now();
      const discoveredTrains = await this.provider.discoverNearbyTrains(fromCode, toCode);
      const pDuration = Date.now() - pStartTime;

      providerRequests.push({
        endpoint: `/trains/between/${fromCode}/${toCode}`,
        status: DiscoveryStatus.SUCCESS,
        duration: pDuration,
        summary: `Found ${discoveredTrains.length} trains`,
      });

      if (!discoveredTrains || discoveredTrains.length === 0) {
        return {
          status: DiscoveryStatus.FAILED,
          provider: this.name(),
          confidence: null,
          discoveredTrains: [],
          trainTarget: null,
          providerRequests,
          diagnostics: [],
          elapsedTimeMs: Date.now() - startTime,
          reason: 'No trains discovered on this bound.',
          error: null,
          providerData: null,
        };
      }

      return {
        status: DiscoveryStatus.SUCCESS,
        provider: this.name(),
        confidence: null,
        discoveredTrains,
        trainTarget: discoveredTrains[0].id,
        providerRequests,
        diagnostics: [],
        elapsedTimeMs: Date.now() - startTime,
        reason: 'Successfully discovered trains.',
        error: null,
        providerData: { toStationCode: toCode },
      };

    } catch (error) {
      log.error('RailRadarStrategy discovery failed', error);
      return {
        status: DiscoveryStatus.ERROR,
        provider: this.name(),
        confidence: null,
        discoveredTrains: [],
        trainTarget: null,
        providerRequests,
        diagnostics: [],
        elapsedTimeMs: Date.now() - startTime,
        reason: 'Provider threw an exception.',
        error: error.message,
        providerData: null,
      };
    }
  }
}

module.exports = RailRadarStrategy;
