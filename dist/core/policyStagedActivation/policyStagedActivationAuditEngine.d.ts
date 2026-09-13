import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export type PolicyStagedActivationAuditEventType = 'ACTIVATION_REQUESTED' | 'ACTIVATION_REVALIDATED' | 'POLICY_STAGED' | 'ACTIVATION_PREFLIGHT_STARTED' | 'ACTIVATION_PREFLIGHT_PASSED' | 'ACTIVATION_PREFLIGHT_BLOCKED' | 'ACTIVATION_BOUNDARY_EVALUATED' | 'ACTIVATION_AUTHORITY_BLOCKED' | 'ACTIVATION_COMMITTED' | 'ACTIVE_POLICY_CREATED' | 'ACTIVATION_REJECTED' | 'ACTIVATION_EXPIRED' | 'ACTIVATION_CONFLICT' | 'TENANT_ISOLATION_BLOCKED' | 'USER_STOP_BLOCKED' | 'PROVENANCE_TAMPER_BLOCKED' | 'CORRUPTED_STATE_BLOCKED' | 'AUTONOMOUS_ACTIVATION_BLOCKED';
export interface PolicyStagedActivationAuditRecord {
    readonly eventType: PolicyStagedActivationAuditEventType;
    readonly tenantPartition: string;
    readonly candidateDraftId?: string;
    readonly stagedActivationId?: string;
    readonly preflightId?: string;
    readonly activationCommitId?: string;
    readonly activePolicyStateId?: string;
    readonly operatorId?: string;
    readonly operatorRole?: string;
    readonly status?: string;
    readonly reason?: string;
    readonly details?: Record<string, any>;
}
export interface PolicyStagedActivationAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyStagedActivationAuditEngine {
    static readonly CANONICAL_DOMAIN = "POLICY_STAGED_ACTIVATION";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyStagedActivationAuditEngineOptions);
    /**
     * Records a sanitized activation audit event into the append-only ledger.
     */
    recordEvent(record: PolicyStagedActivationAuditRecord): void;
}
export declare const globalPolicyStagedActivationAuditEngine: PolicyStagedActivationAuditEngine;
