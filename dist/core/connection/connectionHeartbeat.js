// src/core/connection/connectionHeartbeat.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - Heartbeat verifies transport connectivity ONLY.
// - Heartbeat MUST NEVER imply: task success, tool execution, verification, commit, approval, or Brain mutation.
import { createConnectionScope, deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
/**
 * Creates an immutable ConnectionHeartbeatSignal
 */
export function createConnectionHeartbeatSignal(identity, sequence, sentAt = new Date().toISOString()) {
    const scope = createConnectionScope(identity);
    const fp = computeConnectionFingerprint({
        scope,
        sequence,
        type: 'HEARTBEAT_SIGNAL',
    });
    return deepFreeze({
        heartbeatId: `hbt_${fp}`,
        scope,
        sequence,
        sentAt,
        fingerprint: fp,
    });
}
/**
 * Creates an immutable ConnectionHeartbeatAck acknowledging a signal
 */
export function createConnectionHeartbeatAck(signal, ackedAt = new Date().toISOString()) {
    const fp = computeConnectionFingerprint({
        heartbeatId: signal.heartbeatId,
        ackedSequence: signal.sequence,
        scope: signal.scope,
        type: 'HEARTBEAT_ACK',
    });
    return deepFreeze({
        heartbeatId: signal.heartbeatId,
        ackedSequence: signal.sequence,
        scope: signal.scope,
        ackedAt,
        fingerprint: fp,
    });
}
/**
 * Evaluates heartbeat health based on elapsed time without ack
 */
export function evaluateConnectionHeartbeat(lastSentTime, lastAckTime, currentTime, warnThresholdMs = 5000, timeoutThresholdMs = 15000) {
    const elapsed = currentTime - lastAckTime;
    if (elapsed >= timeoutThresholdMs) {
        return {
            health: 'UNHEALTHY',
            isTimedOut: true,
            roundTripLatencyMs: elapsed,
        };
    }
    if (elapsed >= warnThresholdMs) {
        return {
            health: 'DEGRADED',
            isTimedOut: false,
            roundTripLatencyMs: elapsed,
        };
    }
    const latency = lastAckTime >= lastSentTime ? lastAckTime - lastSentTime : 0;
    return {
        health: 'HEALTHY',
        isTimedOut: false,
        roundTripLatencyMs: latency,
    };
}
