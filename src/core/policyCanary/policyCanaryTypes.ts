// src/core/policyCanary/policyCanaryTypes.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Canonical type definitions and DTO contracts for governed real-time policy canary verification,
// multi-ring progressive rollouts (Ring 0 to Ring 4), shadow evaluation, telemetry aggregation,
// automated health monitoring, fail-closed circuit breaking, ring-scoped rollback, and provenance chains.
//
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho kiểm chứng canary chính sách thời gian thực có quản trị,
// triển khai lũy tiến đa vòng (Vòng 0 đến Vòng 4), đánh giá bóng (shadow), tổng hợp đo lường từ xa,
// giám sát sức khỏe tự động, ngắt mạch đóng an toàn, hoàn nguyên theo phạm vi vòng và chuỗi nguồn gốc.
//
// Authority Invariants:
// - Level 0 Read-Only Shadow Evaluation / Telemetry Inspection
// - Level 1 Advisory Health Monitoring & Recommendations
// - Level 2 Controlled Progressive Ring Execution
// - CANARY_EVALUATION != POLICY_APPROVAL
// - CANARY_HEALTH != PROMOTION_AUTHORITY
// - SHADOW_EVALUATION != EXECUTION
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_HARD_FORBIDDEN_DOWNGRADE
// - ZERO_CROSS_TENANT_POLICY_LEAK
// - USER_STOP > ALL_CANARY_OPERATIONS
// - FAIL_CLOSED > SPECULATIVE_EXECUTION

import type { ActionClassification } from '../policyDecisionPoint.js';
import type { PolicyConfiguration, PolicySnapshotId, EvolutionVersionId } from '../policyEvolution/policyEvolutionTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type PolicyCanaryId = string & { readonly __brand: unique symbol };
export type PolicyCandidateId = string & { readonly __brand: unique symbol };
export type PolicyRingAssignmentId = string & { readonly __brand: unique symbol };
export type PolicyCanaryDeploymentId = string & { readonly __brand: unique symbol };
export type PolicyCanaryObservationId = string & { readonly __brand: unique symbol };
export type PolicyCanaryHealthId = string & { readonly __brand: unique symbol };
export type PolicyCanaryProvenanceId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a branded PolicyCanaryId.
 * Tạo và xác thực PolicyCanaryId có thương hiệu.
 */
export function createPolicyCanaryId(raw: string): PolicyCanaryId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANARY_ID: Canary ID must be a non-empty string');
  }
  return raw.trim() as PolicyCanaryId;
}

/**
 * Creates and validates a branded PolicyCandidateId.
 * Tạo và xác thực PolicyCandidateId có thương hiệu.
 */
export function createPolicyCandidateId(raw: string): PolicyCandidateId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANDIDATE_ID: Candidate ID must be a non-empty string');
  }
  return raw.trim() as PolicyCandidateId;
}

/**
 * Creates and validates a branded PolicyRingAssignmentId.
 * Tạo và xác thực PolicyRingAssignmentId có thương hiệu.
 */
export function createPolicyRingAssignmentId(raw: string): PolicyRingAssignmentId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_RING_ASSIGNMENT_ID: Ring Assignment ID must be a non-empty string');
  }
  return raw.trim() as PolicyRingAssignmentId;
}

/**
 * Creates and validates a branded PolicyCanaryDeploymentId.
 * Tạo và xác thực PolicyCanaryDeploymentId có thương hiệu.
 */
export function createPolicyCanaryDeploymentId(raw: string): PolicyCanaryDeploymentId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANARY_DEPLOYMENT_ID: Deployment ID must be a non-empty string');
  }
  return raw.trim() as PolicyCanaryDeploymentId;
}

/**
 * Creates and validates a branded PolicyCanaryObservationId.
 * Tạo và xác thực PolicyCanaryObservationId có thương hiệu.
 */
export function createPolicyCanaryObservationId(raw: string): PolicyCanaryObservationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANARY_OBSERVATION_ID: Observation ID must be a non-empty string');
  }
  return raw.trim() as PolicyCanaryObservationId;
}

/**
 * Creates and validates a branded PolicyCanaryHealthId.
 * Tạo và xác thực PolicyCanaryHealthId có thương hiệu.
 */
export function createPolicyCanaryHealthId(raw: string): PolicyCanaryHealthId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANARY_HEALTH_ID: Health ID must be a non-empty string');
  }
  return raw.trim() as PolicyCanaryHealthId;
}

/**
 * Creates and validates a branded PolicyCanaryProvenanceId.
 * Tạo và xác thực PolicyCanaryProvenanceId có thương hiệu.
 */
export function createPolicyCanaryProvenanceId(raw: string): PolicyCanaryProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_CANARY_PROVENANCE_ID: Provenance ID must be a non-empty string');
  }
  return raw.trim() as PolicyCanaryProvenanceId;
}

// ============================================================================
// CANONICAL ENUMS & UNIONS
// CÁC ENUM VÀ HỢP CHUẨN TẮC
// ============================================================================

