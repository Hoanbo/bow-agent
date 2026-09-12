import { type PolicyEvidenceRecord, type PolicyEvaluationEvidence, type PolicyMismatchEvidence, type PolicyGuardrailEvidence, type PolicyPromotionEvidence, type PolicyRollbackEvidence, type PolicyCircuitBreakerEvidence, type PolicyRecoveryEvidence, type PolicyAuthorizationEvidence, type PolicyUserStopEvidence, type PolicyDriftEvidence, type PolicyHardForbiddenEvidence, type PolicyShadowFaultEvidence, type PolicyEvidenceQuery } from './policyObservabilityTypes.js';
import type { PolicyCandidateId, PolicyRing, PolicyCanaryFailureReason } from '../policyCanary/policyCanaryTypes.js';
import type { CanaryRecoveryResult } from '../policyCanary/policyCanaryResilienceTypes.js';
import type { RollbackResult } from '../policyCanary/policyCanaryTypes.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface PolicyEvidenceCollectorOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
    readonly maxEvidencePerTenant?: number;
}
export declare class PolicyEvidenceCollector {
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    private readonly maxPerTenant;
    private readonly store;
    constructor(options?: PolicyEvidenceCollectorOptions);
    private generateId;
    private sanitize;
    /**
     * Returns the evidence ring buffer for a tenant partition, creating it if absent.
     * Trả về vòng đệm bằng chứng cho phân vùng người thuê, tạo nếu vắng mặt.
     */
    private getBucket;
    /**
     * Appends a record to a tenant bucket, enforcing the ring-buffer limit.
     * Thêm bản ghi vào nhóm người thuê, thực thi giới hạn vòng đệm.
     */
    private push;
    /**
     * Records a policy evaluation event.
     * Ghi lại sự kiện đánh giá chính sách.
     */
    recordEvaluation(input: {
        readonly tenantPartition: string;
        readonly activePolicyVersion: string;
        readonly candidatePolicyVersion?: string;
        readonly currentRing?: PolicyRing;
        readonly toolName: string;
        readonly activeDecisionAllowed: boolean;
        readonly candidateDecisionAllowed?: boolean;
        readonly isShadowEvaluation: boolean;
        readonly correlationId?: string;
        readonly observationWindowStart?: string;
        readonly observationWindowEnd?: string;
    }): PolicyEvaluationEvidence;
    /**
     * Records a policy mismatch between active and candidate decision.
     * Ghi lại sự không khớp chính sách giữa quyết định hoạt động và ứng viên.
     */
    recordMismatch(input: {
        readonly tenantPartition: string;
        readonly candidateId: PolicyCandidateId;
        readonly activePolicyVersion: string;
        readonly candidatePolicyVersion: string;
        readonly currentRing: PolicyRing;
        readonly toolName: string;
        readonly activeAllowed: boolean;
        readonly candidateAllowed: boolean;
        readonly divergenceReason?: string;
    }): PolicyMismatchEvidence;
    /**
     * Records a guardrail activation event.
     * Ghi lại sự kiện kích hoạt rào chắn.
     */
    recordGuardrail(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly violationType: 'CONCURRENCY' | 'RETRY' | 'TIMEOUT' | 'HARD_FORBIDDEN' | 'CUSTOM';
        readonly toolName?: string;
        readonly currentRing?: PolicyRing;
        readonly reason: string;
    }): PolicyGuardrailEvidence;
    /**
     * Records a ring promotion attempt (success or failure).
     * Ghi lại nỗ lực thăng hạng vòng (thành công hoặc thất bại).
     */
    recordPromotion(input: {
        readonly tenantPartition: string;
        readonly candidateId: PolicyCandidateId;
        readonly previousRing: PolicyRing;
        readonly newRing: PolicyRing;
        readonly operatorUserId: string;
        readonly provenanceHash: string;
        readonly success: boolean;
        readonly failureReason?: string;
    }): PolicyPromotionEvidence;
    /**
     * Records a rollback event from RollbackResult.
     * Ghi lại sự kiện hoàn nguyên từ RollbackResult.
     */
    recordRollback(tenantPartition: string, result: RollbackResult, reason: PolicyCanaryFailureReason): PolicyRollbackEvidence;
    /**
     * Records a circuit breaker state change (trip or reset).
     * Ghi lại thay đổi trạng thái bộ ngắt mạch (kích hoạt hoặc đặt lại).
     */
    recordCircuitBreaker(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly tripped: boolean;
        readonly tripReason?: PolicyCanaryFailureReason;
        readonly trippedBy?: string;
        readonly details?: string;
    }): PolicyCircuitBreakerEvidence;
    /**
     * Records a crash-recovery reconciliation event from CanaryRecoveryResult.
     * Ghi lại sự kiện đối soát phục hồi sự cố từ CanaryRecoveryResult.
     */
    recordRecovery(tenantPartition: string, result: CanaryRecoveryResult): PolicyRecoveryEvidence;
    /**
     * Records a human authorization event (success, failure, or token replay rejection).
     * Raw authorization tokens are NEVER stored; operator user IDs are hashed.
     *
     * Ghi lại sự kiện ủy quyền con người (thành công, thất bại hoặc từ chối phát lại mã).
     * Mã ủy quyền thô KHÔNG BAO GIỜ được lưu trữ; ID người dùng vận hành được băm.
     */
    recordAuthorization(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly operatorUserId: string;
        readonly outcome: 'SUCCESS' | 'FAILURE' | 'REPLAY_REJECTED';
        readonly targetRing?: PolicyRing;
        readonly failureReason?: string;
    }): PolicyAuthorizationEvidence;
    /**
     * Records a USER_STOP interruption event.
     * Ghi lại sự kiện ngắt USER_STOP.
     */
    recordUserStop(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly interruptedOperation: string;
    }): PolicyUserStopEvidence;
    /**
     * Records a policy drift or checksum mismatch detection event.
     * Ghi lại sự kiện phát hiện độ lệch chính sách hoặc không khớp mã kiểm tra.
     */
    recordDrift(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly driftType: 'CHECKSUM_MISMATCH' | 'POLICY_DRIFT' | 'PROVENANCE_BROKEN';
        readonly details: string;
    }): PolicyDriftEvidence;
    /**
     * Records a hard-forbidden action downgrade attempt detection.
     * Ghi lại phát hiện nỗ lực hạ cấp hành động bị cấm tuyệt đối.
     */
    recordHardForbiddenAttempt(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly actionName: string;
        readonly circuitBreakerTripped: boolean;
    }): PolicyHardForbiddenEvidence;
    /**
     * Records a shadow evaluation fault containment event.
     * Sanitizes the fault message before storage.
     *
     * Ghi lại sự kiện kiểm soát lỗi đánh giá bóng.
     * Khử trùng thông báo lỗi trước khi lưu trữ.
     */
    recordShadowFault(input: {
        readonly tenantPartition: string;
        readonly candidateId?: PolicyCandidateId;
        readonly faultMessage: string;
        readonly activeExecutionUnaffected: boolean;
    }): PolicyShadowFaultEvidence;
    /**
     * Executes a read-only evidence query with strict tenant isolation.
     * Anonymous queries (empty tenantPartition) fail closed.
     *
     * Thực thi truy vấn bằng chứng chỉ đọc với cô lập người thuê nghiêm ngặt.
     * Các truy vấn ẩn danh (tenantPartition trống) thất bại theo hướng đóng.
     */
    query(filter: PolicyEvidenceQuery): readonly PolicyEvidenceRecord[];
    /**
     * Returns all evidence for a tenant partition (bounded).
     * Strict tenant isolation: no cross-tenant access.
     *
     * Trả về tất cả bằng chứng cho phân vùng người thuê (có giới hạn).
     * Cô lập người thuê nghiêm ngặt: không có quyền truy cập liên người thuê.
     */
    getAll(tenantPartition: string): readonly PolicyEvidenceRecord[];
    /**
     * Returns aggregated counts for a tenant partition.
     * Trả về số liệu tổng hợp cho phân vùng người thuê.
     */
    getEvidenceCounts(tenantPartition: string): {
        readonly total: number;
        readonly evaluations: number;
        readonly mismatches: number;
        readonly guardrails: number;
        readonly circuitBreakers: number;
        readonly rollbacks: number;
        readonly recoveries: number;
        readonly userStops: number;
        readonly driftEvents: number;
        readonly authFailures: number;
        readonly tokenReplays: number;
        readonly hardForbiddenAttempts: number;
        readonly shadowFaults: number;
    };
    /**
     * Clears all evidence for a tenant partition (for testing only).
     * Xóa tất cả bằng chứng cho phân vùng người thuê (chỉ dùng trong thử nghiệm).
     */
    clearTenant(tenantPartition: string): void;
}
export declare const globalPolicyEvidenceCollector: PolicyEvidenceCollector;
