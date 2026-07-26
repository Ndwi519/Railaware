const ApplicationMapper = require('../ApplicationMapper');

describe('ApplicationMapper', () => {
  it('strips internal graph topology from pipeline results', () => {
    const mockPipelineResult = {
      observation: { lat: 10, lng: 20, timestamp: 123, sessionId: 'abc' },
      confidence: { level: 'HIGH', score: 95 },
      awareness: { level: 'TRACK', description: 'Train approaching' },
      assistance: { instruction: 'Wait', urgency: 'HIGH' },
      discoveryContext: {
        routeContext: {
          branchTopology: { internalPointer: 'secret' }
        },
        discoveredTrains: [{
          trainNumber: '12345',
          trainName: 'Test Express',
          status: 'ON_TIME',
          distance: 500,
          lastUpdated: 123
        }]
      }
    };

    const result = ApplicationMapper.toObservationResponse(mockPipelineResult);

    expect(result).not.toHaveProperty('discoveryContext');
    expect(result.trains).toHaveLength(1);
    expect(result.trains[0]).toHaveProperty('trainNumber', '12345');
    // Ensure topology doesn't leak
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('handles null pipeline results', () => {
    expect(ApplicationMapper.toObservationResponse(null)).toBeNull();
  });

  it('handles missing discoveryContext', () => {
    const result = ApplicationMapper.toObservationResponse({
      observation: { lat: 1, lng: 1 }
    });
    expect(result.trains).toBeNull();
    expect(result.error).toBeNull();
  });
});
