// src/core/connection/connectionStates.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative state taxonomy for bidirectional connection and session runtimes.

/**
 * 14 Canonical Connection States
 */
export const CONNECTION_STATES = [
  'INITIALIZING',
  'CONNECTING',
  'CONNECTED',
  'AUTHENTICATING',
  'AUTHENTICATED',
  'AUTHORIZING',
  'AUTHORIZED',
  'READY',
  'DEGRADED',
  'RECONNECTING',
  'DISCONNECTING',
  'DISCONNECTED',
  'FAILED',
  'CLOSED',
] as const;

export type ConnectionState = (typeof CONNECTION_STATES)[number];

/**
 * 9 Canonical Session States
 */
export const SESSION_STATES = [
  'CREATED',
  'NEGOTIATING',
  'ESTABLISHED',
  'ACTIVE',
  'IDLE',
  'RESUMING',
  'SUSPENDED',
  'EXPIRED',
  'TERMINATED',
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

/**
 * Type guard for ConnectionState
 */
export function isConnectionState(val: unknown): val is ConnectionState {
  return typeof val === 'string' && CONNECTION_STATES.includes(val as ConnectionState);
}

/**
 * Type guard for SessionState
 */
export function isSessionState(val: unknown): val is SessionState {
  return typeof val === 'string' && SESSION_STATES.includes(val as SessionState);
}

/**
 * Checks if a connection is in an active operational state capable of message transfer
 */
export function isConnectionStateOperational(state: ConnectionState): boolean {
  return state === 'READY' || state === 'DEGRADED';
}

/**
 * Checks if a connection is in a terminal/closed state
 */
export function isConnectionStateTerminal(state: ConnectionState): boolean {
  return state === 'FAILED' || state === 'CLOSED' || state === 'DISCONNECTED';
}

/**
 * Checks if a session is currently valid and active
 */
export function isSessionActive(state: SessionState): boolean {
  return state === 'ESTABLISHED' || state === 'ACTIVE' || state === 'IDLE';
}

/**
 * Checks if a session is in a terminal state
 */
export function isSessionTerminal(state: SessionState): boolean {
  return state === 'EXPIRED' || state === 'TERMINATED';
}
