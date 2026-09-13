import type { FeedbackReviewId, FeedbackReviewProvenanceRecord, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
export declare class PolicyFeedbackReviewProvenanceEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyFeedbackReviewOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantChains;
    /**
     * Appends an event to the review provenance chain.
     */
    appendEvent(tenantPartition: string, reviewId: FeedbackReviewId, eventType: string, details?: Record<string, any>): FeedbackReviewProvenanceRecord;
    /**
     * Gets the head hash of a review provenance chain.
     */
    getHeadHash(tenantPartition: string, reviewId: FeedbackReviewId): string;
    /**
     * Cryptographically verifies the integrity of a review provenance chain.
     */
    verifyChainIntegrity(tenantPartition: string, reviewId: FeedbackReviewId): {
        valid: boolean;
        errors: string[];
    };
}
