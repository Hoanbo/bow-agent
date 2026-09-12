import { type ObservabilityHealthState, type MetricObservation, type DriftEvent, type InvariantCheck } from './observabilityTypes.js';
export interface HealthEvaluationInput {
    readonly metrics?: MetricObservation;
    readonly drifts?: readonly DriftEvent[];
    readonly invariantChecks?: readonly InvariantCheck[];
    readonly isUnavailable?: boolean;
}
export interface HealthEvaluationResult {
    readonly healthState: ObservabilityHealthState;
    readonly healthScore: number;
    readonly reasons: readonly string[];
    readonly supervisorRecommendation: string;
}
export declare class ObservabilityHealthEngine {
    /**
     * Evaluates aggregate health from normalized metrics, drift events, and invariant checks.
     * Đánh giá sức khỏe tổng hợp từ các chỉ số đã chuẩn hóa, các sự kiện sai lệch và các kiểm tra bất biến.
     */
    evaluateHealth(input: HealthEvaluationInput): HealthEvaluationResult;
}
