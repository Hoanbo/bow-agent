import type { FeedbackReviewQueueEntry, HumanReviewSubmission, HumanReviewDecisionRecord, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
export declare class PolicyFeedbackHumanReviewGate {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly decisions;
    constructor(options?: PolicyFeedbackReviewOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantDecisions;
    /**
     * Evaluates an explicit human review submission.
     * Rejects autonomous agents and invalid roles fail-closed.
     */
    evaluateSubmission(entry: FeedbackReviewQueueEntry, submission: HumanReviewSubmission): HumanReviewDecisionRecord;
    /**
     * Retrieves an existing recorded decision for a reviewId.
     */
    getRecordedDecision(tenantPartition: string, reviewId: string): HumanReviewDecisionRecord | undefined;
}
