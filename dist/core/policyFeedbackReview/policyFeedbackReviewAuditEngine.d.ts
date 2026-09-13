import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export type PolicyFeedbackReviewAuditEventType = 'FEEDBACK_REVIEW_RECEIVED' | 'FEEDBACK_REVALIDATION_STARTED' | 'FEEDBACK_REVALIDATION_PASSED' | 'FEEDBACK_REVALIDATION_FAILED' | 'FEEDBACK_REVIEW_QUEUED' | 'FEEDBACK_REVIEW_DEFERRED' | 'FEEDBACK_REVIEW_ACCEPTED' | 'FEEDBACK_REVIEW_REJECTED' | 'FEEDBACK_REVIEW_CANCELLED' | 'FEEDBACK_REVIEW_EXPIRED' | 'FEEDBACK_REVIEW_SUPERSEDED' | 'FEEDBACK_REVIEW_USER_STOP_BLOCKED' | 'FEEDBACK_REVIEW_TENANT_BLOCKED' | 'FEEDBACK_EVOLUTION_INTAKE_CREATED' | 'FEEDBACK_EVOLUTION_INTAKE_BLOCKED' | 'FEEDBACK_REVIEW_REPLAY_BLOCKED' | 'FEEDBACK_REVIEW_INTEGRITY_FAILURE';
export interface PolicyFeedbackReviewAuditRecord {
    readonly eventType: PolicyFeedbackReviewAuditEventType;
    readonly tenantPartition: string;
    readonly reviewId?: string;
    readonly proposalId?: string;
    readonly intakeId?: string;
    readonly reviewerId?: string;
    readonly status?: string;
    readonly reason?: string;
    readonly details?: Record<string, any>;
}
export interface PolicyFeedbackReviewAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyFeedbackReviewAuditEngine {
    static readonly CANONICAL_DOMAIN = "POLICY_FEEDBACK_REVIEW";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyFeedbackReviewAuditEngineOptions);
    /**
     * Records a sanitized review audit event into the append-only ledger.
     */
    recordEvent(record: PolicyFeedbackReviewAuditRecord): void;
}
export declare const globalPolicyFeedbackReviewAuditEngine: PolicyFeedbackReviewAuditEngine;
