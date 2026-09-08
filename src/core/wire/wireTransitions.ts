// src/core/wire/wireTransitions.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Finite State Transition Matrix for Physical Wire Connections.
// Strictly enforces fail-closed state management and blocks illegal state jumps.

import type { WireConnectionState } from './wireStates.js';
import { WireTransportError } from './wireFailure.js';

export const WIRE_TRANSITIONS: Readonly<Record<WireConnectionState, readonly WireConnectionState[]>> = {
  WIRE_DISCONNECTED: ['WIRE_CONNECTING', 'WIRE_CLOSED'],
  WIRE_CONNECTING: ['WIRE_CONNECTED', 'WIRE_RECONNECTING', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_CONNECTED: ['WIRE_HANDSHAKING', 'WIRE_DISCONNECTED', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_HANDSHAKING: ['WIRE_VALIDATING', 'WIRE_DISCONNECTED', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_VALIDATING: ['WIRE_ADMISSION_PENDING', 'WIRE_ADMITTED', 'WIRE_DISCONNECTED', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_ADMISSION_PENDING: ['WIRE_ADMITTED', 'WIRE_DISCONNECTED', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_ADMITTED: ['WIRE_SESSION_BINDING', 'WIRE_DISCONNECTED', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_SESSION_BINDING: ['WIRE_ACTIVE', 'WIRE_DISCONNECTED', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_ACTIVE: ['WIRE_DEGRADED', 'WIRE_RECONNECTING', 'WIRE_RESUMING', 'WIRE_DRAINING', 'WIRE_CLOSED', 'WIRE_REJECTED', 'WIRE_DISCONNECTED'],
  WIRE_DEGRADED: ['WIRE_ACTIVE', 'WIRE_RECONNECTING', 'WIRE_DRAINING', 'WIRE_CLOSED', 'WIRE_REJECTED', 'WIRE_DISCONNECTED'],
  WIRE_RECONNECTING: ['WIRE_CONNECTED', 'WIRE_RESUMING', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_RESUMING: ['WIRE_ACTIVE', 'WIRE_RECONNECTING', 'WIRE_CLOSED', 'WIRE_REJECTED'],
  WIRE_DRAINING: ['WIRE_CLOSED'],
  WIRE_CLOSED: [],
  WIRE_REJECTED: [],
};

/**
 * Checks whether transitioning from `from` to `to` is legally permitted.
 */
export function isValidWireTransition(from: WireConnectionState, to: WireConnectionState): boolean {
  if (from === to) return true;
  const allowed = WIRE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that transitioning from `from` to `to` is legally permitted.
 * Throws a typed WireTransportError if transition is illegal.
 */
export function assertValidWireTransition(
  from: WireConnectionState,
  to: WireConnectionState,
  context?: string
): void {
  if (!isValidWireTransition(from, to)) {
    throw new WireTransportError(
      'WIRE_ILLEGAL_STATE_TRANSITION',
      `Illegal wire state transition from "${from}" to "${to}"${context ? ` [${context}]` : ''}. Transition blocked fail-closed.`
    );
  }
}
