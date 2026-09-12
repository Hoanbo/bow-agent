import type { PolicyCandidateId, PolicyRing, PolicyCanaryFailureReason, PolicyCanaryState } from '../policyCanary/policyCanaryTypes.js';
import type { PolicyEvidenceId, PolicyEvidenceEventType, PolicyEvidenceRecord } from '../policyObservability/policyObservabilityTypes.js';
export type EvidenceQueryId = string & {
    readonly __brand: unique symbol;
};
export type EvidenceCorrelationId = string & {
    readonly __brand: unique symbol;
};
export type PolicyLifecycleTraceId = string & {
    readonly __brand: unique symbol;
};
export type IntegrityVerificationId = string & {
    readonly __brand: unique symbol;
};
/**
 * Creates and validates a branded EvidenceQueryId.
 * Tạo và xác thực EvidenceQueryId có thương hiệu.
 */
export declare function createEvidenceQueryId(raw: string): EvidenceQueryId;
/**
 * Creates and validates a branded EvidenceCorrelationId.
 * Tạo và xác thực EvidenceCorrelationId có thương hiệu.
 */
export declare function createEvidenceCorrelationId(raw: string): EvidenceCorrelationId;
/**
 * Creates and validates a branded PolicyLifecycleTraceId.
 * Tạo và xác thực PolicyLifecycleTraceId có thương hiệu.
 */
export declare function createPolicyLifecycleTraceId(raw: string): PolicyLifecycleTraceId;
/**
 * Creates and validates a branded IntegrityVerificationId.
 * Tạo và xác thực IntegrityVerificationId có thương hiệu.
 */
export declare function createIntegrityVerificationId(raw: string): IntegrityVerificationId;
/**
 * Lifecycle event status classification for lifecycle trace reconstruction.
 * Phân loại trạng thái sự kiện vòng đời cho việc tái tạo dấu vết vòng đời.
 */
export type LifecycleEventStatus = 'OBSERVED' | 'AUTHORIZED' | 'EXECUTED' | 'ROLLED_BACK' | 'BLOCKED' | 'FAILED' | 'RECOVERED' | 'MISSING';
/**
 * Independent evidence integrity status classification.
 * Phân loại trạng thái toàn vẹn bằng chứng độc lập.
 */
export type EvidenceIntegrityStatus = 'VALID' | 'DEGRADED' | 'INVALID' | 'MISSING';
/**
 * Bounded query filter for policy evidence investigation.
 * Enforces pagination limits and tenant partitioning.
 *
 * Bộ lọc truy vấn có giới hạn cho việc điều tra bằng chứng chính sách.
 * Thực thi các giới hạn phân trang và phân vùng người thuê.
 */
export interface EvidenceQueryFilter {
    readonly queryId?: EvidenceQueryId;
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly proposalId?: string;
    readonly canaryDeploymentId?: string;
    readonly candidatePolicyVersion?: string;
    readonly eventTypes?: readonly PolicyEvidenceEventType[];
    readonly rings?: readonly PolicyRing[];
    readonly correlationId?: string;
    readonly fromTimestamp?: string;
    readonly toTimestamp?: string;
    readonly offset?: number;
    readonly limit?: number;
}
/**
 * Bounded, paginated query result containing evidence records.
 * Kết quả truy vấn có giới hạn, được phân trang chứa các bản ghi bằng chứng.
 */
export interface EvidenceQueryResult {
    readonly queryId: EvidenceQueryId;
    readonly tenantPartition: string;
    readonly totalMatches: number;
    readonly returnedCount: number;
    readonly offset: number;
    readonly limit: number;
    readonly hasMore: boolean;
    readonly records: readonly PolicyEvidenceRecord[];
    readonly queriedAt: string;
}
/**
 * Individual transition or milestone event in a policy candidate's lifecycle.
 * Sự kiện chuyển tiếp hoặc mốc quan trọng riêng lẻ trong vòng đời của ứng viên chính sách.
 */
export interface LifecycleTraceEvent {
    readonly eventId: string;
    readonly ring: PolicyRing;
    readonly eventType: string;
    readonly status: LifecycleEventStatus;
    readonly timestamp: string;
    readonly details: string;
    readonly provenanceHash?: string;
    readonly authorizationRef?: string;
    readonly evidenceRef?: string;
}
/**
 * Ring-specific milestone summary within a lifecycle trace.
 * Tóm tắt mốc quan trọng cụ thể theo vòng trong dấu vết vòng đời.
 */
