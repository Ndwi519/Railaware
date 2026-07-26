var _polyline = require("../../calculations/polyline.js");
describe('calculatePolylineLengthMetres', () => {
  it('returns 0 for invalid inputs', () => {
    expect((0, _polyline.calculatePolylineLengthMetres)(null)).toBe(0);
    expect((0, _polyline.calculatePolylineLengthMetres)({})).toBe(0);
    expect((0, _polyline.calculatePolylineLengthMetres)([])).toBe(0);
    expect((0, _polyline.calculatePolylineLengthMetres)([{
      lat: 10,
      lng: 20
    }])).toBe(0);
  });
  it('calculates the total length of a valid polyline', () => {
    const polyline = [{
      lat: 10.0000,
      lng: 20.0000
    }, {
      lat: 10.0000,
      lng: 20.0010
    },
    // ~111m away
    {
      lat: 10.0000,
      lng: 20.0020
    } // ~111m away
    ];
    const length = (0, _polyline.calculatePolylineLengthMetres)(polyline);
    expect(length).toBeGreaterThan(218);
    expect(length).toBeLessThan(220);
  });
  it('returns 0 if any coordinate is malformed', () => {
    expect((0, _polyline.calculatePolylineLengthMetres)([{
      lat: 10,
      lng: 20
    }, {
      lat: 10
    } // missing lng
    ])).toBe(0);
    expect((0, _polyline.calculatePolylineLengthMetres)([{
      lat: '10',
      lng: 20
    },
    // string instead of number
    {
      lat: 10,
      lng: 20.001
    }])).toBe(0);
    expect((0, _polyline.calculatePolylineLengthMetres)([{
      lat: 10,
      lng: 20
    }, null,
    // null coordinate
    {
      lat: 10,
      lng: 20.001
    }])).toBe(0);
  });
  it('returns 0 if a valid polyline sequence is followed by a malformed coordinate', () => {
    // Two valid segments followed by a malformed one
    const partialValidPolyline = [{
      lat: 10.0000,
      lng: 20.0000
    }, {
      lat: 10.0000,
      lng: 20.0010
    },
    // Valid
    {
      lat: 10.0000,
      lng: 20.0020
    },
    // Valid
    {
      lat: 10.0000
    } // Malformed (missing lng)
    ];
    expect((0, _polyline.calculatePolylineLengthMetres)(partialValidPolyline)).toBe(0);
  });
});