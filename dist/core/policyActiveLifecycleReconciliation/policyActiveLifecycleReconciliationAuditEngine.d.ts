import { type AuditLedger } from '../auditLedger.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
export declare const POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN = "POLICY_ACTIVE_LIFECYCLE_RECONCILIATION";
export interface LifecycleReconciliationAuditEvent {
    readonly eventType: 'LIFECYCLE_RECONCILIATION_STARTED' | 'ACTIVE_POLICY_RESOLVED' | 'RUNTIME_POLICY_RECONCILIATION_STARTED' | 'RUNTIME_POLICY_DRIFT_DETECTED' | 'PDP_RECONCILIATION_COMPLETED' | 'PEP_RECONCILIATION_COMPLETED' | 'VERSION_CONSISTENCY_VERIFIED' | 'ROLLBACK_CONSISTENCY_VERIFIED' | 'SUNSET_CONSISTENCY_VERIFIED' | 'RECOVERY_CONSISTENCY_VERIFIED' | 'PROVENANCE_CONSISTENCY_VERIFIED' | 'LIFECYCLE_RECONCILIATION_PASSED' | 'LIFECYCLE_RECONCILIATION_BLOCKED' | 'TENANT_ISOLATION_BLOCKED' | 'USER_STOP_BLOCKED' | 'PROVENANCE_TAMPER_BLOCKED';
    readonly tenantPartition: string;
    readonly actorUserId?: string;
    readonly details: Record<string, any>;
}
export declare class PolicyActiveLifecycleReconciliationAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    /**
     * Records a sanitized audit event to the append-only global audit ledger.
     */
    recordEvent(event: LifecycleReconciliationAuditEvent): void;
}
