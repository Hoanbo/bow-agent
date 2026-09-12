import type { ActionClassification } from '../policyDecisionPoint.js';
import type { PolicyConfiguration, PolicySnapshotId, EvolutionVersionId } from '../policyEvolution/policyEvolutionTypes.js';
export type EnforcementDecisionId = string & {
    readonly __brand: unique symbol;
};
export type ActivePolicyId = string & {
    readonly __brand: unique symbol;
};
export type DriftReportId = string & {
    readonly __brand: unique symbol;
};
export type ViolationAuditId = string & {
    readonly __brand: unique symbol;
};
export type GuardrailEvaluationId = string & {
    readonly __brand: unique symbol;
};
export type ExecutionLeaseId = string & {
    readonly __brand: unique symbol;
};
/**
 * Creates and validates a branded EnforcementDecisionId.
 * Tạo và xác thực EnforcementDecisionId có thương hiệu.
 */
export declare function createEnforcementDecisionId(raw: string): EnforcementDecisionId;
/**
 * Creates and validates a branded ActivePolicyId.
 * Tạo và xác thực ActivePolicyId có thương hiệu.
 */
export declare function createActivePolicyId(raw: string): ActivePolicyId;
/**
 * Creates and validates a branded DriftReportId.
 * Tạo và xác thực DriftReportId có thương hiệu.
 */
export declare function createDriftReportId(raw: string): DriftReportId;
/**
 * Creates and validates a branded ViolationAuditId.
 * Tạo và xác thực ViolationAuditId có thương hiệu.
 */
export declare function createViolationAuditId(raw: string): ViolationAuditId;
/**
 * Creates and validates a branded GuardrailEvaluationId.
 * Tạo và xác thực GuardrailEvaluationId có thương hiệu.
 */
export declare function createGuardrailEvaluationId(raw: string): GuardrailEvaluationId;
/**
 * Creates and validates a branded ExecutionLeaseId.
 * Tạo và xác thực ExecutionLeaseId có thương hiệu.
 */
export declare function createExecutionLeaseId(raw: string): ExecutionLeaseId;
/**
 * Canonical immutable hard-forbidden actions.
 * Any dynamic attempt to downgrade these below FORBIDDEN is strictly rejected.
 * Các hành động bị cấm tuyệt đối chuẩn tắc bất biến.
 * Bất kỳ nỗ lực động nào nhằm hạ cấp chúng dưới FORBIDDEN đều bị từ chối nghiêm ngặt.
 */
export declare const CANONICAL_HARD_FORBIDDEN_ACTIONS: readonly string[];
export type FailClosedReason = 'POLICY_CHECKSUM_MISMATCH' | 'POLICY_PROVENANCE_FAILURE' | 'POLICY_SNAPSHOT_CORRUPTED' | 'POLICY_SNAPSHOT_MISSING' | 'POLICY_VERSION_INVALID' | 'POLICY_TENANT_MISMATCH' | 'ACTIVE_POLICY_DRIFT' | 'USER_STOP_ACTIVE' | 'FORBIDDEN_DOWNGRADE_ATTEMPT' | 'GUARDRAIL_VIOLATION' | 'CONCURRENCY_LIMIT_EXCEEDED' | 'RETRY_BUDGET_EXHAUSTED' | 'APPROVAL_TIMEOUT_BELOW_MINIMUM' | 'ANONYMOUS_ACCESS_FORBIDDEN';
/**
 * Runtime execution context presented to the PEP.
 * Ngữ cảnh thực thi thời gian chạy được cung cấp cho PEP.
 */
export interface EnforcementContext {
    readonly toolName: string;
    readonly args: Readonly<Record<string, any>>;
    readonly actor: {
        readonly userId?: string;
        readonly role?: string;
        readonly channel?: string;
        readonly isOwner?: boolean;
    };
    readonly executionToken?: string;
    readonly idempotencyKey?: string;
    readonly correlationId?: string;
    readonly tenantPartition?: string;
    readonly requestedApprovalTimeoutMs?: number;
    readonly retryAttempt?: number;
}
/**
 * Result of active policy resolution.
 * Kết quả giải quyết chính sách hoạt động.
 */