/**
 * Canonical 5-Ring Policy Deployment Model.
 * Mô hình triển khai chính sách 5 vòng chuẩn tắc.
 * - RING_0: Shadow evaluation (Candidate never executes, active policy is authoritative).
 * - RING_1: Internal / operator cohort (Candidate executes for designated operators).
 * - RING_2: Small canary cohort (5-10% traffic).
 * - RING_3: Expanded canary cohort (25-50% traffic).
 * - RING_4: Global promotion (100% traffic, becomes new active baseline).
 */
export type PolicyRing = 'RING_0' | 'RING_1' | 'RING_2' | 'RING_3' | 'RING_4';

export const CANONICAL_POLICY_RINGS: readonly PolicyRing[] = Object.freeze([
  'RING_0',
  'RING_1',
  'RING_2',
  'RING_3',
  'RING_4',
]);

/**
 * Policy canary health classifications.
 * Phân loại sức khỏe canary chính sách.
 */
export type PolicyCanaryHealth = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

/**
 * Lifecycle states of a policy candidate package.
 * Trạng thái vòng đời của một gói ứng viên chính sách.
 */
export type PolicyCanaryState =
  | 'STAGED'
  | 'SHADOWING'
  | 'INTERNAL_CANARY'
  | 'COHORT_CANARY'
  | 'EXPANDED_CANARY'
  | 'GLOBAL'
  | 'DEMOTED'
  | 'ROLLED_BACK'
  | 'CANCELLED'
  | 'FAILED_CLOSED';

/**
 * Canonical failure reasons for circuit breaker trips, demotions, and rollbacks.
 * Các lý do thất bại chuẩn tắc cho ngắt mạch, hạ cấp và hoàn nguyên.
 */
export type PolicyCanaryFailureReason =
  | 'SAFETY_REGRESSION'
  | 'HARD_FORBIDDEN_DOWNGRADE'
  | 'SHADOW_DIVERGENCE'
  | 'ERROR_BUDGET_EXHAUSTED'
  | 'REJECTION_RATE_SPIKE'
  | 'APPROVAL_FRICTION'
  | 'GUARDRAIL_SATURATION'
  | 'POLICY_DRIFT'
  | 'CHECKSUM_MISMATCH'
  | 'USER_STOP'
  | 'TENANT_ISOLATION_FAILURE'
  | 'EXPIRED_POLICY'
  | 'INVALID_AUTHORIZATION'
  | 'STALE_POLICY'
  | 'UNKNOWN_FAILURE';

// ============================================================================
// DTO CONTRACTS & INTERFACES
// CÁC HỢP ĐỒNG VÀ GIAO DIỆN DTO
// ============================================================================

/**
 * Candidate policy package submitted for multi-ring canary verification.
 * Gói chính sách ứng viên được đệ trình để kiểm chứng canary đa vòng.
 */
export interface PolicyCandidatePackage {
  readonly candidateId: PolicyCandidateId;
  readonly policyConfig: PolicyConfiguration;
  readonly sourceSnapshotId?: PolicySnapshotId;
  readonly baseVersionId: EvolutionVersionId;
  readonly state: PolicyCanaryState;
  readonly currentRing: PolicyRing;
  readonly authorizer: string;
  readonly authorizationTokenId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly checksum: string;
  readonly targetCohorts?: readonly string[];
  readonly targetTenants?: readonly string[];
  readonly description?: string;
}

/**
 * Assignment binding a tenant or cohort to a specific candidate policy and ring.
 * Gán kết một người thuê hoặc nhóm vào một chính sách ứng viên và vòng cụ thể.
 */
export interface PolicyRingAssignment {
  readonly assignmentId: PolicyRingAssignmentId;
  readonly candidateId: PolicyCandidateId;
  readonly tenantPartition: string;
  readonly ring: PolicyRing;
  readonly assignedAt: string;
  readonly assignedBy: string;
  readonly authorizationTokenId: string;
  readonly active: boolean;
}

/**
 * Record of a single shadow evaluation comparing active policy vs candidate policy.
 * Bản ghi của một lần đánh giá bóng so sánh chính sách hoạt động với chính sách ứng viên.
 */
export interface ShadowEvaluationRecord {
  readonly observationId: PolicyCanaryObservationId;
  readonly tenantPartition: string;
  readonly toolName: string;
  readonly activeVersion: string;
  readonly candidateVersion: string;
  readonly activeClassification: ActionClassification;
  readonly candidateClassification: ActionClassification;
  readonly activeDecisionAllowed: boolean;
  readonly candidateDecisionAllowed: boolean;
  readonly divergence: boolean;
  readonly divergenceReason?: string;
  readonly activeGuardrailPassed: boolean;
  readonly candidateGuardrailPassed: boolean;
  readonly highImpactEscalation: boolean;
  readonly hardForbiddenDowngradeAttempt: boolean;
  readonly timestamp: string;
  readonly correlationId?: string;
}

/**
 * Comprehensive metrics collected during live canary observation.
 * Các chỉ số toàn diện được thu thập trong quá trình quan sát canary trực tiếp.
 */
