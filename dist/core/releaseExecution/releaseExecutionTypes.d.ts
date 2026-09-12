import type { ReleaseCandidateId, ReleaseVerificationId } from '../release/releaseTypes.js';
export declare const RELEASE_EXECUTION_SCHEMA_VERSION: "4.0.0";
/**
 * Branded identifier for a release execution request and cycle.
 * Định danh có thương hiệu cho một yêu cầu và chu kỳ thực thi phát hành.
 */
export type ReleaseExecutionId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded ReleaseExecutionId.
 * Hàm hỗ trợ tạo ReleaseExecutionId có thương hiệu.
 */
export declare function createReleaseExecutionId(id: string): ReleaseExecutionId;
/**
 * Lifecycle states of release execution.
 * Fail-closed state machine.
 * NOTE: There is intentionally NO autonomous 'APPROVED' state.
 *
 * Các trạng thái vòng đời của thực thi phát hành.
 * Máy trạng thái fail-closed.
 * LƯU Ý: Cố ý KHÔNG có trạng thái 'APPROVED' tự động.
 */
export type ReleaseExecutionState = 'REQUESTED' | 'AUTHORITY_VALIDATING' | 'VERIFICATION_VALIDATING' | 'REVIEW_PENDING' | 'APPROVAL_PENDING' | 'OWNER_APPROVED' | 'AUTHORIZATION_PENDING' | 'AUTHORIZED' | 'EXECUTING' | 'VERIFYING' | 'COMPLETED' | 'REJECTED' | 'BLOCKED' | 'STALE' | 'CONFLICTED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED' | 'FAILED' | 'INVALID' | 'CONTRADICTED';
/**
 * Specification of an authorized release target.
 * Đặc tả của một mục tiêu phát hành được ủy quyền.
 */
export interface ReleaseExecutionTarget {
    readonly targetId: string;
    readonly projectRoot: string;
    readonly targetEnvironment: 'STAGING' | 'PRODUCTION' | 'RELEASE_CHANNEL' | 'LOCAL_DIST';
    readonly allowedSubdirectories?: readonly string[];
}
/**
 * Initial request to execute a verified release candidate.
 * Yêu cầu ban đầu để thực thi một ứng viên phát hành đã được xác minh.
 */
export interface ReleaseExecutionRequest {
    readonly executionId: ReleaseExecutionId;
    readonly candidateId: ReleaseCandidateId;
    readonly verificationId: ReleaseVerificationId;
    readonly target: ReleaseExecutionTarget;
    readonly operatorId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly requestedAt: number;
    readonly timeoutMs?: number;
}
/**
 * Human supervisory approval binding for release execution.
 * Ràng buộc phê duyệt giám sát của con người cho thực thi phát hành.
 */
export interface ReleaseExecutionApprovalBinding {
    readonly executionId: ReleaseExecutionId;
    readonly reviewerId: string;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly isOwnerApproval: boolean;
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly reviewedAt: number;
    readonly rationale: string;
}
/**
 * Authorization token binding reference.
 * The raw token secret is NOT persisted to durable storage.
 *
 * Tham chiếu ràng buộc mã ủy quyền.
 * Bí mật mã thô KHÔNG được lưu giữ trong bộ nhớ bền vững.
 */
export interface ReleaseExecutionAuthorizationBinding {
    readonly executionId: ReleaseExecutionId;
    readonly tokenId: string;
    readonly tokenHash: string;
    readonly actionId: string;
    readonly operatorId: string;
    readonly authorizedTarget: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
}
/**
 * Pre- or post-execution manifest summary for verification.
 * Tóm tắt bản kê khai trước hoặc sau thực thi để xác minh.
 */
export interface ReleaseExecutionManifest {
    readonly rootPath: string;
    readonly manifestHash: string;
    readonly capturedAt: number;
    readonly fileCount: number;
    readonly files: readonly {
        readonly relativePath: string;
        readonly sha256: string;
        readonly sizeBytes: number;
    }[];
}
/**
 * Atomic backup record for rollback safety.
 * Bản ghi sao lưu nguyên tử cho an toàn hoàn tác.
 */
export interface ReleaseExecutionRollbackBackup {
    readonly relativePath: string;
    readonly previousContent?: string;
    readonly previousExists: boolean;
}
/**
 * Cryptographic provenance evidence for the release execution.
 * Bằng chứng nguồn gốc mật mã cho thực thi phát hành.
 */
export interface ReleaseExecutionEvidence {
    readonly executionId: ReleaseExecutionId;
    readonly candidateId: ReleaseCandidateId;
    readonly verificationId: ReleaseVerificationId;
    readonly executionHash: string;
    readonly preReleaseManifestHash: string;
    readonly postReleaseManifestHash: string;
    readonly authorizationRef: string;
    readonly evidenceHash: string;
    readonly executedAt: number;
}
/**
 * Final execution result record.
 * Bản ghi kết quả thực thi cuối cùng.
 */
export interface ReleaseExecutionResult {
    readonly executionId: ReleaseExecutionId;
    readonly schemaVersion: typeof RELEASE_EXECUTION_SCHEMA_VERSION;
    readonly candidateId: ReleaseCandidateId;
    readonly verificationId: ReleaseVerificationId;
    readonly state: ReleaseExecutionState;
    readonly target: ReleaseExecutionTarget;
    readonly preReleaseManifestHash: string;
    readonly postReleaseManifestHash?: string;
    readonly filesMutated: readonly string[];
    readonly rollbackOccurred: boolean;
    readonly rollbackReason?: string;
    readonly errorDetails?: string;
    readonly evidence?: ReleaseExecutionEvidence;
    readonly startedAt: number;
    readonly completedAt: number;
    readonly resultHash: string;
}
/**
 * Multi-agent contradiction report in release execution.
 * Báo cáo mâu thuẫn đa tác nhân trong thực thi phát hành.
 */
export interface ReleaseExecutionContradiction {
    readonly contradictionId: string;
    readonly executionId: ReleaseExecutionId;
    readonly conflictingAgents: readonly {
        readonly agentId: string;
        readonly state: ReleaseExecutionState;
        readonly resultHash: string;
        readonly reportedAt: number;
    }[];
    readonly detectedAt: number;
    readonly reason: string;
}
export type ReleaseExecutionErrorCode = 'UNAUTHORIZED_TARGET' | 'PROTECTED_WORKSPACE_VIOLATION' | 'PATH_TRAVERSAL_DETECTED' | 'INVALID_CANDIDATE' | 'CANDIDATE_NOT_VERIFIED' | 'STALE_VERIFICATION_PACKET' | 'UNAPPROVED_EXECUTION' | 'SELF_APPROVAL_REJECTED' | 'INVALID_AUTHORIZATION_TOKEN' | 'AUTHORIZATION_EXPIRED' | 'TOKEN_REPLAY_REJECTED' | 'STALE_TARGET_STATE' | 'MUTATION_FAILED' | 'POST_VERIFICATION_FAILED' | 'ROLLBACK_FAILED' | 'CONTRADICTION_DETECTED' | 'USER_STOP_ACTIVE' | 'REVOCATION_ACTIVE' | 'MISSING_REQUIRED_BINDING' | 'EXECUTION_TIMEOUT' | 'DUPLICATE_EXECUTION';
export declare class ReleaseExecutionError extends Error {
    readonly code: ReleaseExecutionErrorCode;
    constructor(code: ReleaseExecutionErrorCode, message: string);
}
