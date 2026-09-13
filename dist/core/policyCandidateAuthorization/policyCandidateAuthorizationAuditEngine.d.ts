import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export type PolicyCandidateAuthorizationAuditEventType = 'CANDIDATE_AUTHORIZATION_REQUESTED' | 'CANDIDATE_AUTHORIZATION_REVALIDATED' | 'HUMAN_AUTHORIZATION_REQUIRED' | 'CANDIDATE_AUTHORIZED' | 'CANDIDATE_REJECTED' | 'CANDIDATE_DEFERRED' | 'CANDIDATE_MORE_EVIDENCE_REQUESTED' | 'CANDIDATE_CANCELLED' | 'ACTIVATION_READINESS_CONFIRMED' | 'ACTIVATION_READINESS_BLOCKED' | 'AUTONOMOUS_AUTHORIZATION_BLOCKED' | 'SELF_APPROVAL_BLOCKED' | 'TENANT_ISOLATION_BLOCKED' | 'USER_STOP_BLOCKED' | 'PROVENANCE_TAMPER_BLOCKED' | 'EXPIRED_CANDIDATE_BLOCKED' | 'SUPERSEDED_CANDIDATE_BLOCKED';
export interface PolicyCandidateAuthorizationAuditRecord {
    readonly eventType: PolicyCandidateAuthorizationAuditEventType;
    readonly tenantPartition: string;
    readonly candidateDraftId?: string;
    readonly evolutionPlanId?: string;
    readonly authorizationRequestId?: string;
    readonly authorizationDecisionId?: string;
    readonly activationReadinessId?: string;
    readonly reviewerId?: string;
    readonly reviewerRole?: string;
    readonly decision?: string;
    readonly readinessState?: string;
    readonly status?: string;
    readonly reason?: string;
    readonly details?: Record<string, any>;
}
export interface PolicyCandidateAuthorizationAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyCandidateAuthorizationAuditEngine {
    static readonly CANONICAL_DOMAIN = "POLICY_CANDIDATE_AUTHORIZATION";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyCandidateAuthorizationAuditEngineOptions);
    /**
     * Records a sanitized authorization audit event into the append-only ledger.
     */
    recordEvent(record: PolicyCandidateAuthorizationAuditRecord): void;
}
export declare const globalPolicyCandidateAuthorizationAuditEngine: PolicyCandidateAuthorizationAuditEngine;
