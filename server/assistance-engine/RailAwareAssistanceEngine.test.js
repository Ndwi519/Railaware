const RailAwareAssistanceEngine = require('./RailAwareAssistanceEngine.js');

describe('RailAwareAssistanceEngine', () => {
  describe('Configuration Paths', () => {
    it('should omit DIAL_EMERGENCY and emergencyContact if EMERGENCY_PHONE_NUMBER is not configured', () => {
      const engine = new RailAwareAssistanceEngine({}); // No config provided
      const result = engine.generateAssistance({ status: 'APPROACHING_STATION' });

      expect(result.emergencyContact).toBeNull();
      expect(result.availableActions).not.toContain('DIAL_EMERGENCY');
      expect(result.availableActions.length).toBe(0);
    });

    it('should include DIAL_EMERGENCY and emergencyContact if EMERGENCY_PHONE_NUMBER is configured', () => {
      const engine = new RailAwareAssistanceEngine({ emergencyPhoneNumber: '911' });
      const result = engine.generateAssistance({ status: 'APPROACHING_STATION' });

      expect(result.emergencyContact).toEqual({
        number: '911',
        description: 'Emergency Services'
      });
      expect(result.availableActions).toContain('DIAL_EMERGENCY');
    });
  });

  describe('Deterministic State Mapping', () => {
    const engine = new RailAwareAssistanceEngine({ emergencyPhoneNumber: '112' });

    const stateMap = [
      {
        status: null,
        expectedTitle: 'General Guidance',
        expectedInstructions: ['Stay clear of railway tracks.', 'Maintain situational awareness.']
      },
      {
        status: 'UNKNOWN',
        expectedTitle: 'Status Unavailable',
        expectedInstructions: ['Train data is currently unavailable for this location.', 'Railway tracks should always be treated with caution.']
      },
      {
        status: 'NO_TRAINS_FOUND',
        expectedTitle: 'Zero Trains Reported',
        expectedInstructions: ['No active trains detected in this area.', 'Remain alert.']
      },
      {
        status: 'DISTANT',
        expectedTitle: 'Train Approaching',
        expectedInstructions: ['Train approaching in the distance.', 'Do not enter the track area.']
      },
      {
        status: 'APPROACHING_STATION',
        expectedTitle: 'Train Arriving',
        expectedInstructions: ['Train is arriving.', 'Move away from the platform edge.']
      },
      {
        status: 'AT_STATION',
        expectedTitle: 'Train At Station',
        expectedInstructions: ['Train is at the station.', 'Stand back from the doors.']
      },
      {
        status: 'CANCELLED',
        expectedTitle: 'Train Cancelled',
        expectedInstructions: ['Scheduled train is cancelled.', 'Normal track rules apply.']
      },
      {
        status: 'SOME_WEIRD_STATE', // Unexpected state fallback
        expectedTitle: 'General Guidance',
        expectedInstructions: ['Stay clear of railway tracks.', 'Maintain situational awareness.']
      }
    ];

    stateMap.forEach(({ status, expectedTitle, expectedInstructions }) => {
      it(`should map awareness status '${status}' deterministically`, () => {
        const awareness = status === null ? null : { status };
        const result = engine.generateAssistance(awareness);

        expect(result.guidance.title).toBe(expectedTitle);
        expect(result.guidance.instructions).toEqual(expectedInstructions);
      });
    });
  });
});
