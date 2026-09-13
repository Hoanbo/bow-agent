import type { PolicyRing } from '../policyCanary/policyCanaryTypes.js';
import type { PostExecutionReconciliationResult } from './policyPostExecutionTypes.js';
import { type PostExecutionImpactAnalysis, type PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
export interface ImpactAnalysisContext {
    readonly expectedEffect: string;
    readonly targetRing?: PolicyRing;
    readonly observedRing?: PolicyRing;
    readonly safetyStateDegraded?: boolean;
    readonly metricsDelta?: Record<string, number>;
    readonly observedEffect?: string;
}
export declare class PolicyImpactAnalysisEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyPostExecutionOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Evaluates and classifies the expected vs actual impact of an executed remediation.
     * Đánh giá và phân loại tác động dự kiến so với thực tế của một hành động khắc phục đã thực thi.
     */
    analyzeImpact(reconciliation: PostExecutionReconciliationResult, context: ImpactAnalysisContext): PostExecutionImpactAnalysis;
}
export declare const globalPolicyImpactAnalysisEngine: PolicyImpactAnalysisEngine;
