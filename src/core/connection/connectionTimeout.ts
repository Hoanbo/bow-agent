// src/core/connection/connectionTimeout.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Typed timeout classification and evaluation.

import type { ScopedConnectionIdentity } from './connectionTypes.js';
import { createConnectionScope, deepFreeze } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';

export const TIMEOUT_CATEGORIES = [
  'CONNECT_TIMEOUT',
  'HANDSHAKE_TIMEOUT',
  'AUTH_TIMEOUT',
  'AUTHORIZATION_TIMEOUT',
  'IDLE_TIMEOUT',
  'HEARTBEAT_TIMEOUT',
  'MESSAGE_TIMEOUT',
  'RECONNECT_TIMEOUT',
] as const;

export type ConnectionTimeoutCategory = (typeof TIMEOUT_CATEGORIES)[number];

export interface ConnectionTimeoutDescriptor {
  readonly timeoutId: string;
  readonly scope: string;
  readonly category: ConnectionTimeoutCategory;
  readonly elapsedMs: number;
  readonly thresholdMs: number;
  readonly occurredAt: string;
  readonly fingerprint: string;
}

/**
 * Creates an immutable, deterministic ConnectionTimeoutDescriptor
 */
export function createConnectionTimeoutDescriptor(
  identity: ScopedConnectionIdentity,
  category: ConnectionTimeoutCategory,
  elapsedMs: number,
  thresholdMs: number,
  occurredAt = new Date().toISOString()
): Readonly<ConnectionTimeoutDescriptor> {
  const scope = createConnectionScope(identity);
  const fp = computeConnectionFingerprint({
    scope,
    category,
    thresholdMs,
  });

  return deepFreeze({
    timeoutId: `tout_${fp}`,
    scope,
    category,
    elapsedMs,
    thresholdMs,
    occurredAt,
    fingerprint: fp,
  });
}

/**
 * Evaluates whether elapsed time has exceeded thresholdMs
 */
export function hasTimedOut(startTimeMs: number, currentTimeMs: number, thresholdMs: number): boolean {
  return currentTimeMs - startTimeMs >= thresholdMs;
}
