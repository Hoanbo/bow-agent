import type { RootCauseHypothesis } from '../diagnosis/diagnosisTypes.js';
import type { PostMitigationVerificationResult, RemediationRollbackResult, RemediationActionClass } from '../remediation/remediationTypes.js';
import type { HypothesisAccuracyRecord } from './incidentResilienceTypes.js';
export interface ScoreHypothesisInput {
    readonly hypothesis: RootCauseHypothesis;
    readonly actionClass?: RemediationActionClass;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
    readonly hasContradictoryEvidence?: boolean;
}
export declare class HypothesisAccuracyScorer {
    /**
     * Evaluates diagnostic hypothesis accuracy against verified remediation outcomes.
     * Đánh giá độ chính xác của giả thuyết chẩn đoán dựa trên kết quả khắc phục đã xác minh.
     */
    scoreHypothesis(input: ScoreHypothesisInput): HypothesisAccuracyRecord;
    private isActionCategoryAligned;
}
