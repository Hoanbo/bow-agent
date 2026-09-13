import type { FeedbackReviewQueueEntry, HumanReviewDecisionRecord, PolicyEvolutionIntakeRequest, EvolutionIntakeActionType, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
export interface IntakeCreationResult {
    readonly created: boolean;
    readonly intakeRequest?: PolicyEvolutionIntakeRequest;
    readonly reason?: string;
}
export declare class PolicyEvolutionIntakeEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly intakes;
    constructor(options?: PolicyFeedbackReviewOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantIntakes;
    /**
     * Deterministically maps a proposal action type to an evolution intake action type.
     */
    mapActionType(proposedAction: string): EvolutionIntakeActionType | undefined;
    /**
     * Creates a bounded Policy Evolution Intake Request for an accepted human review.
     */
    createIntakeRequest(entry: FeedbackReviewQueueEntry, decisionRecord: HumanReviewDecisionRecord, provenanceHeadHash: string): IntakeCreationResult;
    /**
     * Retrieves existing intake request for a review.
     */
    getIntakeRequest(tenantPartition: string, reviewId: string): PolicyEvolutionIntakeRequest | undefined;
}
