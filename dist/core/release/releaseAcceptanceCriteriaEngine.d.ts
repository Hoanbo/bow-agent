import { type ReleaseCandidate, type AcceptanceCriteriaResult, type ReleaseAcceptanceCriteriaId } from './releaseTypes.js';
import type { QualityVerificationReport, QualityEvidenceBundle } from '../quality/qualityTypes.js';
export interface AcceptanceCriteriaEvaluationOutput {
    readonly acceptanceCriteriaId: ReleaseAcceptanceCriteriaId;
    readonly results: readonly AcceptanceCriteriaResult[];
    readonly overallPass: boolean;
    readonly failureReasons: readonly string[];
    readonly evaluationHash: string;
}
export declare class ReleaseAcceptanceCriteriaEngine {
    /**
     * Computes a deterministic SHA-256 hash over all acceptance criteria results.
     * Tính toán mã băm SHA-256 tất định trên tất cả kết quả tiêu chí chấp nhận.
     */
    static hashCriteriaResults(results: readonly AcceptanceCriteriaResult[]): string;
    /**
     * Evaluates all 8 mandatory acceptance criteria for the release candidate.
     * Fail-closed: ALL criteria must pass for overallPass = true.
     *
     * Đánh giá tất cả 8 tiêu chí chấp nhận bắt buộc cho ứng viên phát hành.
     * Thất bại đóng: TẤT CẢ tiêu chí phải qua để overallPass = true.
     */
    evaluateAll(candidate: ReleaseCandidate, qualityReport: QualityVerificationReport, evidenceBundle: QualityEvidenceBundle): AcceptanceCriteriaEvaluationOutput;
}
