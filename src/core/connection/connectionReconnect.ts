// src/core/connection/connectionReconnect.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - Reconnect MUST NOT create another Brain.
// - Reconnect MUST NOT reset sequence.
// - Reconnect MUST NOT duplicate authoritative state.
// - Reconnect MUST NOT auto-execute interrupted actions.
// - Reconnect MUST validate scope, session, and sequence continuity.

import type { ScopedConnectionIdentity } from './connectionTypes.js';
import type { ConnectionSessionSnapshot } from './connectionSession.js';
import { assertConnectionScopeMatch, createConnectionScope, deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';

export interface ConnectionReconnectRequest {
  readonly reconnectId: string;
  readonly scope: string;
  readonly scopeIdentity: ScopedConnectionIdentity;
  readonly sessionId: string;
  readonly peerId: string;
  readonly lastReceivedSequence: number;
  readonly lastSentSequence: number;
  readonly fingerprint: string;
}

export interface ConnectionReconnectResult {
  readonly accepted: boolean;
  readonly sessionId: string;
  readonly resumeSequence: number;
  readonly error?: string;
  readonly fingerprint: string;
}

/**
 * Creates an immutable ConnectionReconnectRequest
 */
export function createConnectionReconnectRequest(
  identity: ScopedConnectionIdentity,
  sessionId: string,
  peerId: string,
  lastReceivedSequence: number,
  lastSentSequence: number
): Readonly<ConnectionReconnectRequest> {
  const scope = createConnectionScope(identity);
  const fp = computeConnectionFingerprint({
    scope,
    sessionId,
    peerId,
    lastReceivedSequence,
    lastSentSequence,
    type: 'RECONNECT_REQUEST',
  });

  return deepFreeze({
    reconnectId: `rec_${fp}`,
    scope,
    scopeIdentity: deepFreeze({ ...identity }),
    sessionId,
    peerId,
    lastReceivedSequence,
    lastSentSequence,
    fingerprint: fp,
  });
}

/**
 * Evaluates reconnection request against previous session snapshot
 */
export function evaluateConnectionReconnect(
  prevSnapshot: ConnectionSessionSnapshot,
  req: ConnectionReconnectRequest
): Readonly<ConnectionReconnectResult> {
  // 1. Validate scope matching
  try {
    assertConnectionScopeMatch(prevSnapshot.scopeIdentity, req.scopeIdentity);
  } catch (err: any) {
    return deepFreeze({
      accepted: false,
      sessionId: req.sessionId,
      resumeSequence: prevSnapshot.lastSentSequence,
      error: `SCOPE_MISMATCH: ${err.message}`,
      fingerprint: computeConnectionFingerprint({ error: 'SCOPE_MISMATCH' }),
    });
  }

  // 2. Validate session ID
  if (prevSnapshot.sessionId !== req.sessionId) {
    return deepFreeze({
      accepted: false,
      sessionId: req.sessionId,
      resumeSequence: prevSnapshot.lastSentSequence,
      error: `SESSION_MISMATCH: expected ${prevSnapshot.sessionId}, got ${req.sessionId}`,
      fingerprint: computeConnectionFingerprint({ error: 'SESSION_MISMATCH' }),
    });
  }

  // 3. Validate peer ID
  if (prevSnapshot.peerId !== req.peerId) {
    return deepFreeze({
      accepted: false,
      sessionId: req.sessionId,
      resumeSequence: prevSnapshot.lastSentSequence,
      error: `PEER_MISMATCH: expected ${prevSnapshot.peerId}, got ${req.peerId}`,
      fingerprint: computeConnectionFingerprint({ error: 'PEER_MISMATCH' }),
    });
  }

  // 4. Validate sequence continuity (client received sequence cannot be greater than what server sent)
  if (req.lastReceivedSequence > prevSnapshot.lastSentSequence) {
    return deepFreeze({
      accepted: false,
      sessionId: req.sessionId,
      resumeSequence: prevSnapshot.lastSentSequence,
      error: `SEQUENCE_CONTINUITY_VIOLATION: client claims sequence ${req.lastReceivedSequence} but server only sent ${prevSnapshot.lastSentSequence}`,
      fingerprint: computeConnectionFingerprint({ error: 'SEQUENCE_CONTINUITY_VIOLATION' }),
    });
  }

  const fp = computeConnectionFingerprint({
    accepted: true,
    sessionId: req.sessionId,
    resumeSequence: prevSnapshot.lastSentSequence,
  });

  return deepFreeze({
    accepted: true,
    sessionId: req.sessionId,
    resumeSequence: prevSnapshot.lastSentSequence,
    fingerprint: fp,
  });
}
