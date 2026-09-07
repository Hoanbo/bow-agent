// src/core/connection/connectionTransitions.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative transition matrices for ConnectionState and SessionState.
// Every invalid transition fails closed.

import type { ConnectionState, SessionState } from './connectionStates.js';

export const CONNECTION_TRANSITION_MATRIX: Readonly<Record<ConnectionState, readonly ConnectionState[]>> = Object.freeze({
  INITIALIZING: Object.freeze<ConnectionState[]>(['CONNECTING', 'FAILED', 'CLOSED']),
  CONNECTING: Object.freeze<ConnectionState[]>(['CONNECTED', 'FAILED', 'DISCONNECTED', 'CLOSED']),
  CONNECTED: Object.freeze<ConnectionState[]>(['AUTHENTICATING', 'DISCONNECTING', 'DISCONNECTED', 'FAILED', 'CLOSED']),
  AUTHENTICATING: Object.freeze<ConnectionState[]>(['AUTHENTICATED', 'FAILED', 'DISCONNECTED', 'CLOSED']),
  AUTHENTICATED: Object.freeze<ConnectionState[]>(['AUTHORIZING', 'FAILED', 'DISCONNECTED', 'CLOSED']),
  AUTHORIZING: Object.freeze<ConnectionState[]>(['AUTHORIZED', 'FAILED', 'DISCONNECTED', 'CLOSED']),
  AUTHORIZED: Object.freeze<ConnectionState[]>(['READY', 'FAILED', 'DISCONNECTED', 'CLOSED']),
  READY: Object.freeze<ConnectionState[]>(['DEGRADED', 'RECONNECTING', 'DISCONNECTING', 'DISCONNECTED', 'FAILED', 'CLOSED']),
  DEGRADED: Object.freeze<ConnectionState[]>(['READY', 'RECONNECTING', 'DISCONNECTING', 'DISCONNECTED', 'FAILED', 'CLOSED']),
  RECONNECTING: Object.freeze<ConnectionState[]>(['CONNECTED', 'READY', 'FAILED', 'DISCONNECTED', 'CLOSED']),
  DISCONNECTING: Object.freeze<ConnectionState[]>(['DISCONNECTED', 'FAILED', 'CLOSED']),
  DISCONNECTED: Object.freeze<ConnectionState[]>(['RECONNECTING', 'CLOSED']),
  FAILED: Object.freeze<ConnectionState[]>(['CLOSED']),
  CLOSED: Object.freeze<ConnectionState[]>([]),
});

export const SESSION_TRANSITION_MATRIX: Readonly<Record<SessionState, readonly SessionState[]>> = Object.freeze({
  CREATED: Object.freeze<SessionState[]>(['NEGOTIATING', 'TERMINATED', 'EXPIRED']),
  NEGOTIATING: Object.freeze<SessionState[]>(['ESTABLISHED', 'TERMINATED', 'EXPIRED']),
  ESTABLISHED: Object.freeze<SessionState[]>(['ACTIVE', 'IDLE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
  ACTIVE: Object.freeze<SessionState[]>(['IDLE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
  IDLE: Object.freeze<SessionState[]>(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
  SUSPENDED: Object.freeze<SessionState[]>(['RESUMING', 'TERMINATED', 'EXPIRED']),
  RESUMING: Object.freeze<SessionState[]>(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']),
  EXPIRED: Object.freeze<SessionState[]>(['TERMINATED']),
  TERMINATED: Object.freeze<SessionState[]>([]),
});

/**
 * Validates whether a connection transition from -> to is permissible.
 */
export function isValidConnectionStateTransition(from: ConnectionState, to: ConnectionState): boolean {
  if (from === to) return true; // Idempotent no-op
  const allowed = CONNECTION_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts valid connection transition, failing closed on violation.
 */
export function assertValidConnectionStateTransition(from: ConnectionState, to: ConnectionState): void {
  if (!isValidConnectionStateTransition(from, to)) {
    throw new Error(`[CONNECTION_TRANSITION_ERROR] Invalid connection transition: ${from} -> ${to}`);
  }
}

/**
 * Validates whether a session transition from -> to is permissible.
 */
export function isValidSessionTransition(from: SessionState, to: SessionState): boolean {
  if (from === to) return true; // Idempotent no-op
  const allowed = SESSION_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts valid session transition, failing closed on violation.
 */
export function assertValidSessionTransition(from: SessionState, to: SessionState): void {
  if (!isValidSessionTransition(from, to)) {
    throw new Error(`[SESSION_TRANSITION_ERROR] Invalid session transition: ${from} -> ${to}`);
  }
}
