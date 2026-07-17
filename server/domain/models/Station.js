/**
 * Represents a physical railway station in the topology.
 */
function createStation({ code, name, lat = null, lng = null }) {
  return Object.freeze({
    code,
    name,
    lat,
    lng
  });
}

module.exports = { createStation };
