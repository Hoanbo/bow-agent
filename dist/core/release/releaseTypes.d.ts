import type { SandboxId, WorktreeId } from '../sandbox/sandboxTypes.js';
import type { QualityReportId, QualityEvidenceId } from '../quality/qualityTypes.js';
export declare const RELEASE_SCHEMA_VERSION: "4.0.0";
/**
 * Branded identifier for a release candidate record.
 * Định danh có thương hiệu cho một bản ghi ứng viên phát hành.
 */
export type ReleaseCandidateId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded ReleaseCandidateId.
 * Hàm hỗ trợ tạo ReleaseCandidateId có thương hiệu.
 */
export declare function createReleaseCandidateId(id: string): ReleaseCandidateId;
/**
 * Branded identifier for a release verification record.
 * Định danh có thương hiệu cho một bản ghi xác minh phát hành.
 */
export type ReleaseVerificationId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded ReleaseVerificationId.
 * Hàm hỗ trợ tạo ReleaseVerificationId có thương hiệu.
 */
export declare function createReleaseVerificationId(id: string): ReleaseVerificationId;
/**
 * Branded identifier for an acceptance criteria evaluation set.
 * Định danh có thương hiệu cho một bộ đánh giá tiêu chí chấp nhận.
 */
export type ReleaseAcceptanceCriteriaId = string & {
    readonly __brand: unique symbol;
};
/**
 * Factory helper to construct a branded ReleaseAcceptanceCriteriaId.
 * Hàm hỗ trợ tạo ReleaseAcceptanceCriteriaId có thương hiệu.
 */
export declare function createReleaseAcceptanceCriteriaId(id: string): ReleaseAcceptanceCriteriaId;
/**
 * Lifecycle states of a release candidate.
 * Fail-closed: FAILED/BLOCKED/STALE/REVOKED/EXPIRED states permanently prohibit
 * release authorization until a new candidate is proposed.
 *
 * Các trạng thái vòng đời của ứng viên phát hành.
 * Thất bại đóng: các trạng thái FAILED/BLOCKED/STALE/REVOKED/EXPIRED vĩnh viễn
 * cấm ủy quyền phát hành cho đến khi một ứng viên mới được đề xuất.
 */
export type ReleaseCandidateState = 'PROPOSED' | 'VERIFYING' | 'VERIFIED' | 'REJECTED' | 'BLOCKED' | 'STALE' | 'EXPIRED' | 'REVOKED' | 'FAILED';
/**
 * The technical outcome of a Release Verification Pipeline run.
 * NOT equivalent to release authorization. PASS here means technical criteria
 * were satisfied; it does NOT mean the Master Owner has authorized the release.
 *
 * Kết quả kỹ thuật của một lượt chạy Đường ống Xác minh Phát hành.
 * KHÔNG tương đương với ủy quyền phát hành. PASS ở đây có nghĩa là các tiêu chí
 * kỹ thuật đã được thỏa mãn; KHÔNG có nghĩa là Master Owner đã ủy quyền phát hành.
 */
export type ReleaseVerificationState = 'PASS' | 'FAIL' | 'BLOCKED' | 'CONTRADICTED' | 'STALE' | 'INCOMPLETE';
/**
 * The mandatory acceptance criteria keys evaluated per release candidate.
 * Các khóa tiêu chí chấp nhận bắt buộc được đánh giá cho mỗi ứng viên phát hành.
 */
export type AcceptanceCriterionKey = 'QUALITY_REPORT_PASS' | 'GATE_PASS' | 'CONTRADICTION_FREE' | 'EVIDENCE_VERIFIED' | 'MANIFEST_HASH_BOUND' | 'NO_BUILD_FAILURES' | 'NO_TEST_FAILURES' | 'PROVENANCE_HASH_VALID';
/**
 * The result of evaluating a single acceptance criterion.
 * Kết quả đánh giá một tiêu chí chấp nhận đơn lẻ.
 */
export interface AcceptanceCriteriaResult {
    readonly criterion: AcceptanceCriterionKey;
    readonly passed: boolean;
    readonly details: string;
    readonly evidenceHash?: string;
    readonly evaluatedAt: number;
}
/**
 * Contradiction detected between two or more release verification findings.
 * Mâu thuẫn được phát hiện giữa hai hoặc nhiều kết quả xác minh phát hành.
 */
export interface ReleaseContradiction {
    readonly contradictionId: string;
    readonly candidateId: ReleaseCandidateId;
    readonly conflictingFindings: readonly {
        readonly agentId: string;
        readonly verificationId: string;
        readonly verificationState: string;
        readonly verificationHash: string;
        readonly timestamp: number;
    }[];
    readonly detectedAt: number;
    readonly details: string;
}
/**
 * Full, immutable record of a proposed release candidate.
 * Contains all identity bindings required for cryptographic provenance verification.
 *
 * Bản ghi đầy đủ, bất biến của một ứng viên phát hành được đề xuất.
 * Chứa tất cả các liên kết định danh cần thiết để xác minh nguồn gốc mật mã.
 */
