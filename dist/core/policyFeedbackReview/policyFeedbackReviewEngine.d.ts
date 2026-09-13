import type { FeedbackReviewId, FeedbackReviewQueueEntry, HumanReviewSubmission, HumanReviewDecisionRecord, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
import { PolicyFeedbackRevalidationEngine, type RevalidationContext } from './policyFeedbackRevalidationEngine.js';
import { PolicyFeedbackReviewQueue } from './policyFeedbackReviewQueue.js';
import { PolicyFeedbackHumanReviewGate } from './policyFeedbackHumanReviewGate.js';
import { PolicyEvolutionIntakeEngine, type IntakeCreationResult } from './policyEvolutionIntakeEngine.js';
export interface IngestProposalInput extends RevalidationContext {
}
export interface IngestProposalResult {
    readonly success: boolean;
    readonly reviewId?: FeedbackReviewId;
    readonly queueEntry?: FeedbackReviewQueueEntry;
    readonly status: 'QUEUED' | 'REJECTED_REVALIDATION' | 'EXPIRED' | 'SUPERSEDED' | 'INVALID';
    readonly reasons: readonly string[];
}
export interface ProcessReviewResult {
    readonly success: boolean;
    readonly queueEntry: FeedbackReviewQueueEntry;
    readonly decisionRecord: HumanReviewDecisionRecord;
    readonly intakeResult?: IntakeCreationResult;
}
export declare class PolicyFeedbackReviewEngine {
    private readonly revalidationEngine;
    private readonly queue;
    private readonly humanGate;
    private readonly intakeEngine;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyFeedbackReviewOptions, revalidationEngine?: PolicyFeedbackRevalidationEngine, queue?: PolicyFeedbackReviewQueue, humanGate?: PolicyFeedbackHumanReviewGate, intakeEngine?: PolicyEvolutionIntakeEngine);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Ingests a feedback proposal from MS-1.3.66, runs independent revalidation,
     * and enqueues into the Human Review Queue if valid.
     */
    ingestProposal(input: IngestProposalInput): IngestProposalResult;
    /**
     * Processes an explicit human review submission, updates queue entry state,
     * and creates an evolution intake request if accepted.
     */
    processHumanReview(tenantPartition: string, submission: HumanReviewSubmission, provenanceHeadHash?: string): ProcessReviewResult;
}
