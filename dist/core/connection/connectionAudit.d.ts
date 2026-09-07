import type { ScopedConnectionIdentity, ConnectionAuditEventType } from './connectionTypes.js';
export interface ConnectionAuditRecord {
    readonly auditId: string;
    readonly scope: string;
    readonly eventType: ConnectionAuditEventType;
    readonly details: Readonly<Record<string, unknown>>;
    readonly timestamp: string;
    readonly fingerprint: string;
}
/**
 * Creates an immutable ConnectionAuditRecord
 */
export declare function createConnectionAuditRecord(identity: ScopedConnectionIdentity, eventType: ConnectionAuditEventType, rawDetails?: Record<string, unknown>, timestamp?: string): Readonly<ConnectionAuditRecord>;
/**
 * In-memory audit ledger for connection sessions
 */
export declare class ConnectionAuditLedger {
    private readonly records;
    record(audit: ConnectionAuditRecord): void;
    getRecords(scope?: string): readonly ConnectionAuditRecord[];
    clear(): void;
}
