"use strict";

const { CorridorResolutionResult } = require('../CorridorResolutionResult.js');

describe('CorridorResolutionResult Contract', () => {
  it('throws an informative Error when nearestCorridor is missing', () => {
    expect(() => {
      new CorridorResolutionResult();
    }).toThrow('CorridorResolutionResult requires nearestCorridor');

    expect(() => {
      new CorridorResolutionResult({});
    }).toThrow('CorridorResolutionResult requires nearestCorridor');

    expect(() => {
      new CorridorResolutionResult({ nearestCorridor: null });
    }).toThrow('CorridorResolutionResult requires nearestCorridor');
  });

  it('normalizes optional members to null when omitted', () => {
    const result = new CorridorResolutionResult({
      nearestCorridor: { id: 'test' }
    });

    expect(result.projectionResult).toBeNull();
    expect(result.assembledCorridor).toBeNull();
    expect(result.stationsOutput).toBeNull();
  });

  it('retains provided optional members', () => {
    const result = new CorridorResolutionResult({
      nearestCorridor: { id: 'test' },
      projectionResult: { distance: 100 },
      assembledCorridor: { segments: [] },
      stationsOutput: [{ code: 'NDLS' }]
    });

    expect(result.projectionResult.distance).toBe(100);
    expect(result.assembledCorridor.segments).toEqual([]);
    expect(result.stationsOutput[0].code).toBe('NDLS');
  });

  it('deep freezes the resulting object', () => {
    const result = new CorridorResolutionResult({
      nearestCorridor: { nested: { id: 'test' } },
      projectionResult: { distance: 100 }
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.nearestCorridor)).toBe(true);
    expect(Object.isFrozen(result.nearestCorridor.nested)).toBe(true);
    expect(Object.isFrozen(result.projectionResult)).toBe(true);
  });

  it('exposes expected public fields and ensures no underscore-prefixed compatibility fields exist', () => {
    const result = new CorridorResolutionResult({
      nearestCorridor: { id: 'test' }
    });

    expect(result).toHaveProperty('nearestCorridor');
    expect(result).toHaveProperty('projectionResult');
    expect(result).toHaveProperty('assembledCorridor');
    expect(result).toHaveProperty('stationsOutput');

    expect(result).not.toHaveProperty('_projectionResult');
    expect(result).not.toHaveProperty('_assembledCorridor');
    expect(result).not.toHaveProperty('_stationsOutput');
  });
});
