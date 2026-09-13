import type { PostExecutionReconciliationResult, PostExecutionImpactAnalysis, PostExecutionRegressionFinding, PostExecutionEffectivenessResult, PolicyFeedbackProposal, PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
export declare class PolicyFeedbackProposalEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyPostExecutionOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Deterministically synthesizes a governed feedback proposal from post-execution evaluations.
     * Tổng hợp có tính xác định một đề xuất phản hồi có quản trị từ các đánh giá sau thực thi.
     */
    generateProposal(reconciliation: PostExecutionReconciliationResult, impact: PostExecutionImpactAnalysis, regression: PostExecutionRegressionFinding, effectiveness: PostExecutionEffectivenessResult): PolicyFeedbackProposal;
}
export declare const globalPolicyFeedbackProposalEngine: PolicyFeedbackProposalEngine;
