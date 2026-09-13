import type { DecisionProposalId, RemediationRequestId, PolicyRemediationType } from '../policyDecision/policyDecisionTypes.js';
import type { PolicyCandidateId, PolicyRing } from '../policyCanary/policyCanaryTypes.js';
export type ExecutionId = string & {
    readonly __brand: unique symbol;
};
export type ExecutionRequestId = string & {
    readonly __brand: unique symbol;
};
export type ExecutionEnvelopeId = string & {
    readonly __brand: unique symbol;
};
export type ExecutionOutcomeId = string & {
    readonly __brand: unique symbol;
};
export type ExecutionAttemptId = string & {
    readonly __brand: unique symbol;
};
export type ExecutionProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createExecutionId(val: string): ExecutionId;
export declare function createExecutionRequestId(val: string): ExecutionRequestId;
export declare function createExecutionEnvelopeId(val: string): ExecutionEnvelopeId;
export declare function createExecutionOutcomeId(val: string): ExecutionOutcomeId;
export declare function createExecutionAttemptId(val: string): ExecutionAttemptId;
export declare function createExecutionProvenanceId(val: string): ExecutionProvenanceId;
/**
 * Lifecycle state machine for remediation execution.
 * PENDING -> VALIDATING -> EXECUTING -> SUCCEEDED | FAILED | PARTIAL | BLOCKED | CANCELLED | UNKNOWN | TIMEOUT
 *
 * Máy trạng thái vòng đời thực thi khắc phục.
 */
export type ExecutionLifecycleStatus = 'PENDING' | 'VALIDATING' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL' | 'BLOCKED' | 'CANCELLED' | 'UNKNOWN' | 'TIMEOUT';
/**
 * Discrete outcome classifications derived from verifiable evidence.
 * Phân loại kết quả riêng biệt rút ra từ bằng chứng có thể kiểm chứng.
 */
export type ExecutionOutcomeStatus = 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'BLOCKED' | 'CANCELLED' | 'UNKNOWN';
/**
 * Preflight validation checks performed before envelope execution.
 * Kiểm tra xác thực tiền bay được thực hiện trước khi thực thi phong bì.
 */
export interface ExecutionPreflightValidation {
    readonly valid: boolean;
    readonly envelopeId: string;
    readonly tenantPartition: string;
    readonly checks: {
        readonly userStopClear: boolean;
        readonly safetyFloorVerified: boolean;
        readonly circuitBreakerClear: boolean;
        readonly authorizationValid: boolean;
        readonly notExpired: boolean;
        readonly tenantIsolated: boolean;
        readonly candidateValid: boolean;
    };
    readonly failureReason?: string;
    readonly validatedAt: string;
}
/**
 * Immutable execution attempt registration tracking idempotency and single-flight execution.
 * Đăng ký lần thử thực thi bất biến theo dõi tính bất biến và thực thi đơn tuyến.
 */
export interface ExecutionAttemptRecord {
    readonly attemptId: ExecutionAttemptId;
    readonly executionId: ExecutionId;
    readonly envelopeId: string;
    readonly requestId: RemediationRequestId;
    readonly tenantPartition: string;
    readonly status: ExecutionLifecycleStatus;
    readonly startedAt: string;
    readonly completedAt?: string;
    readonly attemptHash: string;
}
/**
 * Detailed execution receipt generated once execution concludes.
 * Biên nhận thực thi chi tiết được tạo sau khi thực thi kết thúc.
 */
export interface ExecutionReceipt {
    readonly executionId: ExecutionId;
    readonly envelopeId: string;
    readonly requestId: RemediationRequestId;
    readonly proposalId: DecisionProposalId;
    readonly tenantPartition: string;
    readonly candidateId?: PolicyCandidateId;
    readonly actionType: PolicyRemediationType;
    readonly targetRing?: PolicyRing;
    readonly status: ExecutionLifecycleStatus;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly dispatchedTarget: string;
    readonly rawOutput?: any;
    readonly error?: string;
    readonly operatorUserId: string;
    readonly executionDurationMs: number;
}
/**
 * Independent verification result produced by PolicyExecutionOutcomeVerifier.
 * Kết quả xác minh độc lập do PolicyExecutionOutcomeVerifier tạo ra.
 */
export interface ExecutionVerificationResult {
    readonly verificationId: ExecutionOutcomeId;
    readonly executionId: ExecutionId;
    readonly envelopeId: string;
    readonly tenantPartition: string;
    readonly status: ExecutionOutcomeStatus;
    readonly verified: boolean;
    readonly evidenceCount: number;
    readonly reasons: string[];
    readonly verifiedAt: string;
    readonly provenanceHash: string;
}
/**
 * Cryptographic provenance record for execution transitions.
 * Bản ghi nguồn gốc mật mã cho các chuyển đổi thực thi.
 */
export interface ExecutionProvenanceRecord {
    readonly provenanceId: ExecutionProvenanceId;
    readonly executionId: ExecutionId;
    readonly proposalId: DecisionProposalId;
    readonly tenantPartition: string;
    readonly eventType: string;
    readonly previousHash: string;
    readonly currentHash: string;
    readonly timestamp: string;
    readonly operatorUserId?: string;
}
/**
 * Disposition contract for crash recovery and restart reconciliation.
 * Hợp đồng xử lý cho phục hồi sự cố và điều hòa khởi động lại.
 */
export interface ExecutionRecoveryDisposition {
    readonly executionId: ExecutionId;
    readonly originalStatus: ExecutionLifecycleStatus;
    readonly recoveredStatus: ExecutionLifecycleStatus;
    readonly actionTaken: 'RECONCILED' | 'MARKED_UNKNOWN' | 'EVICTED_STALE' | 'ABORTED_FAIL_CLOSED';
    readonly reason: string;
    readonly recoveredAt: string;
}
/**
 * Master execution options.
 */
export interface PolicyExecutionOptions {
    readonly maxExecutionDurationMs?: number;
    readonly maxEnvelopeAgeMs?: number;
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
