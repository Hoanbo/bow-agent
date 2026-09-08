// src/core/internet/internetTransitions.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Fail-closed state transition matrix for the Internet Edge lifecycle.
// Any transition not explicitly listed is ILLEGAL and throws InternetEdgeError.
import { InternetEdgeError } from './internetFailure.js';
/**
 * Explicit, exhaustive transition matrix.
 * Keys are source states; values are the set of legal destination states.
 *
 * INVARIANT: Terminal states (CLOSED, REJECTED) have empty target sets.
 * INVARIANT: INTERNET_REJECTED is reachable from all non-terminal states.
 */
export const INTERNET_TRANSITIONS = Object.freeze({
    INTERNET_OFFLINE: [
        'INTERNET_RESOLVING',
        'INTERNET_CLOSED',
    ],
    INTERNET_RESOLVING: [
        'INTERNET_CONNECTING',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_CONNECTING: [
        'INTERNET_TLS_HANDSHAKING',
        'INTERNET_OFFLINE',
        'INTERNET_RECONNECTING',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_TLS_HANDSHAKING: [
        'INTERNET_CERT_VALIDATING',
        'INTERNET_OFFLINE',
        'INTERNET_RECONNECTING',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_CERT_VALIDATING: [
        'INTERNET_ADMITTED',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_ADMITTED: [
        'INTERNET_RELAY_BINDING',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_RELAY_BINDING: [
        'INTERNET_ACTIVE',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_ACTIVE: [
        'INTERNET_DEGRADED',
        'INTERNET_ROAMING',
        'INTERNET_RECONNECTING',
        'INTERNET_DRAINING',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_DEGRADED: [
        'INTERNET_ACTIVE',
        'INTERNET_ROAMING',
        'INTERNET_RECONNECTING',
        'INTERNET_DRAINING',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_ROAMING: [
        'INTERNET_RESOLVING',
        'INTERNET_CONNECTING',
        'INTERNET_TLS_HANDSHAKING',
        'INTERNET_ACTIVE',
        'INTERNET_RECONNECTING',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_RECONNECTING: [
        'INTERNET_CONNECTING',
        'INTERNET_TLS_HANDSHAKING',
        'INTERNET_ACTIVE',
        'INTERNET_OFFLINE',
        'INTERNET_CLOSED',
        'INTERNET_REJECTED',
    ],
    INTERNET_DRAINING: [
        'INTERNET_CLOSED',
    ],
    INTERNET_CLOSED: [],
    INTERNET_REJECTED: [],
});
/**
 * Returns true if transitioning from → to is a permitted step.
 * Self-transitions (from === to) are always allowed.
 */
export function isValidInternetTransition(from, to) {
    if (from === to)
        return true;
    const allowed = INTERNET_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
/**
 * Asserts that from → to is a legal transition.
 * Throws InternetEdgeError (code INTERNET_ILLEGAL_TRANSITION) on violation.
 */
export function assertValidInternetTransition(from, to, context) {
    if (!isValidInternetTransition(from, to)) {
        throw new InternetEdgeError('INTERNET_ILLEGAL_TRANSITION', `Illegal Internet Edge state transition "${from}" → "${to}"${context ? ` [${context}]` : ''}. Transition blocked fail-closed.`);
    }
}
