// src/core/policyObservability/policyObservabilityTypes.ts
// BOWCON V4.0 — MS-1.3.62: GOVERNED POLICY OPERATIONAL OBSERVABILITY,
// GOVERNANCE EVIDENCE & RUNTIME INTEGRITY AUDIT LAYER
//
// Canonical strongly-typed contracts for the policy observability layer:
// evidence records, runtime health snapshots, governance reports, and query filters.
// Every record is tenant-scoped. No anonymous persistence.
//
// Hợp đồng kiểu TypeScript chuẩn tắc cho lớp quan sát chính sách:
// bản ghi bằng chứng, ảnh chụp sức khỏe thời gian chạy, báo cáo quản trị và bộ lọc truy vấn.
// Mỗi bản ghi được gắn phạm vi người thuê. Không có lưu trữ ẩn danh.
//
// Authority Invariants:
// - OBSERVABILITY != AUTHORITY
// - CONFIDENCE != AUTHORITY
// - HEALTH_EVIDENCE != APPROVAL
// - TELEMETRY != PROMOTION
// - SIMULATION != EXECUTION
// - CANARY_EVALUATION != POLICY_APPROVAL
// - TENANT_POLICY != CROSS_TENANT_POLICY
// - FAIL_CLOSED > SPECULATIVE_EXECUTION
// - USER_STOP > ALL_OBSERVABILITY_OPERATIONS
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_POLICY_MUTATION

import type {
  PolicyCandidateId,
  PolicyRing,
  PolicyCanaryHealth,
  PolicyCanaryFailureReason,
  PolicyCanaryState,
} from '../policyCanary/policyCanaryTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type PolicyEvidenceId = string & { readonly __brand: unique symbol };
export type PolicyObservabilitySnapshotId = string & { readonly __brand: unique symbol };
export type PolicyGovernanceReportId = string & { readonly __brand: unique symbol };
export type PolicyEvidenceQueryId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a branded PolicyEvidenceId.
 * Tạo và xác thực PolicyEvidenceId có thương hiệu.
 */
export function createPolicyEvidenceId(raw: string): PolicyEvidenceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_EVIDENCE_ID: Evidence ID must be a non-empty string');
  }
  return raw.trim() as PolicyEvidenceId;
}

/**
 * Creates and validates a branded PolicyObservabilitySnapshotId.
 * Tạo và xác thực PolicyObservabilitySnapshotId có thương hiệu.
 */
export function createPolicyObservabilitySnapshotId(raw: string): PolicyObservabilitySnapshotId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_OBSERVABILITY_SNAPSHOT_ID: Snapshot ID must be a non-empty string');
  }
  return raw.trim() as PolicyObservabilitySnapshotId;
}

/**
 * Creates and validates a branded PolicyGovernanceReportId.
 * Tạo và xác thực PolicyGovernanceReportId có thương hiệu.
 */
export function createPolicyGovernanceReportId(raw: string): PolicyGovernanceReportId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_GOVERNANCE_REPORT_ID: Report ID must be a non-empty string');
  }
  return raw.trim() as PolicyGovernanceReportId;
}

/**
 * Creates and validates a branded PolicyEvidenceQueryId.
 * Tạo và xác thực PolicyEvidenceQueryId có thương hiệu.
 */
export function createPolicyEvidenceQueryId(raw: string): PolicyEvidenceQueryId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_EVIDENCE_QUERY_ID: Query ID must be a non-empty string');
  }
  return raw.trim() as PolicyEvidenceQueryId;
}

// ============================================================================
// EVIDENCE EVENT TYPES
// CÁC LOẠI SỰ KIỆN BẰNG CHỨNG
// ============================================================================

/**
 * Canonical evidence event classification for the observability layer.
 * Phân loại sự kiện bằng chứng chuẩn tắc cho lớp quan sát.
 */
export type PolicyEvidenceEventType =
  | 'EVALUATION'
  | 'MISMATCH'
  | 'GUARDRAIL'
  | 'HIGH_IMPACT_ESCALATION'
  | 'CIRCUIT_BREAKER'
  | 'ROLLBACK'
  | 'RECOVERY'
  | 'AUTHORIZATION'
  | 'USER_STOP'
  | 'DRIFT'
  | 'PROVENANCE_VERIFICATION'
  | 'TOKEN_REPLAY'
  | 'AUTHORIZATION_ANOMALY'
  | 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT'
  | 'SHADOW_FAULT';

// ============================================================================
// INDIVIDUAL EVIDENCE RECORDS
// CÁC BẢN GHI BẰNG CHỨNG ĐƠN LẺ
// ============================================================================

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
  readonly operatorUserIdHash: string; // Hashed for safety / Băm để đảm bảo an toàn
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
  readonly faultMessage: string; // Sanitized / Đã được khử trùng
  readonly activeExecutionUnaffected: boolean;
  readonly timestamp: string;
}

/**
 * Union of all evidence record types produced by the observability layer.
 * Hợp nhất tất cả các loại bản ghi bằng chứng được tạo bởi lớp quan sát.
 */
