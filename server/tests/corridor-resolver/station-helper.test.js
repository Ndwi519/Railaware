var _stationHelper = require("../../corridor-resolver/station-helper.js");
describe('extractStationFeature', () => {
  it('returns null for missing, non-object, or non-node elements', () => {
    expect((0, _stationHelper.extractStationFeature)(null)).toBeNull();
    expect((0, _stationHelper.extractStationFeature)(undefined)).toBeNull();
    expect((0, _stationHelper.extractStationFeature)('string')).toBeNull();
    expect((0, _stationHelper.extractStationFeature)({
      type: 'way'
    })).toBeNull();
  });
  it('returns null for missing coordinates', () => {
    const node = {
      type: 'node',
      tags: {
        railway: 'station',
        ref: 'ABC'
      }
    };
    expect((0, _stationHelper.extractStationFeature)(node)).toBeNull();
    expect((0, _stationHelper.extractStationFeature)({
      ...node,
      lat: '10',
      lon: 20
    })).toBeNull();
  });
  it('returns null for missing tags or non-station railway tag', () => {
    expect((0, _stationHelper.extractStationFeature)({
      type: 'node',
      lat: 10,
      lon: 20
    })).toBeNull();
    expect((0, _stationHelper.extractStationFeature)({
      type: 'node',
      lat: 10,
      lon: 20,
      tags: {
        railway: 'halt',
        ref: 'ABC'
      }
    })).toBeNull();
  });
  it('returns null for missing or empty station codes', () => {
    const base = {
      type: 'node',
      lat: 10,
      lon: 20,
      tags: {
        railway: 'station'
      }
    };
    expect((0, _stationHelper.extractStationFeature)(base)).toBeNull();
    expect((0, _stationHelper.extractStationFeature)({
      ...base,
      tags: {
        ...base.tags,
        ref: ''
      }
    })).toBeNull();
    expect((0, _stationHelper.extractStationFeature)({
      ...base,
      tags: {
        ...base.tags,
        'ref:IR': '   '
      }
    })).toBeNull();
  });
  it('prefers ref:IR over ref', () => {
    const node = {
      id: 123,
      type: 'node',
      lat: 10.5,
      lon: 20.5,
      tags: {
        railway: 'station',
        'ref:IR': 'PRIORITY',
        ref: 'FALLBACK'
      }
    };
    const result = (0, _stationHelper.extractStationFeature)(node);
    expect(result).not.toBeNull();
    expect(result.id).toBe(123);
    expect(result.hasRefIR).toBe(true);
    expect(result.feature.station.code).toBe('PRIORITY');
    expect(result.feature.station.source).toBe('osm');
    expect(result.feature.lat).toBe(10.5);
    expect(result.feature.lng).toBe(20.5);
  });
  it('falls back to ref if ref:IR is missing', () => {
    const node = {
      id: 456,
      type: 'node',
      lat: 10.5,
      lon: 20.5,
      tags: {
        railway: 'station',
        ref: 'FALLBACK'
      }
    };
    const result = (0, _stationHelper.extractStationFeature)(node);
    expect(result.hasRefIR).toBe(false);
    expect(result.feature.station.code).toBe('FALLBACK');
  });
  it('includes name if present', () => {
    const node = {
      id: 789,
      type: 'node',
      lat: 10,
      lon: 20,
      tags: {
        railway: 'station',
        ref: 'CODE',
        name: 'Station Name'
      }
    };
    const result = (0, _stationHelper.extractStationFeature)(node);
    expect(result.hasName).toBe(true);
    expect(result.feature.station.name).toBe('Station Name');
  });
  it('omits name if missing or empty', () => {
    const node = {
      id: 789,
      type: 'node',
      lat: 10,
      lon: 20,
      tags: {
        railway: 'station',
        ref: 'CODE',
        name: '  '
      }
    };
    const result = (0, _stationHelper.extractStationFeature)(node);
    expect(result.hasName).toBe(false);
    expect(result.feature.station.name).toBeUndefined();
  });
});