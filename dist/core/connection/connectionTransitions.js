// src/core/connection/connectionTransitions.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative transition matrices for ConnectionState and SessionState.
// Every invalid transition fails closed.
export const CONNECTION_TRANSITION_MATRIX = Object.freeze({
    INITIALIZING: Object.freeze(['CONNECTING', 'FAILED', 'CLOSED']),
    CONNECTING: Object.freeze(['CONNECTED', 'FAILED', 'DISCONNECTED', 'CLOSED']),
    CONNECTED: Object.freeze(['AUTHENTICATING', 'DISCONNECTING', 'DISCONNECTED', 'FAILED', 'CLOSED']),
    AUTHENTICATING: Object.freeze(['AUTHENTICATED', 'FAILED', 'DISCONNECTED', 'CLOSED']),
    AUTHENTICATED: Object.freeze(['AUTHORIZING', 'FAILED', 'DISCONNECTED', 'CLOSED']),
    AUTHORIZING: Object.freeze(['AUTHORIZED', 'FAILED', 'DISCONNECTED', 'CLOSED']),
    AUTHORIZED: Object.freeze(['READY', 'FAILED', 'DISCONNECTED', 'CLOSED']),
    READY: Object.freeze(['DEGRADED', 'RECONNECTING', 'DISCONNECTING', 'DISCONNECTED', 'FAILED', 'CLOSED']),
    DEGRADED: Object.freeze(['READY', 'RECONNECTING', 'DISCONNECTING', 'DISCONNECTED', 'FAILED', 'CLOSED']),
    RECONNECTING: Object.freeze(['CONNECTED', 'READY', 'FAILED', 'DISCONNECTED', 'CLOSED']),
    DISCONNECTING: Object.freeze(['DISCONNECTED', 'FAILED', 'CLOSED']),
    DISCONNECTED: Object.freeze(['RECONNECTING', 'CLOSED']),
    FAILED: Object.freeze(['CLOSED']),
    CLOSED: Object.freeze([]),
});
export const SESSION_TRANSITION_MATRIX = Object.freeze({
    CREATED: Object.freeze(['NEGOTIATING', 'TERMINATED', 'EXPIRED']),
    NEGOTIATING: Object.freeze(['ESTABLISHED', 'TERMINATED', 'EXPIRED']),
    ESTABLISHED: Object.freeze(['ACTIVE', 'IDLE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
    ACTIVE: Object.freeze(['IDLE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
    IDLE: Object.freeze(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
    SUSPENDED: Object.freeze(['RESUMING', 'TERMINATED', 'EXPIRED']),
    RESUMING: Object.freeze(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
    EXPIRED: Object.freeze(['TERMINATED']),
    TERMINATED: Object.freeze([]),
});
/**
 * Validates whether a connection transition from -> to is permissible.
 */
export function isValidConnectionStateTransition(from, to) {
    if (from === to)
        return true; // Idempotent no-op
    const allowed = CONNECTION_TRANSITION_MATRIX[from];
    return allowed ? allowed.includes(to) : false;
}
/**
 * Asserts valid connection transition, failing closed on violation.
 */
export function assertValidConnectionStateTransition(from, to) {
    if (!isValidConnectionStateTransition(from, to)) {
        throw new Error(`[CONNECTION_TRANSITION_ERROR] Invalid connection transition: ${from} -> ${to}`);
    }
}
/**
 * Validates whether a session transition from -> to is permissible.
 */
export function isValidSessionTransition(from, to) {
    if (from === to)
        return true; // Idempotent no-op
    const allowed = SESSION_TRANSITION_MATRIX[from];
    return allowed ? allowed.includes(to) : false;
}
/**
 * Asserts valid session transition, failing closed on violation.
 */
export function assertValidSessionTransition(from, to) {
    if (!isValidSessionTransition(from, to)) {
        throw new Error(`[SESSION_TRANSITION_ERROR] Invalid session transition: ${from} -> ${to}`);
    }
}
