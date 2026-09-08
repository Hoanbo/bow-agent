// src/core/internet/internetAudit.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Append-only audit ledger for all Internet Edge security events.
// INVARIANT: Once written, audit events are immutable (frozen).
// INVARIANT: The ledger itself is append-only — no delete, no update.

import type { InternetEdgeSessionId } from './internetTypes.js';
import { InternetEdgeError } from './internetFailure.js';

/** All audit event types the Internet Edge can emit. */
export type InternetAuditEventType =
  | 'EDGE_RESOLVE_STARTED'
  | 'EDGE_CONNECT_STARTED'
  | 'EDGE_TLS_HANDSHAKE_STARTED'
  | 'EDGE_TLS_ACCEPTED'
  | 'EDGE_TLS_REJECTED'
  | 'EDGE_CERT_ADMITTED'
  | 'EDGE_CERT_REJECTED'
  | 'EDGE_ACTIVE'
  | 'EDGE_DEGRADED'
  | 'EDGE_ROAMING'
  | 'EDGE_RECONNECTING'
  | 'EDGE_RECONNECT_EXHAUSTED'
  | 'EDGE_HEALTH_PROBE'
  | 'EDGE_ADMISSION_TOKEN_ISSUED'
  | 'EDGE_ADMISSION_TOKEN_CONSUMED'
  | 'EDGE_RELAY_BOUND'
  | 'EDGE_RELAY_UNBOUND'
  | 'EDGE_REJECTED'
  | 'EDGE_CLOSED'
  | 'EDGE_DOWNGRADE_DETECTED';

/** Immutable audit event record. */
export interface InternetAuditEvent {
  readonly type: InternetAuditEventType;
  readonly timestamp: number;
  readonly sessionId?: InternetEdgeSessionId;
  readonly [key: string]: unknown;
}

/** The append-only ledger container. */
export interface InternetAuditLedger {
  readonly events: InternetAuditEvent[];
}

/**
 * Appends a new immutable event to the ledger.
 * The event object is frozen before insertion.
 */
export function appendInternetAuditEvent(
  ledger: InternetAuditLedger,
  event: Omit<InternetAuditEvent, 'timestamp'> & { timestamp?: number }
): void {
  const frozen = Object.freeze({
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  }) as InternetAuditEvent;
  ledger.events.push(frozen);
}

/**
 * Returns a shallow-frozen copy of the ledger events for safe external consumption.
 * Callers cannot mutate the returned array or its elements.
 */
export function snapshotInternetAuditLedger(ledger: InternetAuditLedger): readonly InternetAuditEvent[] {
  return Object.freeze([...ledger.events]);
}

/**
 * Filters audit events by session ID.
 */
export function getInternetAuditEventsForSession(
  ledger: InternetAuditLedger,
  sessionId: InternetEdgeSessionId
): readonly InternetAuditEvent[] {
  return ledger.events.filter((e) => e.sessionId === sessionId);
}

/**
 * Filters audit events by event type.
 */
export function getInternetAuditEventsByType(
  ledger: InternetAuditLedger,
  type: InternetAuditEventType
): readonly InternetAuditEvent[] {
  return ledger.events.filter((e) => e.type === type);
}

/**
 * Counts TLS rejection events in the ledger.
 * Used by health monitors and throttling logic.
 */
export function countInternetTlsRejections(ledger: InternetAuditLedger): number {
  return ledger.events.filter(
    (e) => e.type === 'EDGE_TLS_REJECTED' || e.type === 'EDGE_CERT_REJECTED'
  ).length;
}

/**
 * Asserts that the ledger has NOT exceeded a maximum TLS rejection burst.
 * Throws InternetEdgeError if the burst limit is reached.
 */
export function assertTlsRejectionBurstAllowed(
  ledger: InternetAuditLedger,
  maxBurst: number
): void {
  const count = countInternetTlsRejections(ledger);
  if (count >= maxBurst) {
    throw new InternetEdgeError(
      'INTERNET_OVERLOAD_REJECTED',
      `TLS rejection burst limit reached (${count} rejections >= ${maxBurst}). Connection rate-limited.`
    );
  }
}
