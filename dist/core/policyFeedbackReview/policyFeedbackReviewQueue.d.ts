import type { FeedbackReviewId, FeedbackReviewQueueEntry, FeedbackReviewLifecycleState, PolicyFeedbackReviewOptions } from './policyFeedbackReviewTypes.js';
export interface ListQueueOptions {
    readonly page?: number;
    readonly pageSize?: number;
    readonly state?: FeedbackReviewLifecycleState;
}
export interface ListQueueResult {
    readonly entries: readonly FeedbackReviewQueueEntry[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
}
export declare class PolicyFeedbackReviewQueue {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly tenantEntries;
    private readonly proposalLookup;
    constructor(options?: PolicyFeedbackReviewOptions);
    private assertUserStopInactive;
    private getTenantStorageDir;
    private loadTenantStateIfEmpty;
    private persistTenantState;
    /**
     * Enqueues a feedback proposal for human review.
     * Enforces single-entry anti-duplicate defense per proposalId.
     */
    enqueue(entry: FeedbackReviewQueueEntry): FeedbackReviewQueueEntry;
    /**
     * Retrieves a single entry by reviewId.
     */
    getEntry(tenantPartition: string, reviewId: FeedbackReviewId): FeedbackReviewQueueEntry | undefined;
    /**
     * Retrieves entry by proposalId.
     */
    getEntryByProposalId(tenantPartition: string, proposalId: string): FeedbackReviewQueueEntry | undefined;
    /**
     * Lists review entries for a tenant with deterministic ordering and bounded pagination.
     */
    listEntries(tenantPartition: string, options?: ListQueueOptions): ListQueueResult;
    /**
     * Updates state of an existing queue entry with terminal state immutability.
     */
    updateEntryState(tenantPartition: string, reviewId: FeedbackReviewId, newState: FeedbackReviewLifecycleState): FeedbackReviewQueueEntry;
}
