var _globals = require("@jest/globals");
var _eta = require("../../calculations/eta.js");
describe('computeEtaSeconds', () => {
  it('Priority 1: Uses provider speed if available', () => {
    // 72 kmph = 20 m/s. distance = 1000m. ETA = 50s.
    const eta = (0, _eta.computeEtaSeconds)(72, 0.1, 0.15, 1000, 10000, 5000);
    expect(eta).toBe(50);
  });
  it('Priority 2: Computes speed from segment progress if provider speed is missing', () => {
    // Moved 0.05 of 10000m = 500m in 25000ms. Speed = 20 m/s.
    // Distance remaining = 1000m. ETA = 50s.
    const eta = (0, _eta.computeEtaSeconds)(null, 0.1, 0.15, 1000, 10000, 25000);
    expect(eta).toBe(50);
  });
  it('Priority 2: Returns null if computed speed is unrealistically high (>250kmph)', () => {
    // Moved 5000m in 1000ms = 5000 m/s (Mach 14 train)
    const eta = (0, _eta.computeEtaSeconds)(null, 0.1, 0.6, 1000, 10000, 1000);
    expect(eta).toBeNull();
  });
  it('Priority 3: Returns null if no previous progress exists', () => {
    const eta = (0, _eta.computeEtaSeconds)(null, null, 0.15, 1000, 10000, 25000);
    expect(eta).toBeNull();
  });
  it('Priority 3: Returns null if elapsed time is zero or negative', () => {
    const eta = (0, _eta.computeEtaSeconds)(null, 0.1, 0.15, 1000, 10000, 0);
    expect(eta).toBeNull();
  });
});