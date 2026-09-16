import { type PolicyLifecycleAuditEvent, type LifecycleAuditEventType } from './GovernedPolicyLifecycleTypes.js';
export interface AuditEventParams {
    eventType: LifecycleAuditEventType;
    tenantId: string;
    policyDomain?: any;
    policyId?: string;
    policyVersion?: number;
    lifecycleVersion?: number;
    fromState?: any;
    toState?: any;
    operatorId?: string;
    details?: Record<string, unknown>;
}
export declare class PolicyLifecycleAuditLedger {
    private readonly ledgerStore;
    private readonly ledgerBasePath;
    constructor(customBasePath?: string);
    /**
     * Append an immutable, hash-chained operational audit event.
     */
    recordEvent(params: AuditEventParams): PolicyLifecycleAuditEvent;
    /**
     * Verify the cryptographic hash chain of the ledger for a tenant.
     */
    verifyLedgerIntegrity(tenantId: string): {
        verified: boolean;
        eventCount: number;
        error?: string;
    };
    getEvents(tenantId: string): readonly PolicyLifecycleAuditEvent[];
    private appendToFile;
    private scrubSecrets;
    private validateTenant;
}
