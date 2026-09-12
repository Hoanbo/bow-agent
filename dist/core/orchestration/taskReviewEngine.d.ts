import type { AgentTask, EvidenceBundle, TaskReviewState, TaskId, OrchestrationErrorCode } from './taskOrchestrationTypes.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
export declare class TaskReviewError extends Error {
    readonly code: OrchestrationErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestrationErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
export interface ReviewTaskInput {
    readonly task: AgentTask;
    readonly evidenceBundle: EvidenceBundle;
    readonly reviewerId: string;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly decision?: 'VERIFIED' | 'REJECTED' | 'ESCALATED_TO_HUMAN';
    readonly notes?: string;
}
export declare class TaskReviewEngine {
    private readonly humanGate;
    private readonly reviews;
    constructor(humanGate?: SupervisorHumanGate);
    /**
     * Reviews a completed task and its evidence bundle.
     */
    reviewTask(input: ReviewTaskInput): TaskReviewState;
    /**
     * Escalates an unresolved, high-impact, or contradictory task to the canonical HumanGate.
     * INVARIANT: Reuses globalSupervisorHumanGate — no second HumanGate created.
     */
    escalateToHumanGate(task: AgentTask, evidenceBundle: EvidenceBundle, operatorId: string, reason?: string): {
        review: TaskReviewState;
        gateRequest: HumanGateRequest;
    };
    /**
     * Confirms Master Owner explicit approval.
     * INVARIANT: OWNER_APPROVED requires Master Owner identity.
     */
    recordOwnerApproval(reviewId: string, operatorId: string): TaskReviewState;
    getReview(reviewId: string): TaskReviewState | undefined;
    getReviewsByTask(taskId: TaskId): readonly TaskReviewState[];
    clear(): void;
}
export declare const globalTaskReviewEngine: TaskReviewEngine;
