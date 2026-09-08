// src/core/relay/relayTransitions.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Fail-closed state transitions for Relay Session Lifecycle.
export class RelayTransitionError extends Error {
    fromState;
    toState;
    constructor(fromState, toState, message) {
        super(message ||
            `ILLEGAL_RELAY_TRANSITION: Cannot transition from ${fromState} to ${toState}. Fail-closed.`);
        this.fromState = fromState;
        this.toState = toState;
        this.name = 'RelayTransitionError';
    }
}
export const RELAY_TRANSITIONS = Object.freeze({
    DISCONNECTED: Object.freeze(['DISCOVERING', 'CONNECTING', 'TERMINATED']),
    DISCOVERING: Object.freeze(['CONNECTING', 'DISCONNECTED', 'REJECTED']),
    CONNECTING: Object.freeze(['CONNECTED', 'DISCONNECTED', 'REJECTED']),
    CONNECTED: Object.freeze(['ADMISSION_PENDING', 'TERMINATING', 'DISCONNECTED', 'REJECTED']),
    ADMISSION_PENDING: Object.freeze(['ADMITTED', 'REJECTED', 'DISCONNECTED']),
    ADMITTED: Object.freeze(['SESSION_ESTABLISHING', 'REJECTED', 'TERMINATING', 'DISCONNECTED']),
    SESSION_ESTABLISHING: Object.freeze(['SESSION_ACTIVE', 'REJECTED', 'DISCONNECTED']),
    SESSION_ACTIVE: Object.freeze([
        'DEGRADED',
        'RECONNECTING',
        'RESUMING',
        'SESSION_SUSPENDED',
        'TERMINATING',
        'DISCONNECTED',
    ]),
    DEGRADED: Object.freeze([
        'SESSION_ACTIVE',
        'RECONNECTING',
        'SESSION_SUSPENDED',
        'TERMINATING',
        'DISCONNECTED',
    ]),
    RECONNECTING: Object.freeze([
        'RESUMING',
        'CONNECTED',
        'SESSION_SUSPENDED',
        'TERMINATING',
        'DISCONNECTED',
        'REJECTED',
    ]),
    RESUMING: Object.freeze([
        'SESSION_ACTIVE',
        'SESSION_SUSPENDED',
        'TERMINATING',
        'REJECTED',
        'DISCONNECTED',
    ]),
    SESSION_SUSPENDED: Object.freeze([
        'RECONNECTING',
        'RESUMING',
        'TERMINATING',
        'TERMINATED',
        'DISCONNECTED',
    ]),
    TERMINATING: Object.freeze(['TERMINATED', 'DISCONNECTED']),
    TERMINATED: Object.freeze([]),
    REJECTED: Object.freeze([]),
});
/**
 * Checks if a transition between two states is valid under the fail-closed matrix.
 */
export function canTransitionRelaySession(fromState, toState) {
    if (fromState === toState)
        return true;
    const allowed = RELAY_TRANSITIONS[fromState];
    return allowed ? allowed.includes(toState) : false;
}
/**
 * Asserts that a transition is valid, throwing a RelayTransitionError if invalid.
 */
export function assertValidRelayTransition(fromState, toState) {
    if (!canTransitionRelaySession(fromState, toState)) {
        throw new RelayTransitionError(fromState, toState);
    }
}
