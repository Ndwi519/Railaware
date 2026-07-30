const { ValidationError } = require('../../utils/errors.js');

/**
 * REFERENCE IMPLEMENTATION LIMITATIONS:
 * This implementation is process-local. It is volatile and does not survive 
 * application restarts. It cannot be shared across multiple server instances. 
 * It is intended exclusively for local development, testing, and single-instance deployments.
 */
class InMemoryJourneyEvidenceStore {
  constructor(ttlMs = 86400000, cleanupIntervalMs = 600000) {
    this.store = new Map();
    this.ttlMs = ttlMs;
    
    this.cleanupTimer = setInterval(() => this.activeCleanup(), cleanupIntervalMs);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  save(sessionId, trainId, targetStationCode) {
    if (!sessionId || !trainId || !targetStationCode) {
      throw new ValidationError('sessionId, trainId, and targetStationCode are required fields for JourneyEvidence');
    }
    const now = new Date();
    const evidence = {
      sessionId,
      trainId,
      targetStationCode,
      confirmedAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs)
    };

    this.store.set(sessionId, evidence);
  }

  get(sessionId) {
    const evidence = this.store.get(sessionId);
    if (!evidence) return null;

    if (this.isExpired(evidence, new Date())) {
      this.store.delete(sessionId);
      return null;
    }

    // Defensive copy for immutability
    return { 
      ...evidence,
      confirmedAt: new Date(evidence.confirmedAt.getTime()),
      expiresAt: new Date(evidence.expiresAt.getTime())
    };
  }

  clear(sessionId) {
    this.store.delete(sessionId);
  }

  destroy() {
    clearInterval(this.cleanupTimer);
  }

  isExpired(evidence, now) {
    return now.getTime() > evidence.expiresAt.getTime();
  }

  activeCleanup() {
    const now = new Date();
    for (const [sessionId, evidence] of this.store.entries()) {
      if (this.isExpired(evidence, now)) {
        this.store.delete(sessionId);
      }
    }
  }
}

module.exports = InMemoryJourneyEvidenceStore;
