// src/core/connection/connectionSession.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Immutable remote connection session snapshots.
// Timestamps are strictly observational metadata and do NOT participate in identity calculation.

import type {
  ScopedConnectionIdentity,
  ConnectionCapability,
} from './connectionTypes.js';
import type { ConnectionState, SessionState } from './connectionStates.js';
import type { AuthState } from './connectionAuthentication.js';
import { deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';

export interface ConnectionSessionSnapshot {
  readonly sessionId: string;
  readonly connectionId: string;
  readonly peerId: string;
  readonly scopeIdentity: ScopedConnectionIdentity;
  readonly authenticationState: AuthState;
  readonly authorizationState: 'UNAUTHORIZED' | 'AUTHORIZED' | 'DENIED';
  readonly grantedCapabilities: readonly ConnectionCapability[];
  readonly sessionState: SessionState;
  readonly connectionState: ConnectionState;
  readonly lastReceivedSequence: number;
  readonly lastSentSequence: number;
  readonly lastAcknowledgedSequence: number;
  readonly heartbeatState: 'NORMAL' | 'WARN' | 'EXPIRED';
  readonly connectionHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  readonly pendingMessageCount: number;
  readonly observationalMetadata: Readonly<{
    readonly createdAt: string;
    readonly lastActiveAt: string;
    readonly totalSent: number;
    readonly totalReceived: number;
  }>;
  readonly fingerprint: string;
}

export interface CreateSessionParams {
  readonly sessionId: string;
  readonly connectionId: string;
  readonly peerId: string;
  readonly scopeIdentity: ScopedConnectionIdentity;
  readonly authenticationState?: AuthState;
  readonly authorizationState?: 'UNAUTHORIZED' | 'AUTHORIZED' | 'DENIED';
  readonly grantedCapabilities?: readonly ConnectionCapability[];
  readonly sessionState?: SessionState;
  readonly connectionState?: ConnectionState;
  readonly lastReceivedSequence?: number;
  readonly lastSentSequence?: number;
  readonly lastAcknowledgedSequence?: number;
  readonly heartbeatState?: 'NORMAL' | 'WARN' | 'EXPIRED';
  readonly connectionHealth?: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  readonly pendingMessageCount?: number;
  readonly observationalMetadata?: {
    readonly createdAt?: string;
    readonly lastActiveAt?: string;
    readonly totalSent?: number;
    readonly totalReceived?: number;
  };
}

/**
 * Creates an immutable, deterministic ConnectionSessionSnapshot
 */
export function createConnectionSessionSnapshot(params: CreateSessionParams): Readonly<ConnectionSessionSnapshot> {
  const fp = computeConnectionFingerprint({
    sessionId: params.sessionId,
    connectionId: params.connectionId,
    peerId: params.peerId,
    scopeIdentity: params.scopeIdentity,
    authenticationState: params.authenticationState ?? 'UNAUTHENTICATED',
    authorizationState: params.authorizationState ?? 'UNAUTHORIZED',
    grantedCapabilities: params.grantedCapabilities ?? [],
    sessionState: params.sessionState ?? 'CREATED',
    connectionState: params.connectionState ?? 'INITIALIZING',
    lastReceivedSequence: params.lastReceivedSequence ?? 0,
    lastSentSequence: params.lastSentSequence ?? 0,
    lastAcknowledgedSequence: params.lastAcknowledgedSequence ?? 0,
  });

  const now = new Date().toISOString();

  return deepFreeze({
    sessionId: params.sessionId,
    connectionId: params.connectionId,
    peerId: params.peerId,
    scopeIdentity: deepFreeze({ ...params.scopeIdentity }),
    authenticationState: params.authenticationState ?? 'UNAUTHENTICATED',
    authorizationState: params.authorizationState ?? 'UNAUTHORIZED',
    grantedCapabilities: Object.freeze([...(params.grantedCapabilities ?? [])]),
    sessionState: params.sessionState ?? 'CREATED',
    connectionState: params.connectionState ?? 'INITIALIZING',
    lastReceivedSequence: params.lastReceivedSequence ?? 0,
    lastSentSequence: params.lastSentSequence ?? 0,
    lastAcknowledgedSequence: params.lastAcknowledgedSequence ?? 0,
    heartbeatState: params.heartbeatState ?? 'NORMAL',
    connectionHealth: params.connectionHealth ?? 'HEALTHY',
    pendingMessageCount: params.pendingMessageCount ?? 0,
    observationalMetadata: deepFreeze({
      createdAt: params.observationalMetadata?.createdAt ?? now,
      lastActiveAt: params.observationalMetadata?.lastActiveAt ?? now,
      totalSent: params.observationalMetadata?.totalSent ?? 0,
      totalReceived: params.observationalMetadata?.totalReceived ?? 0,
    }),
    fingerprint: fp,
  });
}
