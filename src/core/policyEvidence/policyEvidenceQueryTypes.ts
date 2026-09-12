// src/core/policyEvidence/policyEvidenceQueryTypes.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Canonical strongly-typed contracts for the policy evidence investigation layer:
// branded identifiers, query filters, lifecycle traces, audit correlations, and integrity verification results.
// Strictly read-only contracts. Zero autonomous authority.
//
// Hợp đồng kiểu TypeScript chuẩn tắc cho lớp điều tra bằng chứng chính sách:
// định danh có thương hiệu, bộ lọc truy vấn, dấu vết vòng đời, tương quan kiểm toán và kết quả xác minh toàn vẹn.
// Hợp đồng thuần túy chỉ đọc. Không có thẩm quyền tự động.
//
// Authority Invariants:
// - INVESTIGATION != AUTHORITY
// - QUERY != MUTATION
// - TRACE != EXECUTION
// - CORRELATION != APPROVAL
// - VERIFICATION != RECOVERY
// - READ_ONLY > SPECULATIVE_ACTION
// - USER_STOP > ALL_INVESTIGATION_OPERATIONS
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_ROLLBACK
// - ZERO_AUTONOMOUS_CIRCUIT_BREAKER_RESET

import type {
  PolicyCandidateId,
  PolicyRing,
  PolicyCanaryFailureReason,
  PolicyCanaryState,
} from '../policyCanary/policyCanaryTypes.js';
import type {
  PolicyEvidenceId,
  PolicyEvidenceEventType,
  PolicyEvidenceRecord,
} from '../policyObservability/policyObservabilityTypes.js';
import type { AuditEvent } from '../auditLedger.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type EvidenceQueryId = string & { readonly __brand: unique symbol };
export type EvidenceCorrelationId = string & { readonly __brand: unique symbol };
export type PolicyLifecycleTraceId = string & { readonly __brand: unique symbol };
export type IntegrityVerificationId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a branded EvidenceQueryId.
 * Tạo và xác thực EvidenceQueryId có thương hiệu.
 */
export function createEvidenceQueryId(raw: string): EvidenceQueryId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_EVIDENCE_QUERY_ID: Query ID must be a non-empty string');
  }
  return raw.trim() as EvidenceQueryId;
}

/**
 * Creates and validates a branded EvidenceCorrelationId.
 * Tạo và xác thực EvidenceCorrelationId có thương hiệu.
 */
export function createEvidenceCorrelationId(raw: string): EvidenceCorrelationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_EVIDENCE_CORRELATION_ID: Correlation ID must be a non-empty string');
  }
  return raw.trim() as EvidenceCorrelationId;
}

/**
 * Creates and validates a branded PolicyLifecycleTraceId.
 * Tạo và xác thực PolicyLifecycleTraceId có thương hiệu.
 */
export function createPolicyLifecycleTraceId(raw: string): PolicyLifecycleTraceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_LIFECYCLE_TRACE_ID: Trace ID must be a non-empty string');
  }
  return raw.trim() as PolicyLifecycleTraceId;
}

/**
 * Creates and validates a branded IntegrityVerificationId.
 * Tạo và xác thực IntegrityVerificationId có thương hiệu.
 */
export function createIntegrityVerificationId(raw: string): IntegrityVerificationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_INTEGRITY_VERIFICATION_ID: Verification ID must be a non-empty string');
  }
  return raw.trim() as IntegrityVerificationId;
}

// ============================================================================
// ENUMS & CLASSIFICATIONS
// ENUM VÀ PHÂN LOẠI
// ============================================================================

/**
 * Lifecycle event status classification for lifecycle trace reconstruction.
 * Phân loại trạng thái sự kiện vòng đời cho việc tái tạo dấu vết vòng đời.
 */
export type LifecycleEventStatus =
  | 'OBSERVED'
  | 'AUTHORIZED'
  | 'EXECUTED'
  | 'ROLLED_BACK'
  | 'BLOCKED'
  | 'FAILED'
  | 'RECOVERED'
  | 'MISSING';

/**
 * Independent evidence integrity status classification.
 * Phân loại trạng thái toàn vẹn bằng chứng độc lập.
 */
export type EvidenceIntegrityStatus =
  | 'VALID'
  | 'DEGRADED'
  | 'INVALID'
  | 'MISSING';

// ============================================================================
// QUERY DTOs
// DTO TRUY VẤN
// ============================================================================

/**
 * Bounded query filter for policy evidence investigation.
 * Enforces pagination limits and tenant partitioning.
 *
 * Bộ lọc truy vấn có giới hạn cho việc điều tra bằng chứng chính sách.
 * Thực thi các giới hạn phân trang và phân vùng người thuê.
 */
export interface EvidenceQueryFilter {
  readonly queryId?: EvidenceQueryId;
  readonly tenantPartition: string; // Mandatory for tenant isolation / Bắt buộc cho cô lập người thuê
  readonly candidateId?: PolicyCandidateId;
  readonly proposalId?: string;
  readonly canaryDeploymentId?: string;
  readonly candidatePolicyVersion?: string;
  readonly eventTypes?: readonly PolicyEvidenceEventType[];
  readonly rings?: readonly PolicyRing[];
  readonly correlationId?: string;
  readonly fromTimestamp?: string;
  readonly toTimestamp?: string;
  readonly offset?: number; // 0-based offset / Độ lệch bắt đầu từ 0
  readonly limit?: number; // Bounded, default 50, max 100 / Có giới hạn, mặc định 50, tối đa 100
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

// ============================================================================
// LIFECYCLE TRACE DTOs
// DTO DẤU VẾT VÒNG ĐỜI
// ============================================================================

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

// ============================================================================
// AUDIT CORRELATION DTOs
// DTO TƯƠNG QUAN KIỂM TOÁN
// ============================================================================

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

// ============================================================================
// INTEGRITY VERIFICATION DTOs
// DTO XÁC MINH TOÀN VẸN
// ============================================================================

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

// ============================================================================
// INVESTIGATION SUMMARY DTO
// DTO TÓM TẮT ĐIỀU TRA
// ============================================================================

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
