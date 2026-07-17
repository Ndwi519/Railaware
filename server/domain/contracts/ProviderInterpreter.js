/**
 * Defines the strict contract for interpreting raw provider data into normalized Observations,
 * with explicit prohibition against inferring missing data or smoothing regressions.
 */
class ProviderInterpreter {
  interpret(snapshot) {
    throw new Error('Not implemented');
  }
}

module.exports = ProviderInterpreter;
