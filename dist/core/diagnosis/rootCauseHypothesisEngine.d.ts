import type { CorrelatedEvidenceCluster, RootCauseHypothesis } from './diagnosisTypes.js';
export interface HypothesisEvaluationOptions {
    readonly hasMultiAgentDissent?: boolean;
    readonly contradictingEvidenceIds?: readonly string[];
}
export declare class RootCauseHypothesisEngine {
    static readonly MAX_CONFIDENCE = 0.95;
    static readonly MIN_CONFIDENCE = 0.05;
    static readonly DISSENT_PENALTY = 0.4;
    static readonly CONTRADICTION_PENALTY_PER_ITEM = 0.35;
    /**
     * Evaluates correlated evidence cluster against deterministic failure topology patterns.
     * Đánh giá cụm bằng chứng tương quan dựa trên các mẫu cấu trúc liên kết lỗi xác định.
     */
    evaluateHypotheses(cluster: CorrelatedEvidenceCluster, options?: HypothesisEvaluationOptions): readonly RootCauseHypothesis[];
    /**
     * Formulates a single hypothesis with mathematically bounded confidence and uncertainty.
     * Xây dựng một giả thuyết đơn lẻ với độ tin cậy và độ không chắc chắn bị giới hạn về mặt toán học.
     */
    private buildHypothesis;
}
export declare const globalRootCauseHypothesisEngine: RootCauseHypothesisEngine;
