import { AuditLedger, type AuditEvent } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface PolicyDecisionAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyDecisionAuditEngine {
    static readonly CANONICAL_DOMAIN = "POLICY_DECISION";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyDecisionAuditEngineOptions);
    /**
     * Records a sanitized audit event for the policy decision and remediation layer.
     * Ghi lại sự kiện kiểm toán đã được làm sạch cho lớp quyết định và khắc phục chính sách.
     */
    recordAuditEvent(input: {
        readonly eventType: string;
        readonly tenantPartition: string;
        readonly proposalId?: string;
        readonly requestId?: string;
        readonly decisionId?: string;
        readonly candidateId?: string;
        readonly operatorUserId?: string;
        readonly policyDecision: 'PERMIT' | 'DENY';
        readonly executionStatus: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
        readonly details?: Record<string, any>;
    }): AuditEvent;
}
export declare const globalPolicyDecisionAuditEngine: PolicyDecisionAuditEngine;
