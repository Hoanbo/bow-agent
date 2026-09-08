// src/core/relay/relayTransitions.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Fail-closed state transitions for Relay Session Lifecycle.

import type { RelaySessionState } from './relayTypes.js';

export class RelayTransitionError extends Error {
  constructor(
    public readonly fromState: RelaySessionState,
    public readonly toState: RelaySessionState,
    message?: string
  ) {
    super(
      message ||
        `ILLEGAL_RELAY_TRANSITION: Cannot transition from ${fromState} to ${toState}. Fail-closed.`
    );
    this.name = 'RelayTransitionError';
  }
}

export const RELAY_TRANSITIONS: Readonly<Record<RelaySessionState, readonly RelaySessionState[]>> =
  Object.freeze<Record<RelaySessionState, readonly RelaySessionState[]>>({
    DISCONNECTED: Object.freeze<RelaySessionState[]>(['DISCOVERING', 'CONNECTING', 'TERMINATED']),
    DISCOVERING: Object.freeze<RelaySessionState[]>(['CONNECTING', 'DISCONNECTED', 'REJECTED']),
    CONNECTING: Object.freeze<RelaySessionState[]>(['CONNECTED', 'DISCONNECTED', 'REJECTED']),
    CONNECTED: Object.freeze<RelaySessionState[]>(['ADMISSION_PENDING', 'TERMINATING', 'DISCONNECTED', 'REJECTED']),
    ADMISSION_PENDING: Object.freeze<RelaySessionState[]>(['ADMITTED', 'REJECTED', 'DISCONNECTED']),
    ADMITTED: Object.freeze<RelaySessionState[]>(['SESSION_ESTABLISHING', 'REJECTED', 'TERMINATING', 'DISCONNECTED']),
    SESSION_ESTABLISHING: Object.freeze<RelaySessionState[]>(['SESSION_ACTIVE', 'REJECTED', 'DISCONNECTED']),
    SESSION_ACTIVE: Object.freeze<RelaySessionState[]>([
      'DEGRADED',
      'RECONNECTING',
      'RESUMING',
      'SESSION_SUSPENDED',
      'TERMINATING',
      'DISCONNECTED',
    ]),
    DEGRADED: Object.freeze<RelaySessionState[]>([
      'SESSION_ACTIVE',
      'RECONNECTING',
      'SESSION_SUSPENDED',
      'TERMINATING',
      'DISCONNECTED',
    ]),
    RECONNECTING: Object.freeze<RelaySessionState[]>([
      'RESUMING',
      'CONNECTED',
      'SESSION_SUSPENDED',
      'TERMINATING',
      'DISCONNECTED',
      'REJECTED',
    ]),
    RESUMING: Object.freeze<RelaySessionState[]>([
      'SESSION_ACTIVE',
      'SESSION_SUSPENDED',
      'TERMINATING',
      'REJECTED',
      'DISCONNECTED',
    ]),
    SESSION_SUSPENDED: Object.freeze<RelaySessionState[]>([
      'RECONNECTING',
      'RESUMING',
      'TERMINATING',
      'TERMINATED',
      'DISCONNECTED',
    ]),
    TERMINATING: Object.freeze<RelaySessionState[]>(['TERMINATED', 'DISCONNECTED']),
    TERMINATED: Object.freeze<RelaySessionState[]>([]),
    REJECTED: Object.freeze<RelaySessionState[]>([]),
  });

/**
 * Checks if a transition between two states is valid under the fail-closed matrix.
 */
export function canTransitionRelaySession(
  fromState: RelaySessionState,
  toState: RelaySessionState
): boolean {
  if (fromState === toState) return true;
  const allowed = RELAY_TRANSITIONS[fromState];
  return allowed ? allowed.includes(toState) : false;
}

/**
 * Asserts that a transition is valid, throwing a RelayTransitionError if invalid.
 */
export function assertValidRelayTransition(
  fromState: RelaySessionState,
  toState: RelaySessionState
): void {
  if (!canTransitionRelaySession(fromState, toState)) {
    throw new RelayTransitionError(fromState, toState);
  }
}
