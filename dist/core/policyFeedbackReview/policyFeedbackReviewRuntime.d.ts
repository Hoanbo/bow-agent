import type { FeedbackReviewId, FeedbackReviewQueueEntry, HumanReviewSubmission, PolicyEvolutionIntakeRequest, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
import { type ListQueueOptions, type ListQueueResult } from './policyFeedbackReviewQueue.js';
import { type IngestProposalInput, type IngestProposalResult, type ProcessReviewResult } from './policyFeedbackReviewEngine.js';
export declare class PolicyFeedbackReviewRuntime {
    private readonly revalidationEngine;
    private readonly queue;
    private readonly humanGate;
    private readonly intakeEngine;
    private readonly reviewEngine;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyFeedbackReviewOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Ingests, revalidates, queues, and records audit/provenance for a feedback proposal.
     */
    ingestFeedbackProposal(input: IngestProposalInput): IngestProposalResult;
    /**
     * Lists queued reviews for a tenant with bounded pagination.
     */
    listReviewQueue(tenantPartition: string, options?: ListQueueOptions): ListQueueResult;
    /**
     * Retrieves a review queue entry.
     */
    getReviewQueueEntry(tenantPartition: string, reviewId: FeedbackReviewId): FeedbackReviewQueueEntry | undefined;
    /**
     * Submits and processes an explicit human review decision.
     * If accepted, creates an immutable PolicyEvolutionIntakeRequest.
     */
    submitHumanReview(tenantPartition: string, submission: HumanReviewSubmission): ProcessReviewResult;
    /**
     * Retrieves an evolution intake request by reviewId.
     */
    getIntakeRequest(tenantPartition: string, reviewId: string): PolicyEvolutionIntakeRequest | undefined;
    /**
     * Verifies provenance integrity for a review.
     */
    verifyProvenanceIntegrity(tenantPartition: string, reviewId: FeedbackReviewId): {
        valid: boolean;
        errors: string[];
    };
}
