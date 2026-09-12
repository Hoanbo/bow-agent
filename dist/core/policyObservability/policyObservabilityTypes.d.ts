import type { PolicyCandidateId, PolicyRing, PolicyCanaryHealth, PolicyCanaryFailureReason, PolicyCanaryState } from '../policyCanary/policyCanaryTypes.js';
export type PolicyEvidenceId = string & {
    readonly __brand: unique symbol;
};
export type PolicyObservabilitySnapshotId = string & {
    readonly __brand: unique symbol;
};
export type PolicyGovernanceReportId = string & {
    readonly __brand: unique symbol;
};
export type PolicyEvidenceQueryId = string & {
    readonly __brand: unique symbol;
};
/**
 * Creates and validates a branded PolicyEvidenceId.
 * Tạo và xác thực PolicyEvidenceId có thương hiệu.
 */
export declare function createPolicyEvidenceId(raw: string): PolicyEvidenceId;
/**
 * Creates and validates a branded PolicyObservabilitySnapshotId.
 * Tạo và xác thực PolicyObservabilitySnapshotId có thương hiệu.
 */
export declare function createPolicyObservabilitySnapshotId(raw: string): PolicyObservabilitySnapshotId;
/**
 * Creates and validates a branded PolicyGovernanceReportId.
 * Tạo và xác thực PolicyGovernanceReportId có thương hiệu.
 */
export declare function createPolicyGovernanceReportId(raw: string): PolicyGovernanceReportId;
/**
 * Creates and validates a branded PolicyEvidenceQueryId.
 * Tạo và xác thực PolicyEvidenceQueryId có thương hiệu.
 */
export declare function createPolicyEvidenceQueryId(raw: string): PolicyEvidenceQueryId;
/**
 * Canonical evidence event classification for the observability layer.
 * Phân loại sự kiện bằng chứng chuẩn tắc cho lớp quan sát.
 */
export type PolicyEvidenceEventType = 'EVALUATION' | 'MISMATCH' | 'GUARDRAIL' | 'HIGH_IMPACT_ESCALATION' | 'CIRCUIT_BREAKER' | 'ROLLBACK' | 'RECOVERY' | 'AUTHORIZATION' | 'USER_STOP' | 'DRIFT' | 'PROVENANCE_VERIFICATION' | 'TOKEN_REPLAY' | 'AUTHORIZATION_ANOMALY' | 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT' | 'SHADOW_FAULT';
/**
 * Evidence record for a policy evaluation event (active or candidate).
 * Bản ghi bằng chứng cho sự kiện đánh giá chính sách (hoạt động hoặc ứng viên).
 */
export interface PolicyEvaluationEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'EVALUATION';
    readonly tenantPartition: string;
    readonly activePolicyVersion: string;
    readonly candidatePolicyVersion?: string;
    readonly currentRing?: PolicyRing;
    readonly toolName: string;
    readonly activeDecisionAllowed: boolean;
    readonly candidateDecisionAllowed?: boolean;
    readonly isShadowEvaluation: boolean;
    readonly correlationId?: string;
    readonly timestamp: string;
    readonly observationWindowStart?: string;
    readonly observationWindowEnd?: string;
}
/**
 * Evidence record for active-vs-candidate decision mismatch.
 * Bản ghi bằng chứng cho sự không khớp quyết định hoạt động-so-với-ứng viên.
 */
export interface PolicyMismatchEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'MISMATCH';
    readonly tenantPartition: string;
    readonly candidateId: PolicyCandidateId;
    readonly activePolicyVersion: string;
    readonly candidatePolicyVersion: string;
    readonly currentRing: PolicyRing;
    readonly toolName: string;
    readonly activeAllowed: boolean;
    readonly candidateAllowed: boolean;
    readonly divergenceReason?: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a guardrail activation event.
 * Bản ghi bằng chứng cho sự kiện kích hoạt rào chắn.
 */
export interface PolicyGuardrailEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'GUARDRAIL';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly violationType: 'CONCURRENCY' | 'RETRY' | 'TIMEOUT' | 'HARD_FORBIDDEN' | 'CUSTOM';
    readonly toolName?: string;
    readonly currentRing?: PolicyRing;
    readonly reason: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a ring promotion event.
 * Bản ghi bằng chứng cho sự kiện thăng hạng vòng.
 */
export interface PolicyPromotionEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'PROMOTION';
    readonly tenantPartition: string;
    readonly candidateId: PolicyCandidateId;
    readonly previousRing: PolicyRing;
    readonly newRing: PolicyRing;
    readonly operatorUserId: string;
    readonly provenanceHash: string;
    readonly success: boolean;
    readonly failureReason?: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a ring rollback / demotion event.
 * Bản ghi bằng chứng cho sự kiện hoàn nguyên / hạ cấp vòng.
 */
