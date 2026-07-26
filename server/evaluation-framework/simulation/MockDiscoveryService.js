class MockDiscoveryService {
  constructor() {
    this.corridorData = null;
    this.trainTarget = null;
  }

  setContext(trainTarget, corridorData) {
    this.trainTarget = trainTarget;
    this.corridorData = corridorData;
  }

  async discoverTrain(lat, lng) {
    if (!this.corridorData) {
      throw new Error("No corridor data injected for simulation");
    }

    // Simulate finding the train
    return {
      trainTarget: this.trainTarget,
      journey: {
        route: this.corridorData.route || [],
        targetStation: this.corridorData.targetStation || { code: 'UNKNOWN' }
      },
      corridor: this.corridorData,
      discoveredTrains: [{ number: this.trainTarget }],
      strategyDiagnostics: [{ strategy: 'MockDiscovery', status: 'SUCCESS', elapsedTimeMs: 0 }]
    };
  }
}

module.exports = MockDiscoveryService;
