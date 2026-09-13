import type { PolicyFeedbackProposal, PostExecutionReconciliationResult, PostExecutionImpactAnalysis, PostExecutionRegressionFinding, PostExecutionEffectivenessResult } from '../policyPostExecution/policyPostExecutionTypes.js';
import type { FeedbackRevalidationResult, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
export interface RevalidationContext {
    readonly proposal: PolicyFeedbackProposal;
    readonly reconciliation?: PostExecutionReconciliationResult;
    readonly impact?: PostExecutionImpactAnalysis;
    readonly regression?: PostExecutionRegressionFinding;
    readonly effectiveness?: PostExecutionEffectivenessResult;
    readonly existingProposalsForCandidate?: readonly PolicyFeedbackProposal[];
    readonly currentTimeMs?: number;
}
export declare class PolicyFeedbackRevalidationEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly proposalTtlMs;
    constructor(options?: PolicyFeedbackReviewOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently revalidates a feedback proposal against its post-execution artifacts.
     */
    revalidateProposal(context: RevalidationContext): FeedbackRevalidationResult;
}
