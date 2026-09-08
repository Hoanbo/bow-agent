// src/core/relay/relayHeartbeat.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Heartbeat coordination, degradation detection, and health tracking.
//
// INVARIANTS:
// - HEARTBEAT != TASK_SUCCESS
// - Heartbeat failure MUST NOT automatically execute any task.
// - Heartbeat failure MUST NOT mutate Brain cognitive state.
// - Heartbeat recovery MUST NOT automatically replay commands.
export const DEFAULT_HEARTBEAT_CONFIG = Object.freeze({
    intervalMs: 5000,
    degradedMissThreshold: 2,
    unhealthyMissThreshold: 4,
});
export class RelayHeartbeatError extends Error {
    constructor(message) {
        super(`RELAY_HEARTBEAT_ERROR: ${message}`);
        this.name = 'RelayHeartbeatError';
    }
}
export class RelayHeartbeatTracker {
    records = new Map();
    config;
    constructor(config) {
        this.config = Object.freeze({
            ...DEFAULT_HEARTBEAT_CONFIG,
            ...config,
        });
    }
    /**
     * Records a successful heartbeat exchange with round-trip time.
     */
    recordHeartbeat(relayId, sessionId, rttMs, now = Date.now()) {
        const record = {
            relayId,
            sessionId,
            timestamp: now,
            rttMs: Math.max(0, rttMs),
            status: 'HEALTHY',
            consecutiveMisses: 0,
        };
        this.records.set(sessionId, Object.freeze(record));
        return record;
    }
    /**
     * Records a missed heartbeat ping/pong interval.
     */
    recordMissedHeartbeat(sessionId, now = Date.now()) {
        const existing = this.records.get(sessionId);
        const misses = (existing?.consecutiveMisses ?? 0) + 1;
        let status = 'HEALTHY';
        if (misses >= this.config.unhealthyMissThreshold) {
            status = 'UNHEALTHY';
        }
        else if (misses >= this.config.degradedMissThreshold) {
            status = 'DEGRADED';
        }
        const record = {
            relayId: existing?.relayId ?? 'relay_unknown',
            sessionId,
            timestamp: now,
            rttMs: existing?.rttMs ?? -1,
            status,
            consecutiveMisses: misses,
        };
        this.records.set(sessionId, Object.freeze(record));
        return record;
    }
    getStatus(sessionId) {
        return this.records.get(sessionId)?.status ?? 'UNHEALTHY';
    }
    getRecord(sessionId) {
        return this.records.get(sessionId);
    }
    clear() {
        this.records.clear();
    }
    /**
     * Invariant verification: Heartbeat status changes never trigger cognitive task execution.
     */
    static assertHeartbeatNonInterference(taskExecutionAttempted) {
        if (taskExecutionAttempted) {
            throw new RelayHeartbeatError('INVARIANT_VIOLATION: Heartbeat event must NEVER trigger task execution.');
        }
    }
}
