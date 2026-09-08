// src/core/relay/relayStates.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Canonical lifecycle states and authoritative classification predicates.

import type { RelaySessionState } from './relayTypes.js';

export const ALL_RELAY_SESSION_STATES: readonly RelaySessionState[] = Object.freeze([
  'DISCONNECTED',
  'DISCOVERING',
  'CONNECTING',
  'CONNECTED',
  'ADMISSION_PENDING',
  'ADMITTED',
  'SESSION_ESTABLISHING',
  'SESSION_ACTIVE',
  'DEGRADED',
  'RECONNECTING',
  'RESUMING',
  'SESSION_SUSPENDED',
  'TERMINATING',
  'TERMINATED',
  'REJECTED',
]);

/**
 * Returns true if the state is terminal (no further transitions permitted).
 */
export function isTerminalRelayState(state: RelaySessionState): boolean {
  return state === 'TERMINATED' || state === 'REJECTED';
}

/**
 * Returns true if the session is actively transmitting or capable of routing messages.
 */
export function isActiveRelaySession(state: RelaySessionState): boolean {
  return state === 'SESSION_ACTIVE' || state === 'DEGRADED';
}

/**
 * Returns true if the state is considered degraded or temporarily suspended but recoverable.
 */
export function isRecoverableRelayState(state: RelaySessionState): boolean {
  return (
    state === 'DEGRADED' ||
    state === 'SESSION_SUSPENDED' ||
    state === 'RECONNECTING' ||
    state === 'RESUMING'
  );
}

/**
 * Returns true if the state requires zero-trust admission validation.
 */
export function requiresAdmissionCheck(state: RelaySessionState): boolean {
  return state === 'CONNECTED' || state === 'ADMISSION_PENDING';
}

/**
 * Returns true if payload messages (REQUEST, EVENT, RESPONSE) can be forwarded.
 */
export function canTransmitPayload(state: RelaySessionState): boolean {
  return state === 'SESSION_ACTIVE' || state === 'DEGRADED';
}

/**
 * Returns true if in connection establishment or reconnection phase.
 */
export function isConnectingOrResuming(state: RelaySessionState): boolean {
  return (
    state === 'CONNECTING' ||
    state === 'SESSION_ESTABLISHING' ||
    state === 'RECONNECTING' ||
    state === 'RESUMING'
  );
}