export interface ActivePolicyResolutionResult {
    readonly success: boolean;
    readonly policyConfig?: PolicyConfiguration;
    readonly snapshotId?: PolicySnapshotId;
    readonly tenantPartition: string;
    readonly isBaselineFallback: boolean;
    readonly reason?: string;
    readonly failClosedReason?: FailClosedReason;
}
/**
 * Diagnostic report of policy drift and provenance divergence.
 * Báo cáo chẩn đoán về độ lệch chính sách và sự phân kỳ nguồn gốc.
 */
export interface PolicyDriftReport {
    readonly reportId: DriftReportId;
    readonly tenantPartition: string;
    readonly hasDrift: boolean;
    readonly durableVersionId: string;
    readonly inMemoryVersionId: string;
    readonly durableChecksum: string;
    readonly inMemoryChecksum: string;
    readonly timestamp: number;
    readonly details: string;
}
/**
 * Result of runtime guardrail evaluation.
 * Kết quả đánh giá rào chắn thời gian chạy.
 */
export interface GuardrailEvaluationResult {
    readonly evaluationId: GuardrailEvaluationId;
    readonly passed: boolean;
    readonly violations: readonly string[];
    readonly enforcedGuardrails: {
        readonly minApprovalTimeoutMs: number;
        readonly maxRetries: number;
        readonly currentRetries: number;
        readonly concurrencyLimit: number;
        readonly activeConcurrency: number;
    };
    readonly reason?: string;
    readonly failClosedReason?: FailClosedReason;
}
/**
 * Definitive decision produced by the Governed PEP.
 * Quyết định dứt khoát được tạo ra bởi PEP có Quản trị.
 */
export interface EnforcementDecision {
    readonly decisionId: EnforcementDecisionId;
    readonly allowed: boolean;
    readonly classification: ActionClassification;
    readonly requiresApproval: boolean;
    readonly policyVersion: string;
    readonly policyChecksum: string;
    readonly isBaselineFallback: boolean;
    readonly reason: string;
    readonly approvalId?: string;
    readonly leaseId?: ExecutionLeaseId;
    readonly decisionTimestamp: string;
    readonly failClosedReason?: FailClosedReason;
}
/**
 * Structured violation event recorded in the canonical audit ledger.
 * Sự kiện vi phạm có cấu trúc được ghi vào sổ cái kiểm toán chuẩn tắc.
 */
export interface PolicyViolationEvent {
    readonly auditId: ViolationAuditId;
    readonly timestamp: string;
    readonly eventType: 'POLICY_RESOLVED' | 'POLICY_ACTIVATED' | 'POLICY_REJECTED' | 'FORBIDDEN_DOWNGRADE_ATTEMPT' | 'GUARDRAIL_REJECTION' | 'RETRY_THROTTLED' | 'CONCURRENCY_THROTTLED' | 'DRIFT_DETECTED' | 'INTEGRITY_FAILURE' | 'FALLBACK_ACTIVATED' | 'USER_STOP_HALT';
    readonly tenantPartition: string;
    readonly toolName?: string;
    readonly policyVersion?: string;
    readonly reason: string;
    readonly details?: Readonly<Record<string, any>>;
}
/**
 * Snapshot of in-memory active policy runtime state.
 * Bản chụp trạng thái thời gian chạy của chính sách hoạt động trong bộ nhớ.
 */
export interface RuntimePolicyState {
    readonly tenantPartition: string;
    readonly activePolicyId: ActivePolicyId;
    readonly versionId: EvolutionVersionId;
    readonly checksum: string;
    readonly activatedAt: number;
    readonly isFallback: boolean;
    readonly inFlightExecutions: number;
}
