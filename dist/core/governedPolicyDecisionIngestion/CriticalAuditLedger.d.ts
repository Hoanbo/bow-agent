import { type IngestionAuditEvent, type IngestionAuditEventType } from './GovernedPolicyDecisionIngestionTypes.js';
/**
 * Local single-writer evidence ledger. It records governance outcomes but never
 * grants authority. Every load verifies the complete tenant-local hash chain.
 */
export declare class CriticalAuditLedger {
    private events;
    private readonly ledgerPath;
    constructor(ledgerPath?: string);
    append(eventType: IngestionAuditEventType, tenantId: string, details: Record<string, unknown>, context?: Partial<Omit<IngestionAuditEvent, 'eventId' | 'eventType' | 'tenantId' | 'details' | 'timestamp' | 'prevHash' | 'eventHash'>>): IngestionAuditEvent;
    verify(): void;
    listForTenant(tenantId: string): readonly IngestionAuditEvent[];
    private loadAndVerify;
    private verifyEvents;
    private persist;
    private acquireLock;
}
