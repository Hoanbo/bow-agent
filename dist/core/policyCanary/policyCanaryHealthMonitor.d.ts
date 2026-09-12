import { type CanaryHealthReport, type CanaryTelemetryMetrics, type PolicyCandidateId, type PolicyRing } from './policyCanaryTypes.js';
export interface CanaryHealthThresholds {
    readonly maxMismatchRate?: number;
    readonly maxDenyRateDelta?: number;
    readonly maxHighImpactEscalations?: number;
    readonly maxGuardrailViolations?: number;
    readonly maxApprovalTimeouts?: number;
    readonly maxLatencyRegressionMs?: number;
    readonly minEvaluationsForPromotion?: number;
}
export declare const DEFAULT_CANARY_HEALTH_THRESHOLDS: Readonly<CanaryHealthThresholds>;
export declare class PolicyCanaryHealthMonitor {
    private readonly thresholds;
    constructor(thresholds?: CanaryHealthThresholds);
    /**
     * Evaluates telemetry metrics and produces an advisory CanaryHealthReport.
     * NEVER triggers promotion autonomously.
     *
     * Đánh giá các chỉ số đo lường từ xa và tạo Báo cáo Sức khỏe Canary có tính cố vấn.
     * KHÔNG BAO GIỜ kích hoạt thăng hạng một cách tự động.
     */
    evaluateHealth(input: {
        readonly candidateId: PolicyCandidateId;
        readonly tenantPartition: string;
        readonly ring: PolicyRing;
        readonly metrics: CanaryTelemetryMetrics;
    }): CanaryHealthReport;
}
export declare const globalPolicyCanaryHealthMonitor: PolicyCanaryHealthMonitor;
