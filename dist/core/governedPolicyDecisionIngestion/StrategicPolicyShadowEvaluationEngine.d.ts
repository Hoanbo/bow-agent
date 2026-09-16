import { type CanonicalStrategicPolicy, type ShadowEvaluationReport } from './GovernedPolicyDecisionIngestionTypes.js';
export interface HistoricalDecisionTrace {
    traceId: string;
    action: string;
    parameters: Record<string, any>;
    baselineDecision: 'ALLOW' | 'DENY' | 'REQUIRE_HUMAN_APPROVAL';
    timestamp: number;
}
export declare class StrategicPolicyShadowEvaluationEngine {
    /**
     * Evaluate a candidate policy against historical traces in a bounded, isolated, side-effect-free manner.
     * Đánh giá chính sách ứng viên so với các vết lịch sử trong môi trường cô lập, giới hạn và phi tác dụng phụ.
     */
    evaluateShadow(candidatePolicy: CanonicalStrategicPolicy, historicalTraces: HistoricalDecisionTrace[], maxPermittedDivergence?: number): ShadowEvaluationReport;
    private evaluateActionAgainstPolicy;
}
