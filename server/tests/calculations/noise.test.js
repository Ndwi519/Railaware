var _noise = require("../../calculations/noise.js");


const mkPos = (lat, lng, ms) => ({
  lat,
  lng,
  timestampMs: ms
});
describe('filterNoise', () => {
  it('returns empty array for empty input', () => {
    expect((0, _noise.filterNoise)([], 10)).toEqual([]);
  });
  it('always keeps the first sample', () => {
    const samples = [mkPos(28.0, 77.0, 0)];
    expect((0, _noise.filterNoise)(samples, 10)).toHaveLength(1);
  });
  it('removes samples below the noise threshold', () => {
    // 1m movement is below 10m threshold
    const samples = [mkPos(28.0, 77.0, 0), mkPos(28.000009, 77.0, 1000) // ~1m
    ];
    expect((0, _noise.filterNoise)(samples, 10)).toHaveLength(1);
  });
  it('keeps samples above the threshold', () => {
    const samples = [mkPos(28.0, 77.0, 0), mkPos(28.1, 77.0, 30_000) // ~11km
    ];
    expect((0, _noise.filterNoise)(samples, 10)).toHaveLength(2);
  });
});
describe('interpolatePosition', () => {
  it('returns midpoint at 50% time', () => {
    const a = mkPos(28.0, 77.0, 0);
    const b = mkPos(28.2, 77.2, 1000);
    const mid = (0, _noise.interpolatePosition)(a, b, 500);
    expect(mid).not.toBeNull();
    expect(mid.lat).toBeCloseTo(28.1);
    expect(mid.lng).toBeCloseTo(77.1);
  });
  it('returns null for out-of-range timestamps', () => {
    const a = mkPos(28.0, 77.0, 1000);
    const b = mkPos(28.2, 77.2, 2000);
    expect((0, _noise.interpolatePosition)(a, b, 0)).toBeNull();
    expect((0, _noise.interpolatePosition)(a, b, 3000)).toBeNull();
  });
});