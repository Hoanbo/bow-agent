import { type ReleaseCandidate, type ReleaseCandidateState } from './releaseTypes.js';
import type { QualityReportId, QualityEvidenceId } from '../quality/qualityTypes.js';
import type { SandboxId, WorktreeId } from '../sandbox/sandboxTypes.js';
export interface CreateReleaseCandidateParams {
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
    /** TTL for the candidate in milliseconds. Default: 30 minutes. */
    readonly ttlMs?: number;
}
export declare class ReleaseCandidateEngine {
    /**
     * Computes a deterministic SHA-256 provenance hash covering all 11 identity bindings.
     * This hash uniquely identifies the exact state, agent, session, task, delegation,
     * capability, sandbox, and worktree context of the release candidate.
     *
     * Tính toán mã băm nguồn gốc SHA-256 tất định bao gồm tất cả 11 liên kết định danh.
     * Mã băm này xác định duy nhất trạng thái, agent, phiên, tác vụ, ủy quyền,
     * năng lực, sandbox và ngữ cảnh worktree chính xác của ứng viên phát hành.
     */
    static hashCandidateProvenance(candidateId: string, milestoneTag: string, sourceManifestHash: string, qualityReportId: string, evidenceId: string, agentId: string, sessionId: string, taskId: string, delegationId: string, capabilityLeaseId: string, sandboxId: string, proposedAt: number): string;
    /**
     * Validates that a milestone tag is non-empty and follows the expected pattern (e.g. "MS-1.3.50").
     * Xác thực rằng thẻ mốc không rỗng và tuân theo mẫu kỳ vọng (ví dụ: "MS-1.3.50").
     */
    static validateMilestoneTag(tag: string): void;
    /**
     * Validates that all required bindings are present in the candidate params.
     * Xác thực rằng tất cả các liên kết bắt buộc có mặt trong tham số ứng viên.
     */
    static validateRequiredBindings(params: CreateReleaseCandidateParams): void;
    /**
     * Creates a new, immutable ReleaseCandidate record with a deterministic provenance hash.
     * Tạo một bản ghi ReleaseCandidate mới, bất biến với mã băm nguồn gốc tất định.
     */
    createReleaseCandidate(params: CreateReleaseCandidateParams): ReleaseCandidate;
    /**
     * Recomputes and verifies the provenance hash of an existing ReleaseCandidate.
     * Returns true if valid, throws ReleaseError if tampered.
     *
     * Tính toán lại và xác minh mã băm nguồn gốc của một ReleaseCandidate hiện có.
     * Trả về true nếu hợp lệ, ném ReleaseError nếu bị giả mạo.
     */
    static verifyProvenanceHash(candidate: ReleaseCandidate): boolean;
    /**
     * Returns a new copy of the candidate with an updated state, preserving all other fields.
     * Used for fail-closed state transitions (STALE, REVOKED, BLOCKED, FAILED, VERIFIED, REJECTED).
     *
     * Trả về một bản sao mới của ứng viên với trạng thái đã cập nhật, giữ nguyên tất cả các trường khác.
     * Được dùng cho các chuyển đổi trạng thái thất bại đóng.
     */
    static transitionState(candidate: ReleaseCandidate, newState: ReleaseCandidateState, reason?: string): ReleaseCandidate;
}
