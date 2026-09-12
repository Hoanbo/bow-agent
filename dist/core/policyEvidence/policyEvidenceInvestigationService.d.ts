import { type EvidenceQueryFilter, type EvidenceQueryResult, type PolicyLifecycleTrace, type EvidenceCorrelationResult, type IntegrityVerificationResult, type InvestigationSummary } from './policyEvidenceQueryTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import { PolicyEvidenceQueryEngine } from './policyEvidenceQueryEngine.js';
import { PolicyLifecycleTraceEngine } from './policyLifecycleTraceEngine.js';
import { PolicyAuditCorrelationEngine } from './policyAuditCorrelationEngine.js';
import { PolicyEvidenceIntegrityVerifier } from './policyEvidenceIntegrityVerifier.js';
export interface PolicyEvidenceInvestigationServiceOptions {
    readonly queryEngine?: PolicyEvidenceQueryEngine;
    readonly traceEngine?: PolicyLifecycleTraceEngine;
    readonly correlationEngine?: PolicyAuditCorrelationEngine;
    readonly integrityVerifier?: PolicyEvidenceIntegrityVerifier;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyEvidenceInvestigationService {
    private readonly queryEngine;
    private readonly traceEngine;
    private readonly correlationEngine;
    private readonly integrityVerifier;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEvidenceInvestigationServiceOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Executes a bounded, deterministic read-only query for policy evidence records.
     * Thực thi truy vấn chỉ đọc có giới hạn, xác định cho các bản ghi bằng chứng chính sách.
     */
    queryEvidence(filter: EvidenceQueryFilter): EvidenceQueryResult;
    /**
     * Reconstructs the complete lifecycle trace for a policy candidate.
     * Tái tạo dấu vết vòng đời hoàn chỉnh cho một ứng viên chính sách.
     */
    getPolicyLifecycleTrace(tenantPartition: string, candidateId: PolicyCandidateId): PolicyLifecycleTrace;
    /**
     * Correlates policy evidence with canonical AuditLedger events.
     * Tương quan bằng chứng chính sách với các sự kiện AuditLedger chuẩn tắc.
     */
    correlateAudit(tenantPartition: string, candidateId?: PolicyCandidateId): EvidenceCorrelationResult;
    /**
     * Independently verifies the evidence integrity for a policy candidate.
     * Xác minh độc lập tính toàn vẹn của bằng chứng cho một ứng viên chính sách.
     */
    verifyIntegrity(tenantPartition: string, candidateId: PolicyCandidateId): IntegrityVerificationResult;
    /**
     * Synthesizes a comprehensive read-only investigation summary for a policy candidate.
     * Answering "What happened to this policy candidate?".
     *
     * Tổng hợp tóm tắt điều tra chỉ đọc toàn diện cho một ứng viên chính sách.
     * Trả lời câu hỏi "Điều gì đã xảy ra với ứng viên chính sách này?".
     */
    getInvestigationSummary(tenantPartition: string, candidateId: PolicyCandidateId): InvestigationSummary;
}
export declare const globalPolicyEvidenceInvestigationService: PolicyEvidenceInvestigationService;
