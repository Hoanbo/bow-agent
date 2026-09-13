import type { PostExecutionReconciliationResult, PostExecutionImpactAnalysis, PostExecutionRegressionFinding, PostExecutionEffectivenessResult, PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
export interface EffectivenessEvaluationContext {
    readonly underlyingIssueResolved?: boolean;
    readonly empiricalEvidenceCount?: number;
    readonly healthRestored?: boolean;
    readonly detailedNotes?: string;
}
export declare class PolicyRemediationEffectivenessEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyPostExecutionOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Assesses the effectiveness of an executed remediation.
     * Đánh giá hiệu quả của một hành động khắc phục đã thực thi.
     */
    assessEffectiveness(reconciliation: PostExecutionReconciliationResult, impact: PostExecutionImpactAnalysis, regression: PostExecutionRegressionFinding, context?: EffectivenessEvaluationContext): PostExecutionEffectivenessResult;
}
export declare const globalPolicyRemediationEffectivenessEngine: PolicyRemediationEffectivenessEngine;
