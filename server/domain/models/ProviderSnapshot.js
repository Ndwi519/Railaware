/**
 * Represents the raw, unmutated JSON payload received from the provider.
 * Preserved strictly for auditing and debugging.
 */
function createProviderSnapshot({ id, rawJson, metadata, capturedAt }) {
  return Object.freeze({
    id,
    rawJson,
    metadata: Object.freeze({ ...metadata }),
    capturedAt
  });
}

module.exports = { createProviderSnapshot };
