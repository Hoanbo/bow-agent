import type { ReleaseCandidate, ReleaseVerificationRecord, ReleaseContradiction } from './releaseTypes.js';
export declare class ReleaseContradictionEngine {
    /**
     * Detects contradictions between multiple release candidate proposals for the same milestone.
     * If two candidates for the same milestoneTag have different sourceManifestHash values,
     * this is a contradiction that must be escalated.
     *
     * Phát hiện mâu thuẫn giữa nhiều đề xuất ứng viên phát hành cho cùng một mốc.
     * Nếu hai ứng viên cho cùng một milestoneTag có giá trị sourceManifestHash khác nhau,
     * đây là mâu thuẫn phải được leo thang.
     */
    detectCandidateContradictions(candidates: readonly ReleaseCandidate[]): readonly ReleaseContradiction[];
    /**
     * Detects contradictions between multiple verification records for the same release candidate.
     * If two verification records for the same candidateId produce different verificationStates,
     * this is a critical contradiction that must be escalated to SupervisorHumanGate.
     *
     * Phát hiện mâu thuẫn giữa nhiều bản ghi xác minh cho cùng một ứng viên phát hành.
     * Nếu hai bản ghi xác minh cho cùng candidateId tạo ra verificationState khác nhau,
     * đây là mâu thuẫn nghiêm trọng phải được leo thang lên SupervisorHumanGate.
     */
    detectVerificationContradictions(records: readonly ReleaseVerificationRecord[]): readonly ReleaseContradiction[];
}
