import type { InternetEdgeSessionId } from './internetTypes.js';
/** All audit event types the Internet Edge can emit. */
export type InternetAuditEventType = 'EDGE_RESOLVE_STARTED' | 'EDGE_CONNECT_STARTED' | 'EDGE_TLS_HANDSHAKE_STARTED' | 'EDGE_TLS_ACCEPTED' | 'EDGE_TLS_REJECTED' | 'EDGE_CERT_ADMITTED' | 'EDGE_CERT_REJECTED' | 'EDGE_ACTIVE' | 'EDGE_DEGRADED' | 'EDGE_ROAMING' | 'EDGE_RECONNECTING' | 'EDGE_RECONNECT_EXHAUSTED' | 'EDGE_HEALTH_PROBE' | 'EDGE_ADMISSION_TOKEN_ISSUED' | 'EDGE_ADMISSION_TOKEN_CONSUMED' | 'EDGE_RELAY_BOUND' | 'EDGE_RELAY_UNBOUND' | 'EDGE_REJECTED' | 'EDGE_CLOSED' | 'EDGE_DOWNGRADE_DETECTED';
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
export declare function appendInternetAuditEvent(ledger: InternetAuditLedger, event: Omit<InternetAuditEvent, 'timestamp'> & {
    timestamp?: number;
}): void;
/**
 * Returns a shallow-frozen copy of the ledger events for safe external consumption.
 * Callers cannot mutate the returned array or its elements.
 */
export declare function snapshotInternetAuditLedger(ledger: InternetAuditLedger): readonly InternetAuditEvent[];
/**
 * Filters audit events by session ID.
 */
export declare function getInternetAuditEventsForSession(ledger: InternetAuditLedger, sessionId: InternetEdgeSessionId): readonly InternetAuditEvent[];
/**
 * Filters audit events by event type.
 */
export declare function getInternetAuditEventsByType(ledger: InternetAuditLedger, type: InternetAuditEventType): readonly InternetAuditEvent[];
/**
 * Counts TLS rejection events in the ledger.
 * Used by health monitors and throttling logic.
 */
export declare function countInternetTlsRejections(ledger: InternetAuditLedger): number;
/**
 * Asserts that the ledger has NOT exceeded a maximum TLS rejection burst.
 * Throws InternetEdgeError if the burst limit is reached.
 */
export declare function assertTlsRejectionBurstAllowed(ledger: InternetAuditLedger, maxBurst: number): void;