export interface PolicyRollbackEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'ROLLBACK';
    readonly tenantPartition: string;
    readonly candidateId: PolicyCandidateId;
    readonly rolledBackRing: PolicyRing;
    readonly affectedTenants: readonly string[];
    readonly reason: PolicyCanaryFailureReason;
    readonly restoredBaselineVersion: string;
    readonly provenanceHash: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a circuit breaker trip or reset event.
 * Bản ghi bằng chứng cho sự kiện kích hoạt hoặc đặt lại bộ ngắt mạch.
 */
export interface PolicyCircuitBreakerEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'CIRCUIT_BREAKER';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly tripped: boolean;
    readonly tripReason?: PolicyCanaryFailureReason;
    readonly trippedBy?: string;
    readonly details?: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a canary crash-recovery reconciliation event.
 * Bản ghi bằng chứng cho sự kiện đối soát phục hồi canary sau sự cố.
 */
export interface PolicyRecoveryEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'RECOVERY';
    readonly tenantPartition: string;
    readonly reconciledCandidates: number;
    readonly quarantinedCandidates: number;
    readonly restoredToBaseline: boolean;
    readonly disposition: string;
    readonly details: readonly string[];
    readonly timestamp: string;
}
/**
 * Evidence record for a human authorization event (success, failure, or replay).
 * Bản ghi bằng chứng cho sự kiện ủy quyền con người (thành công, thất bại hoặc phát lại).
 */
export interface PolicyAuthorizationEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'AUTHORIZATION';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly operatorUserIdHash: string;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'REPLAY_REJECTED';
    readonly targetRing?: PolicyRing;
    readonly failureReason?: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a USER_STOP interruption event.
 * Bản ghi bằng chứng cho sự kiện ngắt USER_STOP.
 */
export interface PolicyUserStopEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'USER_STOP';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly interruptedOperation: string;
    readonly timestamp: string;
}
/**
 * Evidence record for a policy drift detection event.
 * Bản ghi bằng chứng cho sự kiện phát hiện độ lệch chính sách.
 */
export interface PolicyDriftEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'DRIFT';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly driftType: 'CHECKSUM_MISMATCH' | 'POLICY_DRIFT' | 'PROVENANCE_BROKEN';
    readonly details: string;
    readonly timestamp: string;
}
/**
 * Evidence record for hard-forbidden downgrade attempt detection.
 * Bản ghi bằng chứng cho phát hiện nỗ lực hạ cấp hành động bị cấm tuyệt đối.
 */
export interface PolicyHardForbiddenEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly actionName: string;
    readonly circuitBreakerTripped: boolean;
    readonly timestamp: string;
}
/**
 * Evidence record for a shadow evaluation fault containment event.
 * Bản ghi bằng chứng cho sự kiện kiểm soát lỗi đánh giá bóng.
 */
export interface PolicyShadowFaultEvidence {
    readonly evidenceId: PolicyEvidenceId;
    readonly eventType: 'SHADOW_FAULT';
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly faultMessage: string;
    readonly activeExecutionUnaffected: boolean;
    readonly timestamp: string;
}
/**
 * Union of all evidence record types produced by the observability layer.
 * Hợp nhất tất cả các loại bản ghi bằng chứng được tạo bởi lớp quan sát.
 */
export type PolicyEvidenceRecord = PolicyEvaluationEvidence | PolicyMismatchEvidence | PolicyGuardrailEvidence | PolicyPromotionEvidence | PolicyRollbackEvidence | PolicyCircuitBreakerEvidence | PolicyRecoveryEvidence | PolicyAuthorizationEvidence | PolicyUserStopEvidence | PolicyDriftEvidence | PolicyHardForbiddenEvidence | PolicyShadowFaultEvidence;
/**
 * Read-only comprehensive runtime health snapshot of the policy canary pipeline.
 * Contains NO sensitive credentials, raw tokens, private keys, or execution payloads.
 *
 * Ảnh chụp sức khỏe thời gian chạy toàn diện chỉ đọc của đường ống canary chính sách.
 * KHÔNG chứa thông tin xác thực nhạy cảm, mã thô, khóa riêng tư hoặc tải thực thi.
 */
