// src/core/internet/internetAudit.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Append-only audit ledger for all Internet Edge security events.
// INVARIANT: Once written, audit events are immutable (frozen).
// INVARIANT: The ledger itself is append-only — no delete, no update.
import { InternetEdgeError } from './internetFailure.js';
/**
 * Appends a new immutable event to the ledger.
 * The event object is frozen before insertion.
 */
export function appendInternetAuditEvent(ledger, event) {
    const frozen = Object.freeze({
        ...event,
        timestamp: event.timestamp ?? Date.now(),
    });
    ledger.events.push(frozen);
}
/**
 * Returns a shallow-frozen copy of the ledger events for safe external consumption.
 * Callers cannot mutate the returned array or its elements.
 */
export function snapshotInternetAuditLedger(ledger) {
    return Object.freeze([...ledger.events]);
}
/**
 * Filters audit events by session ID.
 */
export function getInternetAuditEventsForSession(ledger, sessionId) {
    return ledger.events.filter((e) => e.sessionId === sessionId);
}
/**
 * Filters audit events by event type.
 */
export function getInternetAuditEventsByType(ledger, type) {
    return ledger.events.filter((e) => e.type === type);
}
/**
 * Counts TLS rejection events in the ledger.
 * Used by health monitors and throttling logic.
 */
export function countInternetTlsRejections(ledger) {
    return ledger.events.filter((e) => e.type === 'EDGE_TLS_REJECTED' || e.type === 'EDGE_CERT_REJECTED').length;
}
/**
 * Asserts that the ledger has NOT exceeded a maximum TLS rejection burst.
 * Throws InternetEdgeError if the burst limit is reached.
 */
export function assertTlsRejectionBurstAllowed(ledger, maxBurst) {
    const count = countInternetTlsRejections(ledger);
    if (count >= maxBurst) {
        throw new InternetEdgeError('INTERNET_OVERLOAD_REJECTED', `TLS rejection burst limit reached (${count} rejections >= ${maxBurst}). Connection rate-limited.`);
    }
}
