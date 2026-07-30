const crypto = require('crypto');

/**
 * REFERENCE IMPLEMENTATION LIMITATIONS:
 * This implementation is process-local. It does not survive application restarts
 * and is not shared across multiple server instances. 
 * It is intended exclusively for local development, testing, and single-instance deployments.
 */
class InMemoryDiscoveryContextStore {
  constructor(ttlMs = 60000, cleanupIntervalMs = 10000) {
    this.store = new Map();
    this.ttlMs = ttlMs;
    
    this.cleanupTimer = setInterval(() => this.activeCleanup(), cleanupIntervalMs);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  evaluateAndStore(sessionId, targetStationCode, candidateTrainIds) {
    const existing = this.store.get(sessionId);
    const now = new Date();

    if (existing && !this.isExpired(existing, now)) {
      if (this.isMaterialChange(existing, targetStationCode, candidateTrainIds)) {
        this.store.delete(sessionId);
      } else {
        existing.expiresAt = new Date(now.getTime() + this.ttlMs);
        return existing.id;
      }
    }

    const newContext = {
      id: crypto.randomUUID(),
      sessionId,
      targetStationCode,
      candidateTrainIds: [...candidateTrainIds],
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs)
    };

    this.store.set(sessionId, newContext);
    return newContext.id;
  }

  consume(sessionId, discoveryContextId, trainId) {
    const context = this.store.get(sessionId);
    const now = new Date();

    if (!context) return null;
    if (context.id !== discoveryContextId) return null;
    if (this.isExpired(context, now)) {
      this.store.delete(sessionId);
      return null;
    }
    if (!context.candidateTrainIds.includes(trainId)) return null;

    const validTargetStationCode = context.targetStationCode;
    this.store.delete(sessionId);
    
    return validTargetStationCode;
  }

  invalidate(sessionId) {
    this.store.delete(sessionId);
  }

  destroy() {
    clearInterval(this.cleanupTimer);
  }

  isMaterialChange(existing, newStationCode, newTrainIds) {
    if (existing.targetStationCode !== newStationCode) return true;
    if (existing.candidateTrainIds.length !== newTrainIds.length) return true;
    
    const existingSet = new Set(existing.candidateTrainIds);
    for (const id of newTrainIds) {
      if (!existingSet.has(id)) return true;
    }

    return false;
  }

  isExpired(context, now) {
    return now.getTime() > context.expiresAt.getTime();
  }

  activeCleanup() {
    const now = new Date();
    for (const [sessionId, context] of this.store.entries()) {
      if (this.isExpired(context, now)) {
        this.store.delete(sessionId);
      }
    }
  }
}

module.exports = InMemoryDiscoveryContextStore;