export interface PolicyRuntimeHealthSnapshot {
    readonly snapshotId: PolicyObservabilitySnapshotId;
    readonly tenantPartition: string;
    readonly observedAt: string;
    readonly observationWindowStart: string;
    readonly observationWindowEnd: string;
    readonly activePolicyVersion: string;
    readonly candidatePolicyVersion?: string;
    readonly candidateId?: PolicyCandidateId;
    readonly candidateState?: PolicyCanaryState;
    readonly currentRing?: PolicyRing;
    readonly totalEvaluations: number;
    readonly shadowEvaluations: number;
    readonly candidateExecutions: number;
    readonly activeExecutions: number;
    readonly mismatchCount: number;
    readonly allowCount: number;
    readonly denyCount: number;
    readonly allowRateDelta: number;
    readonly denyRateDelta: number;
    readonly highImpactEscalationCount: number;
    readonly guardrailViolationCount: number;
    readonly shadowFaultCount: number;
    readonly circuitBreakerTripped: boolean;
    readonly circuitBreakerReason?: PolicyCanaryFailureReason;
    readonly driftDetected: boolean;
    readonly provenanceValid: boolean;
    readonly hardForbiddenDowngradeAttempts: number;
    readonly rollbackCount: number;
    readonly recoveryCount: number;
    readonly userStopInterruptions: number;
    readonly authorizationFailures: number;
    readonly tokenReplayDetections: number;
    readonly healthClassification: PolicyCanaryHealth | 'UNKNOWN';
    readonly healthRecommendation?: 'PROMOTE' | 'HOLD' | 'DEMOTE' | 'ROLLBACK';
}
/**
 * Read-only advisory governance report summarizing full policy lifecycle state.
 * Contains NO methods capable of promotion, approval, token issuance, or policy mutation.
 *
 * Báo cáo quản trị cố vấn chỉ đọc tóm tắt trạng thái vòng đời chính sách đầy đủ.
 * KHÔNG CHỨA phương thức có khả năng thăng hạng, phê duyệt, cấp mã hoặc thay đổi chính sách.
 */
export interface PolicyGovernanceReport {
    readonly reportId: PolicyGovernanceReportId;
    readonly tenantPartition: string;
    readonly generatedAt: string;
    readonly reportPeriodStart: string;
    readonly reportPeriodEnd: string;
    readonly activePolicyVersion: string;
    readonly candidateId?: PolicyCandidateId;
    readonly candidateState?: PolicyCanaryState;
    readonly currentRing?: PolicyRing;
    readonly healthClassification: PolicyCanaryHealth | 'UNKNOWN';
    readonly healthRecommendation?: 'PROMOTE' | 'HOLD' | 'DEMOTE' | 'ROLLBACK';
    readonly healthReasons: readonly string[];
    readonly totalEvaluations: number;
    readonly mismatchCount: number;
    readonly allowRateDelta: number;
    readonly denyRateDelta: number;
    readonly circuitBreakerTripped: boolean;
    readonly circuitBreakerReason?: PolicyCanaryFailureReason;
    readonly hardForbiddenAttempts: number;
    readonly driftEvents: number;
    readonly provenanceIntact: boolean;
    readonly guardrailActivations: number;
    readonly highImpactEscalations: number;
    readonly rollbackEvents: number;
    readonly recoveryEvents: number;
    readonly userStopEvents: number;
    readonly authorizationFailures: number;
    readonly tokenReplayAttempts: number;
    readonly recentMismatches: readonly Pick<PolicyMismatchEvidence, 'tenantPartition' | 'toolName' | 'activeAllowed' | 'candidateAllowed' | 'timestamp'>[];
    readonly recentGuardrailActivations: readonly Pick<PolicyGuardrailEvidence, 'violationType' | 'reason' | 'timestamp'>[];
    readonly recentCircuitBreakerEvents: readonly Pick<PolicyCircuitBreakerEvidence, 'tripped' | 'tripReason' | 'timestamp'>[];
    readonly advisorySummary: string;
}
/**
 * Read-only query filter for evidence retrieval with strict tenant isolation.
 * Anonymous queries must fail closed.
 *
 * Bộ lọc truy vấn chỉ đọc để lấy bằng chứng với cô lập người thuê nghiêm ngặt.
 * Các truy vấn ẩn danh phải thất bại theo hướng đóng.
 */
export interface PolicyEvidenceQuery {
    readonly queryId: PolicyEvidenceQueryId;
    readonly tenantPartition: string;
    readonly eventTypes?: readonly PolicyEvidenceEventType[];
    readonly candidateId?: PolicyCandidateId;
    readonly rings?: readonly PolicyRing[];
    readonly fromTimestamp?: string;
    readonly toTimestamp?: string;
    readonly correlationId?: string;
    readonly limit?: number;
}
