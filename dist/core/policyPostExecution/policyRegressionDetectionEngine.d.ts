import type { PostExecutionReconciliationResult, PostExecutionImpactAnalysis, PostExecutionRegressionFinding, PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
export interface RegressionDetectionContext {
    readonly historicalFailureCount?: number;
    readonly repeatedRollbackCount?: number;
    readonly repeatedUnknownCount?: number;
    readonly candidateDivergenceCount?: number;
    readonly safetyViolationReported?: boolean;
}
export declare class PolicyRegressionDetectionEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyPostExecutionOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Deterministically evaluates post-execution evidence to detect policy regressions.
     * Đánh giá có tính xác định bằng chứng sau thực thi để phát hiện hồi quy chính sách.
     */
    detectRegression(reconciliation: PostExecutionReconciliationResult, impact: PostExecutionImpactAnalysis, context?: RegressionDetectionContext): PostExecutionRegressionFinding;
}
export declare const globalPolicyRegressionDetectionEngine: PolicyRegressionDetectionEngine;