export interface RingLifecycleMilestone {
    readonly ring: PolicyRing;
    readonly reached: boolean;
    readonly status: LifecycleEventStatus;
    readonly enteredAt?: string;
    readonly authorizedBy?: string;
    readonly evaluationCount: number;
    readonly mismatchCount: number;
    readonly rolledBack: boolean;
    readonly circuitBreakerTripped: boolean;
    readonly evidenceIds: readonly PolicyEvidenceId[];
}
/**
 * Complete reconstructed policy lifecycle trace from proposal to activation or rollback.
 * Dấu vết vòng đời chính sách được tái tạo hoàn chỉnh từ đề xuất đến kích hoạt hoặc hoàn nguyên.
 */
export interface PolicyLifecycleTrace {
    readonly traceId: PolicyLifecycleTraceId;
    readonly candidateId: PolicyCandidateId;
    readonly tenantPartition: string;
    readonly proposalId?: string;
    readonly candidatePolicyVersion: string;
    readonly currentRing: PolicyRing;
    readonly currentState: PolicyCanaryState | 'UNKNOWN';
    readonly isGloballyActive: boolean;
    readonly wasRolledBack: boolean;
    readonly rollbackReason?: PolicyCanaryFailureReason;
    readonly wasCircuitBreakerTripped: boolean;
    readonly milestones: readonly RingLifecycleMilestone[];
    readonly events: readonly LifecycleTraceEvent[];
    readonly reconstructedAt: string;
    readonly missingRings: readonly PolicyRing[];
}
/**
 * Sanitized correlation record linking evidence to canonical AuditLedger events.
 * Bản ghi tương quan đã khử trùng liên kết bằng chứng với các sự kiện AuditLedger chuẩn tắc.
 */
export interface AuditCorrelationRecord {
    readonly evidenceId: PolicyEvidenceId;
    readonly evidenceEventType: string;
    readonly auditEventId: string;
    readonly auditDomain: string;
    readonly auditTimestamp: string;
    readonly auditToolName: string;
    readonly auditPolicyDecision: 'PERMIT' | 'DENY';
    readonly correlationKey: string;
    readonly provenanceHash?: string;
}
/**
 * Result of correlating policy evidence with canonical AuditLedger records.
 * Kết quả tương quan bằng chứng chính sách với các bản ghi AuditLedger chuẩn tắc.
 */
export interface EvidenceCorrelationResult {
    readonly correlationId: EvidenceCorrelationId;
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly matchedCount: number;
    readonly unmatchedEvidenceCount: number;
    readonly correlatedRecords: readonly AuditCorrelationRecord[];
    readonly analyzedAt: string;
}
/**
 * Granular check detail in an integrity verification report.
 * Chi tiết kiểm tra chi tiết trong báo cáo xác minh tính toàn vẹn.
 */
export interface IntegrityCheckDetail {
    readonly checkName: string;
    readonly passed: boolean;
    readonly reason?: string;
}
/**
 * Structured result of independent evidence integrity verification.
 * Kết quả có cấu trúc của việc xác minh tính toàn vẹn bằng chứng độc lập.
 */
export interface IntegrityVerificationResult {
    readonly verificationId: IntegrityVerificationId;
    readonly tenantPartition: string;
    readonly candidateId: PolicyCandidateId;
    readonly candidatePolicyVersion: string;
    readonly status: EvidenceIntegrityStatus;
    readonly provenanceValid: boolean;
    readonly provenanceRecordCount: number;
    readonly provenanceHeadHash: string;
    readonly chronologicalOrderValid: boolean;
    readonly ringTransitionsMonotonic: boolean;
    readonly tenantIsolationConsistent: boolean;
    readonly policyVersionConsistent: boolean;
    readonly auditReferencesValid: boolean;
    readonly checkDetails: readonly IntegrityCheckDetail[];
    readonly failureReasons: readonly string[];
    readonly verifiedAt: string;
}
/**
 * Top-level read-only investigation package answering "What happened to this policy candidate?".
 * Gói điều tra chỉ đọc cấp cao trả lời câu hỏi "Điều gì đã xảy ra với ứng viên chính sách này?".
 */
export interface InvestigationSummary {
    readonly candidateId: PolicyCandidateId;
    readonly tenantPartition: string;
    readonly candidatePolicyVersion: string;
    readonly lifecycleTrace: PolicyLifecycleTrace;
    readonly integrityResult: IntegrityVerificationResult;
    readonly auditCorrelation: EvidenceCorrelationResult;
    readonly generatedAt: string;
    readonly advisorySummary: string;
}
