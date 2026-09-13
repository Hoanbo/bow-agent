import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export type PolicyPostExecutionAuditEventType = 'POST_EXECUTION_RECONCILED' | 'IMPACT_ANALYZED' | 'REGRESSION_DETECTED' | 'EFFECTIVENESS_ASSESSED' | 'FEEDBACK_PROPOSED' | 'FEEDBACK_BLOCKED' | 'USER_STOP_BLOCKED' | 'TENANT_ISOLATION_BLOCKED' | 'INTEGRITY_FAILURE';
export interface PolicyPostExecutionAuditRecord {
    readonly eventType: PolicyPostExecutionAuditEventType;
    readonly tenantPartition: string;
    readonly executionId?: string;
    readonly proposalId?: string;
    readonly status?: string;
    readonly reason?: string;
    readonly details?: Record<string, any>;
}
export interface PolicyPostExecutionAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyPostExecutionAuditEngine {
    static readonly CANONICAL_DOMAIN = "POLICY_POST_EXECUTION";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyPostExecutionAuditEngineOptions);
    /**
     * Records a sanitized post-execution audit event into the append-only ledger.
     * Ghi lại một sự kiện kiểm toán sau thực thi đã được làm sạch vào sổ cái chỉ ghi thêm.
     */
    recordEvent(record: PolicyPostExecutionAuditRecord): void;
}
export declare const globalPolicyPostExecutionAuditEngine: PolicyPostExecutionAuditEngine;
