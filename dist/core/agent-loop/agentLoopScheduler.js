// src/core/agent-loop/agentLoopScheduler.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Scheduler, Resource Locking & Idempotency Engine.
//
// Invariants:
// DETERMINISTIC RESOURCE LOCKING
// IDEMPOTENCY: DUPLICATE TICKS CANNOT COMMIT DUPLICATE PHYSICAL MUTATIONS
export class AgentLoopScheduler {
    locks = new Map();
    executedKeys = new Map();
    acquireResourceLock(resource, objectiveId) {
        const normalized = resource.toLowerCase();
        const existing = this.locks.get(normalized);
        if (existing) {
            if (existing.objectiveId === objectiveId) {
                return true; // Reentrant for the same objective
            }
            // Check stale lock (older than 60s)
            if (Date.now() - existing.timestamp > 60000) {
                this.locks.set(normalized, { objectiveId, timestamp: Date.now() });
                return true;
            }
            return false;
        }
        this.locks.set(normalized, { objectiveId, timestamp: Date.now() });
        return true;
    }
    releaseResourceLock(resource, objectiveId) {
        const normalized = resource.toLowerCase();
        const existing = this.locks.get(normalized);
        if (existing && existing.objectiveId === objectiveId) {
            this.locks.delete(normalized);
            return true;
        }
        return false;
    }
    isResourceLocked(resource) {
        return this.locks.has(resource.toLowerCase());
    }
    checkAndMarkIdempotent(key, ttlMs = 60000) {
        const now = Date.now();
        const existing = this.executedKeys.get(key);
        if (existing && now - existing < ttlMs) {
            return false; // Duplicate within TTL window
        }
        this.executedKeys.set(key, now);
        return true;
    }
    clear() {
        this.locks.clear();
        this.executedKeys.clear();
    }
}
export const globalAgentLoopScheduler = new AgentLoopScheduler();
