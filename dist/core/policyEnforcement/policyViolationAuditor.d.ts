import { AuditLedger, type AuditEvent } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type PolicyViolationEvent, type ViolationAuditId } from './policyEnforcementTypes.js';
export interface PolicyViolationAuditorOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyViolationAuditor {
    static readonly CANONICAL_DOMAIN = "POLICY_ENFORCEMENT";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyViolationAuditorOptions);
    /**
     * Records a sanitized policy enforcement audit event.
     * Ghi lại sự kiện kiểm toán thực thi chính sách đã được làm sạch.
     */
    recordViolation(event: Omit<PolicyViolationEvent, 'auditId' | 'timestamp'>): ViolationAuditId;
    /**
     * Queries enforcement audit records for a tenant partition.
     * Truy vấn các bản ghi kiểm toán thực thi cho một phân vùng người thuê.
     */
    getTenantEnforcementAuditTrail(tenantPartition?: string): AuditEvent[];
}
export declare const globalPolicyViolationAuditor: PolicyViolationAuditor;
