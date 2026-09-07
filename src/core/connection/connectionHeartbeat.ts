// src/core/connection/connectionHeartbeat.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - Heartbeat verifies transport connectivity ONLY.
// - Heartbeat MUST NEVER imply: task success, tool execution, verification, commit, approval, or Brain mutation.

import type { ScopedConnectionIdentity } from './connectionTypes.js';
import { createConnectionScope, deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';

export interface ConnectionHeartbeatSignal {
  readonly heartbeatId: string;
  readonly scope: string;
  readonly sequence: number;
  readonly sentAt: string;
  readonly fingerprint: string;
}

export interface ConnectionHeartbeatAck {
  readonly heartbeatId: string;
  readonly ackedSequence: number;
  readonly scope: string;
  readonly ackedAt: string;
  readonly fingerprint: string;
}

export interface ConnectionHeartbeatHealthStatus {
  readonly health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  readonly isTimedOut: boolean;
  readonly roundTripLatencyMs?: number;
}

export type HeartbeatHealthStatus = ConnectionHeartbeatHealthStatus;

/**
 * Creates an immutable ConnectionHeartbeatSignal
 */
export function createConnectionHeartbeatSignal(
  identity: ScopedConnectionIdentity,
  sequence: number,
  sentAt = new Date().toISOString()
): Readonly<ConnectionHeartbeatSignal> {
  const scope = createConnectionScope(identity);
  const fp = computeConnectionFingerprint({
    scope,
    sequence,
    type: 'HEARTBEAT_SIGNAL',
  });

  return deepFreeze({
    heartbeatId: `hbt_${fp}`,
    scope,
    sequence,
    sentAt,
    fingerprint: fp,
  });
}

/**
 * Creates an immutable ConnectionHeartbeatAck acknowledging a signal
 */
export function createConnectionHeartbeatAck(
  signal: ConnectionHeartbeatSignal,
  ackedAt = new Date().toISOString()
): Readonly<ConnectionHeartbeatAck> {
  const fp = computeConnectionFingerprint({
    heartbeatId: signal.heartbeatId,
    ackedSequence: signal.sequence,
    scope: signal.scope,
    type: 'HEARTBEAT_ACK',
  });

  return deepFreeze({
    heartbeatId: signal.heartbeatId,
    ackedSequence: signal.sequence,
    scope: signal.scope,
    ackedAt,
    fingerprint: fp,
  });
}

/**
 * Evaluates heartbeat health based on elapsed time without ack
 */
export function evaluateConnectionHeartbeat(
  lastSentTime: number,
  lastAckTime: number,
  currentTime: number,
  warnThresholdMs = 5000,
  timeoutThresholdMs = 15000
): HeartbeatHealthStatus {
  const elapsed = currentTime - lastAckTime;

  if (elapsed >= timeoutThresholdMs) {
    return {
      health: 'UNHEALTHY',
      isTimedOut: true,
      roundTripLatencyMs: elapsed,
    };
  }

  if (elapsed >= warnThresholdMs) {
    return {
      health: 'DEGRADED',
      isTimedOut: false,
      roundTripLatencyMs: elapsed,
    };
  }

  const latency = lastAckTime >= lastSentTime ? lastAckTime - lastSentTime : 0;
  return {
    health: 'HEALTHY',
    isTimedOut: false,
    roundTripLatencyMs: latency,
  };
}
