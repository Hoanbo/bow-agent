// src/core/connection/connectionTimeout.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Typed timeout classification and evaluation.
import { createConnectionScope, deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
export const TIMEOUT_CATEGORIES = [
    'CONNECT_TIMEOUT',
    'HANDSHAKE_TIMEOUT',
    'AUTH_TIMEOUT',
    'AUTHORIZATION_TIMEOUT',
    'IDLE_TIMEOUT',
    'HEARTBEAT_TIMEOUT',
    'MESSAGE_TIMEOUT',
    'RECONNECT_TIMEOUT',
];
/**
 * Creates an immutable, deterministic ConnectionTimeoutDescriptor
 */
export function createConnectionTimeoutDescriptor(identity, category, elapsedMs, thresholdMs, occurredAt = new Date().toISOString()) {
    const scope = createConnectionScope(identity);
    const fp = computeConnectionFingerprint({
        scope,
        category,
        thresholdMs,
    });
    return deepFreeze({
        timeoutId: `tout_${fp}`,
        scope,
        category,
        elapsedMs,
        thresholdMs,
        occurredAt,
        fingerprint: fp,
    });
}
/**
 * Evaluates whether elapsed time has exceeded thresholdMs
 */
export function hasTimedOut(startTimeMs, currentTimeMs, thresholdMs) {
    return currentTimeMs - startTimeMs >= thresholdMs;
}
