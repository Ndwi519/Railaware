const TrainDiscoveryStrategyManager = require('../../services/TrainDiscoveryStrategyManager.js');
const { DiscoveryStatus, ResolutionMethod } = require('../../../domain/types/enums.js');

describe('TrainDiscoveryStrategyManager', () => {
  class MockStrategy {
    constructor(name, id, supportsResult, discoverResult, throwsError = false) {
      this._name = name;
      this._id = id;
      this._supportsResult = supportsResult;
      this._discoverResult = discoverResult;
      this._throwsError = throwsError;
      this.minimumEvidenceStrength = null;
    }
    name() { return this._name; }
    id() { return this._id; }
    supports(context) { return this._supportsResult; }
    async discover(context) {
      if (this._throwsError) throw new Error('Mock error');
      return this._discoverResult;
    }
  }

  const createMockCache = (method) => ({
    getOrCreate: jest.fn().mockResolvedValue({
      status: method ? 'RESOLVED' : 'UNRESOLVED',
      method
    })
  });

  it('should register and order strategies by priority', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const s1 = new MockStrategy('Strat 1', 's1', { supported: true, reason: null }, {});
    const s2 = new MockStrategy('Strat 2', 's2', { supported: true, reason: null }, {});
    
    manager.register(s1, 20);
    manager.register(s2, 10);
    
    expect(manager.strategies[0].strategy.name()).toBe('Strat 2');
    expect(manager.strategies[1].strategy.name()).toBe('Strat 1');
  });

  it('should skip unsupported strategies and record diagnostics', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const unsupportedStrat = new MockStrategy('Unsupported', 'unsup', { supported: false, reason: 'Test reason' }, null);
    manager.register(unsupportedStrat, 10);

    const result = await manager.discover({});
    expect(result.skippedStrategies).toContain('unsup');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ strategy: 'unsup', status: DiscoveryStatus.SKIPPED, reason: 'Test reason' })
      ])
    );
  });

  it('should short-circuit on first successful strategy', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    
    const failStrat = new MockStrategy('FailStrat', 'fail', { supported: true, reason: null }, {
      status: DiscoveryStatus.FAILED, provider: 'FailStrat'
    });
    const errorStrat = new MockStrategy('ErrorStrat', 'err', { supported: true, reason: null }, {
      status: DiscoveryStatus.ERROR, provider: 'ErrorStrat', error: 'Not found'
    });
    const successStrat = new MockStrategy('SuccessStrat', 'success', { supported: true, reason: null }, {
      status: DiscoveryStatus.SUCCESS, provider: 'SuccessStrat', trainTarget: '123'
    });
    const neverExecutedStrat = new MockStrategy('NeverRun', 'never', { supported: true, reason: null }, {});
    
    manager.register(failStrat, 10);
    manager.register(errorStrat, 15);
    manager.register(successStrat, 20);
    manager.register(neverExecutedStrat, 30);

    const result = await manager.discover({});
    
    expect(result.winningStrategy).toBe('SuccessStrat');
    expect(result.winningStrategyId).toBe('success');
    expect(result.executedStrategies).toEqual(['fail', 'err', 'success']);
    expect(result.providerErrors).toContain('Not found');
    expect(result.finalResult.trainTarget).toBe('123');
  });

  it('should reject strategy with PREREQUISITE_UNAVAILABLE if minimum evidence strength is not met', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strictStrat = new MockStrategy('StrictStrat', 'strict', { supported: true }, {});
    strictStrat.minimumEvidenceStrength = ResolutionMethod.VERIFIED_TOPOLOGY;
    
    manager.register(strictStrat, 10);

    // Provide weaker evidence
    const mockCache = createMockCache(ResolutionMethod.GEOMETRIC_PROJECTION);

    const result = await manager.discover({ cache: mockCache });
    
    expect(result.skippedStrategies).toContain('strict');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          strategy: 'strict', 
          status: DiscoveryStatus.PREREQUISITE_UNAVAILABLE, 
          reason: expect.stringContaining('Provider requires evidence strength VERIFIED_TOPOLOGY but only GEOMETRIC_PROJECTION was available') 
        })
      ])
    );
  });

  it('should accept strategy if minimum evidence strength is met', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strictStrat = new MockStrategy('StrictStrat', 'strict', { supported: true }, {
      status: DiscoveryStatus.SUCCESS, provider: 'StrictStrat', trainTarget: '123'
    });
    // Requires OFFLINE_GRAPH (score 3)
    strictStrat.minimumEvidenceStrength = ResolutionMethod.OFFLINE_GRAPH;
    
    manager.register(strictStrat, 10);

    // Provide VERIFIED_TOPOLOGY (score 4)
    const mockCache = createMockCache(ResolutionMethod.VERIFIED_TOPOLOGY);

    const result = await manager.discover({ cache: mockCache });
    
    expect(result.winningStrategyId).toBe('strict');
    expect(result.executedStrategies).toContain('strict');
  });

  it('should record PREREQUISITE_UNAVAILABLE globally if all strategies are skipped or fail', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strictStrat = new MockStrategy('StrictStrat', 'strict', { supported: true }, {});
    strictStrat.minimumEvidenceStrength = ResolutionMethod.VERIFIED_TOPOLOGY;
    
    manager.register(strictStrat, 10);

    // Provide no evidence (null method)
    const mockCache = createMockCache(null);

    const result = await manager.discover({ cache: mockCache });
    
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          strategy: 'strategy-manager', 
          status: DiscoveryStatus.PREREQUISITE_UNAVAILABLE, 
          reason: 'All discovery strategies skipped, rejected, or failed' 
        })
      ])
    );
  });

  // Evidence hierarchy boundary: PROVIDER_GRAPH not sufficient for OFFLINE_GRAPH
  it('should reject strategy requiring OFFLINE_GRAPH when only PROVIDER_GRAPH is available', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strat = new MockStrategy('OfflineStrat', 'offline', { supported: true }, {});
    strat.minimumEvidenceStrength = ResolutionMethod.OFFLINE_GRAPH;

    manager.register(strat, 10);
    const mockCache = createMockCache(ResolutionMethod.PROVIDER_GRAPH);

    const result = await manager.discover({ cache: mockCache });

    expect(result.skippedStrategies).toContain('offline');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          strategy: 'offline',
          status: DiscoveryStatus.PREREQUISITE_UNAVAILABLE,
          reason: expect.stringContaining('OFFLINE_GRAPH')
        })
      ])
    );
  });

  // Evidence hierarchy boundary: GEOMETRIC_PROJECTION not sufficient for PROVIDER_GRAPH
  it('should reject strategy requiring PROVIDER_GRAPH when only GEOMETRIC_PROJECTION is available', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strat = new MockStrategy('ProviderStrat', 'provider', { supported: true }, {});
    strat.minimumEvidenceStrength = ResolutionMethod.PROVIDER_GRAPH;

    manager.register(strat, 10);
    const mockCache = createMockCache(ResolutionMethod.GEOMETRIC_PROJECTION);

    const result = await manager.discover({ cache: mockCache });

    expect(result.skippedStrategies).toContain('provider');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          strategy: 'provider',
          status: DiscoveryStatus.PREREQUISITE_UNAVAILABLE,
          reason: expect.stringContaining('PROVIDER_GRAPH')
        })
      ])
    );
  });

  // Evidence hierarchy boundary: GEOMETRIC_PROJECTION meets GEOMETRIC_PROJECTION requirement
  it('should accept strategy requiring GEOMETRIC_PROJECTION when GEOMETRIC_PROJECTION is available', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strat = new MockStrategy('GeoStrat', 'geo', { supported: true }, {
      status: DiscoveryStatus.SUCCESS, provider: 'GeoStrat', trainTarget: '456'
    });
    strat.minimumEvidenceStrength = ResolutionMethod.GEOMETRIC_PROJECTION;

    manager.register(strat, 10);
    const mockCache = createMockCache(ResolutionMethod.GEOMETRIC_PROJECTION);

    const result = await manager.discover({ cache: mockCache });

    expect(result.winningStrategyId).toBe('geo');
    expect(result.executedStrategies).toContain('geo');
  });

  // PROVIDER_GRAPH meets GEOMETRIC_PROJECTION requirement (stronger satisfies weaker)
  it('should accept strategy requiring GEOMETRIC_PROJECTION when PROVIDER_GRAPH is available', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strat = new MockStrategy('GeoStrat', 'geo', { supported: true }, {
      status: DiscoveryStatus.SUCCESS, provider: 'GeoStrat', trainTarget: '789'
    });
    strat.minimumEvidenceStrength = ResolutionMethod.GEOMETRIC_PROJECTION;

    manager.register(strat, 10);
    const mockCache = createMockCache(ResolutionMethod.PROVIDER_GRAPH);

    const result = await manager.discover({ cache: mockCache });

    expect(result.winningStrategyId).toBe('geo');
  });

  // Strategy with no minimumEvidenceStrength executes regardless of evidence
  it('should execute strategy without minimumEvidenceStrength unconditionally', async () => {
    const manager = new TrainDiscoveryStrategyManager();
    const strat = new MockStrategy('FreeStrat', 'free', { supported: true }, {
      status: DiscoveryStatus.SUCCESS, provider: 'FreeStrat', trainTarget: '000'
    });
    // minimumEvidenceStrength remains null — no requirement
    
    manager.register(strat, 10);
    const mockCache = createMockCache(null); // no evidence at all

    const result = await manager.discover({ cache: mockCache });

    expect(result.winningStrategyId).toBe('free');
  });
});