export interface ReleaseCandidate {
    readonly candidateId: ReleaseCandidateId;
    readonly schemaVersion: typeof RELEASE_SCHEMA_VERSION;
    readonly milestoneTag: string;
    readonly sourceManifestHash: string;
    readonly qualityReportId: QualityReportId;
    readonly evidenceId: QualityEvidenceId;
    readonly agentId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly sandboxId: SandboxId;
    readonly worktreeId?: WorktreeId;
    readonly proposedAt: number;
    readonly expiresAt: number;
    readonly state: ReleaseCandidateState;
    readonly stateReason?: string;
    /**
     * Deterministic SHA-256 provenance hash covering all identity bindings.
     * Mã băm nguồn gốc SHA-256 tất định bao gồm tất cả các liên kết định danh.
     */
    readonly provenanceHash: string;
}
/**
 * Record of a SupervisorHumanGate decision for a release verification.
 * NOT a release authorization. A PENDING/APPROVED gate decision only means
 * the supervisor reviewed the technical findings.
 *
 * Bản ghi quyết định của SupervisorHumanGate cho một xác minh phát hành.
 * KHÔNG phải là ủy quyền phát hành. Quyết định gate PENDING/APPROVED chỉ có nghĩa
 * là người giám sát đã xem xét các kết quả kỹ thuật.
 */
export interface ReleaseSupervisorGateRecord {
    readonly gateId: string;
    readonly candidateId: ReleaseCandidateId;
    readonly requestedAt: number;
    readonly reason: 'CONTRADICTION_DETECTED' | 'QUALITY_FAIL' | 'POLICY_VIOLATION' | 'MANDATORY_REVIEW';
    readonly status: 'PENDING' | 'ESCALATED';
}
/**
 * The complete, cryptographically verifiable output of the Release Verification Pipeline.
 *
 * INVARIANT: A PASS here is a TECHNICAL FINDING ONLY.
 * It is NOT release authorization. It is NOT owner approval.
 * The Master Owner must independently authorize any actual release action.
 *
 * Đầu ra hoàn chỉnh, có thể xác minh mật mã của Đường ống Xác minh Phát hành.
 *
 * BẤT BIẾN: PASS ở đây chỉ là KẾT QUẢ KỸ THUẬT.
 * KHÔNG phải ủy quyền phát hành. KHÔNG phải phê duyệt của Owner.
 * Master Owner phải độc lập ủy quyền cho bất kỳ hành động phát hành thực tế nào.
 */
export interface ReleaseVerificationRecord {
    readonly verificationId: ReleaseVerificationId;
    readonly schemaVersion: typeof RELEASE_SCHEMA_VERSION;
    readonly candidateId: ReleaseCandidateId;
    readonly milestoneTag: string;
    readonly qualityReportId: QualityReportId;
    readonly evidenceId: QualityEvidenceId;
    readonly acceptanceCriteriaResults: readonly AcceptanceCriteriaResult[];
    readonly acceptanceCriteriaId: ReleaseAcceptanceCriteriaId;
    readonly verificationState: ReleaseVerificationState;
    readonly contradictions: readonly ReleaseContradiction[];
    readonly supervisorGateRecord?: ReleaseSupervisorGateRecord;
    readonly failureReasons: readonly string[];
    /**
     * Deterministic SHA-256 hash covering: verificationId + candidateId + provenanceHash +
     * all criteria result hashes + verificationState.
     * Mã băm SHA-256 tất định bao gồm: verificationId + candidateId + provenanceHash +
     * tất cả mã băm kết quả tiêu chí + verificationState.
     */
    readonly verificationHash: string;
    readonly issuedAt: number;
}
/**
 * Execution context for the release verification pipeline run.
 * Ngữ cảnh thực thi cho lượt chạy đường ống xác minh phát hành.
 */
export interface ReleaseVerificationContext {
    readonly candidateId: ReleaseCandidateId;
    readonly agentId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly projectRoot: string;
}
/**
 * Error code enum for the Release verification subsystem.
 * Mã lỗi chuẩn cho các lỗi thuộc hệ thống con xác minh Phát hành.
 */
export declare enum ReleaseErrorCode {
    PROTECTED_WORKSPACE_VIOLATION = "PROTECTED_WORKSPACE_VIOLATION",
    USER_STOP_ACTIVE = "USER_STOP_ACTIVE",
    REVOCATION_ACTIVE = "REVOCATION_ACTIVE",
    CANDIDATE_NOT_FOUND = "CANDIDATE_NOT_FOUND",
    CANDIDATE_EXPIRED = "CANDIDATE_EXPIRED",
    CANDIDATE_STALE = "CANDIDATE_STALE",
    CANDIDATE_REVOKED = "CANDIDATE_REVOKED",
    CANDIDATE_FAILED = "CANDIDATE_FAILED",
    QUALITY_REPORT_NOT_FOUND = "QUALITY_REPORT_NOT_FOUND",
    EVIDENCE_BUNDLE_NOT_FOUND = "EVIDENCE_BUNDLE_NOT_FOUND",
    PROVENANCE_HASH_MISMATCH = "PROVENANCE_HASH_MISMATCH",
    MANIFEST_HASH_MISMATCH = "MANIFEST_HASH_MISMATCH",
    EVIDENCE_CORRUPTED = "EVIDENCE_CORRUPTED",
    ACCEPTANCE_CRITERIA_FAILED = "ACCEPTANCE_CRITERIA_FAILED",
    CONTRADICTION_DETECTED = "CONTRADICTION_DETECTED",
    SUPERVISOR_GATE_REQUIRED = "SUPERVISOR_GATE_REQUIRED",
    MISSING_REQUIRED_BINDING = "MISSING_REQUIRED_BINDING",
    INVALID_MILESTONE_TAG = "INVALID_MILESTONE_TAG",
    RELEASE_AUTHORIZATION_ATTEMPT = "RELEASE_AUTHORIZATION_ATTEMPT"
}
/**
 * Branded error class for all Release subsystem failures.
 * Lớp lỗi có thương hiệu cho tất cả các sự cố của hệ thống con Phát hành.
 */
export declare class ReleaseError extends Error {
    readonly code: ReleaseErrorCode;
    readonly timestamp: number;
    constructor(code: ReleaseErrorCode, message: string);
}
