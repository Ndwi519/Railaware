Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterNoise = filterNoise;
exports.interpolatePosition = interpolatePosition;
var _haversine = require("./haversine.js");
/**
 * @module calculations/noise
 * @responsibility Filter raw GPS samples to remove jitter below a configurable noise threshold.
 */

function filterNoise(samples, thresholdMetres) {
  if (samples.length === 0) return [];
  const result = [samples[0]];
  for (let i = 1; i < samples.length; i++) {
    const prev = result[result.length - 1];
    const curr = samples[i];
    const dist = (0, _haversine.haversineMetres)(prev.lat, prev.lng, curr.lat, curr.lng);
    if (dist > thresholdMetres) {
      result.push(curr);
    }
  }
  return result;
}
function interpolatePosition(a, b, atMs) {
  if (atMs < a.timestampMs || atMs > b.timestampMs) return null;
  const t = (atMs - a.timestampMs) / (b.timestampMs - a.timestampMs);
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    timestampMs: atMs
  };
}