export type PolicyEvidenceRecord =
  | PolicyEvaluationEvidence
  | PolicyMismatchEvidence
  | PolicyGuardrailEvidence
  | PolicyPromotionEvidence
  | PolicyRollbackEvidence
  | PolicyCircuitBreakerEvidence
  | PolicyRecoveryEvidence
  | PolicyAuthorizationEvidence
  | PolicyUserStopEvidence
  | PolicyDriftEvidence
  | PolicyHardForbiddenEvidence
  | PolicyShadowFaultEvidence;

// ============================================================================
// RUNTIME HEALTH SNAPSHOT
// ẢNH CHỤP SỨC KHỎE THỜI GIAN CHẠY
// ============================================================================

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

  // Policy state / Trạng thái chính sách
  readonly activePolicyVersion: string;
  readonly candidatePolicyVersion?: string;
  readonly candidateId?: PolicyCandidateId;
  readonly candidateState?: PolicyCanaryState;
  readonly currentRing?: PolicyRing;

  // Evaluation metrics / Chỉ số đánh giá
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

  // Safety signals / Tín hiệu an toàn
  readonly circuitBreakerTripped: boolean;
  readonly circuitBreakerReason?: PolicyCanaryFailureReason;
  readonly driftDetected: boolean;
  readonly provenanceValid: boolean;
  readonly hardForbiddenDowngradeAttempts: number;

  // Lifecycle events / Sự kiện vòng đời
  readonly rollbackCount: number;
  readonly recoveryCount: number;
  readonly userStopInterruptions: number;
  readonly authorizationFailures: number;
  readonly tokenReplayDetections: number;

  // Overall health assessment / Đánh giá sức khỏe tổng thể
  readonly healthClassification: PolicyCanaryHealth | 'UNKNOWN';
  readonly healthRecommendation?: 'PROMOTE' | 'HOLD' | 'DEMOTE' | 'ROLLBACK';
}

// ============================================================================
// GOVERNANCE REPORT
// BÁO CÁO QUẢN TRỊ
// ============================================================================

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

  // Current policy state / Trạng thái chính sách hiện tại
  readonly activePolicyVersion: string;
  readonly candidateId?: PolicyCandidateId;
  readonly candidateState?: PolicyCanaryState;
  readonly currentRing?: PolicyRing;

  // Health summary / Tóm tắt sức khỏe
  readonly healthClassification: PolicyCanaryHealth | 'UNKNOWN';
  readonly healthRecommendation?: 'PROMOTE' | 'HOLD' | 'DEMOTE' | 'ROLLBACK';
  readonly healthReasons: readonly string[];

  // Evaluation summary / Tóm tắt đánh giá
  readonly totalEvaluations: number;
  readonly mismatchCount: number;
  readonly allowRateDelta: number;
  readonly denyRateDelta: number;

  // Safety events / Sự kiện an toàn
  readonly circuitBreakerTripped: boolean;
  readonly circuitBreakerReason?: PolicyCanaryFailureReason;
  readonly hardForbiddenAttempts: number;
  readonly driftEvents: number;
  readonly provenanceIntact: boolean;

  // Lifecycle events / Sự kiện vòng đời
  readonly guardrailActivations: number;
  readonly highImpactEscalations: number;
  readonly rollbackEvents: number;
  readonly recoveryEvents: number;
  readonly userStopEvents: number;

  // Authorization audit / Kiểm toán ủy quyền
  readonly authorizationFailures: number;
  readonly tokenReplayAttempts: number;

  // Recent evidence summary (sanitized) / Tóm tắt bằng chứng gần đây (đã khử trùng)
  readonly recentMismatches: readonly Pick<PolicyMismatchEvidence, 'tenantPartition' | 'toolName' | 'activeAllowed' | 'candidateAllowed' | 'timestamp'>[];
  readonly recentGuardrailActivations: readonly Pick<PolicyGuardrailEvidence, 'violationType' | 'reason' | 'timestamp'>[];
  readonly recentCircuitBreakerEvents: readonly Pick<PolicyCircuitBreakerEvidence, 'tripped' | 'tripReason' | 'timestamp'>[];

  // Advisory classification / Phân loại cố vấn
  readonly advisorySummary: string;

  // CRITICAL: This report is advisory only.
  // No method here can promote, approve, issue tokens, or mutate policies.
  // QUAN TRỌNG: Báo cáo này chỉ mang tính cố vấn.
  // Không có phương thức nào ở đây có thể thăng hạng, phê duyệt, cấp mã hoặc thay đổi chính sách.
}

// ============================================================================
// EVIDENCE QUERY FILTER
// BỘ LỌC TRUY VẤN BẰNG CHỨNG
// ============================================================================

/**
 * Read-only query filter for evidence retrieval with strict tenant isolation.
 * Anonymous queries must fail closed.
 *
 * Bộ lọc truy vấn chỉ đọc để lấy bằng chứng với cô lập người thuê nghiêm ngặt.
 * Các truy vấn ẩn danh phải thất bại theo hướng đóng.
 */
export interface PolicyEvidenceQuery {
  readonly queryId: PolicyEvidenceQueryId;
  readonly tenantPartition: string; // Required; cannot be empty / Bắt buộc; không thể trống
  readonly eventTypes?: readonly PolicyEvidenceEventType[];
  readonly candidateId?: PolicyCandidateId;
  readonly rings?: readonly PolicyRing[];
  readonly fromTimestamp?: string;
  readonly toTimestamp?: string;
  readonly correlationId?: string;
  readonly limit?: number;
}