export interface CanaryTelemetryMetrics {
  readonly totalEvaluations: number;
  readonly shadowEvaluations: number;
  readonly candidateExecutions: number;
  readonly activeExecutions: number;
  readonly decisionMismatchCount: number;
  readonly allowRate: number;
  readonly denyRate: number;
  readonly allowRateDelta: number;
  readonly denyRateDelta: number;
  readonly highImpactEscalationCount: number;
  readonly guardrailViolationCount: number;
  readonly approvalTimeoutCount: number;
  readonly retryExhaustionCount: number;
  readonly concurrencyViolationCount: number;
  readonly leaseLatencyMs: number;
  readonly candidateLatencyMs: number;
  readonly activeLatencyMs: number;
  readonly policyDriftCount: number;
  readonly checksumFailureCount: number;
  readonly safetyRegressionCount: number;
}

/**
 * Diagnostic health report produced by the PolicyCanaryHealthMonitor.
 * Báo cáo sức khỏe chẩn đoán được tạo bởi PolicyCanaryHealthMonitor.
 */
export interface CanaryHealthReport {
  readonly healthId: PolicyCanaryHealthId;
  readonly candidateId: PolicyCandidateId;
  readonly tenantPartition: string;
  readonly ring: PolicyRing;
  readonly health: PolicyCanaryHealth;
  readonly recommendation: 'PROMOTE' | 'HOLD' | 'DEMOTE' | 'ROLLBACK';
  readonly metrics: CanaryTelemetryMetrics;
  readonly evaluatedAt: string;
  readonly reasons: readonly string[];
  readonly circuitBreakerRecommended: boolean;
}

/**
 * Current circuit breaker status for a tenant partition or candidate.
 * Trạng thái ngắt mạch hiện tại cho phân vùng người thuê hoặc ứng viên.
 */
export interface CircuitBreakerStatus {
  readonly tripped: boolean;
  readonly tripReason?: PolicyCanaryFailureReason;
  readonly trippedAt?: string;
  readonly trippedBy?: string;
  readonly details?: string;
}

/**
 * Promotion request requiring explicit human authorization.
 * Yêu cầu thăng hạng yêu cầu ủy quyền rõ ràng của con người.
 */
export interface PromotionRequest {
  readonly candidateId: PolicyCandidateId;
  readonly targetRing: PolicyRing;
  readonly tenantPartition: string;
  readonly operatorUserId: string;
  readonly authorizationToken: string;
  readonly healthEvidence: CanaryHealthReport;
}

/**
 * Result of a ring promotion attempt.
 * Kết quả của một nỗ lực thăng hạng vòng.
 */
export interface PromotionResult {
  readonly success: boolean;
  readonly candidateId: PolicyCandidateId;
  readonly previousRing: PolicyRing;
  readonly newRing: PolicyRing;
  readonly tenantPartition: string;
  readonly promotedAt: string;
  readonly provenanceHash: string;
  readonly reason?: string;
}

/**
 * Rollback request to demote a candidate or revert an entire ring/cohort.
 * Yêu cầu hoàn nguyên để hạ cấp một ứng viên hoặc khôi phục toàn bộ vòng/nhóm.
 */
export interface RollbackRequest {
  readonly candidateId: PolicyCandidateId;
  readonly tenantPartition?: string;
  readonly cohort?: string;
  readonly targetRing?: PolicyRing;
  readonly reason: PolicyCanaryFailureReason;
  readonly details?: string;
  readonly operatorUserId?: string;
}

/**
 * Result of a ring-scoped rollback operation.
 * Kết quả của thao tác hoàn nguyên theo phạm vi vòng.
 */
export interface RollbackResult {
  readonly success: boolean;
  readonly candidateId: PolicyCandidateId;
  readonly rolledBackRing: PolicyRing;
  readonly affectedTenants: readonly string[];
  readonly rolledBackAt: string;
  readonly restoredBaselineVersion: string;
  readonly provenanceHash: string;
}

/**
 * Tamper-evident cryptographic provenance record for canary lifecycle events.
 * Bản ghi nguồn gốc mật mã chống giả mạo cho các sự kiện vòng đời canary.
 */
export interface CanaryProvenanceRecord {
  readonly provenanceId: PolicyCanaryProvenanceId;
  readonly candidateId: PolicyCandidateId;
  readonly tenantPartition: string;
  readonly ring: PolicyRing;
  readonly eventType: string;
  readonly previousHash: string;
  readonly currentHash: string;
  readonly candidatePolicyVersion: string;
  readonly timestamp: string;
  readonly evidenceReference?: string;
  readonly authorizationReference?: string;
}

/**
 * Persistent storage record for a tenant partition under data/policy-canary/.
 * Bản ghi lưu trữ bền vững cho phân vùng người thuê dưới data/policy-canary/.
 */
export interface PolicyCanaryStoreRecord {
  readonly tenantPartition: string;
  readonly candidatePackages: readonly PolicyCandidatePackage[];
  readonly ringAssignments: readonly PolicyRingAssignment[];
  readonly circuitBreakerStatus: CircuitBreakerStatus;
  readonly lastUpdated: string;
}
