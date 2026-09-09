import type { ExecutiveTask, GoalId } from './executiveTypes.js';
export type RecoveryClassification = 'RECOVERABLE' | 'DEGRADED' | 'HUMAN_REQUIRED' | 'CRITICAL_BLOCKED';
export interface RecoveryAssessment {
    readonly recoverable: boolean;
    readonly classification: RecoveryClassification;
    readonly reason: string;
    readonly suggestedAction: 'RETRY' | 'ESCALATE' | 'ABORT' | 'WAIT_FOR_MASTER_AUTHORIZATION';
    readonly attemptNumber: number;
    readonly maxAttempts: number;
}
export declare class ExecutiveRecoveryCoordinator {
    /**
     * Assesses whether a failed task can be autonomously recovered and retried.
     * Classifies failure as: RECOVERABLE, DEGRADED, HUMAN_REQUIRED, or CRITICAL_BLOCKED.
     * Enforces default bounded retries of maxAttempts = 3.
     */
    assessFailure(task: ExecutiveTask, goalId: GoalId): RecoveryAssessment;
    /**
     * Determines if a task has remaining retry attempts.
     */
    shouldRetry(task: ExecutiveTask): boolean;
    /**
     * Calculates backoff duration for a task using exponential backoff formula:
     * delay = initialBackoffMs * (backoffFactor ^ attemptCount), capped by maxBackoffMs.
     */
    calculateBackoff(task: ExecutiveTask): number;
    /**
     * Performs recovery preparation for a failed task via SupervisorRuntime.
     */
    prepareRecovery(task: ExecutiveTask): Promise<boolean>;
}
export declare const globalExecutiveRecovery: ExecutiveRecoveryCoordinator;
