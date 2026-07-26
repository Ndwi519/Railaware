var _haversine = require("../../calculations/haversine.js");


describe('haversineMetres', () => {
  it('returns 0 for identical points', () => {
    expect((0, _haversine.haversineMetres)(28.6, 77.2, 28.6, 77.2)).toBe(0);
  });
  it('computes ~111km per degree of latitude', () => {
    const dist = (0, _haversine.haversineMetres)(0, 0, 1, 0);
    expect(dist).toBeCloseTo(111_195, -2);
  });
  it('is symmetric', () => {
    const a = (0, _haversine.haversineMetres)(28.6, 77.2, 28.7, 77.3);
    const b = (0, _haversine.haversineMetres)(28.7, 77.3, 28.6, 77.2);
    expect(a).toBeCloseTo(b, 5);
  });
  it('New Delhi to Hazrat Nizamuddin is ~7km', () => {
    // NDLS: 28.6420, 77.2197 — NZM: 28.5830, 77.2503
    const dist = (0, _haversine.haversineMetres)(28.642, 77.2197, 28.583, 77.2503);
    expect(dist).toBeGreaterThan(6_500);
    expect(dist).toBeLessThan(7_500);
  });
});