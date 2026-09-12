import { type EvidenceCorrelationResult } from './policyEvidenceQueryTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import { AuditLedger } from '../auditLedger.js';
import { PolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface PolicyAuditCorrelationEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly evidenceCollector?: PolicyEvidenceCollector;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyAuditCorrelationEngine {
    private readonly auditLedger;
    private readonly evidenceCollector;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyAuditCorrelationEngineOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Correlates policy evidence with canonical AuditLedger records.
     * Matches on immutable identifiers only (correlationId, candidateId, eventId, provenanceHash).
     *
     * Tương quan bằng chứng chính sách với các bản ghi AuditLedger chuẩn tắc.
     * Chỉ khớp trên các định danh bất biến (correlationId, candidateId, eventId, provenanceHash).
     */
    correlateEvidenceWithAudit(tenantPartition: string, candidateId?: PolicyCandidateId): EvidenceCorrelationResult;
}
export declare const globalPolicyAuditCorrelationEngine: PolicyAuditCorrelationEngine;
