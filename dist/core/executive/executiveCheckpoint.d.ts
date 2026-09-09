import type { ExecutiveGoal, ExecutiveTask, ExecutiveCheckpoint, ExecutiveEscalationRecord, GoalId } from './executiveTypes.js';
export declare class ExecutiveCheckpointManager {
    private _maxCheckpointAgeMs;
    /**
     * Creates a tamper-evident checkpoint for a goal and its associated tasks.
     */
    createCheckpoint(goalOrGoalId: ExecutiveGoal | GoalId, maybeTasks?: ExecutiveTask[], maybeEscalations?: ExecutiveEscalationRecord[]): ExecutiveCheckpoint;
    /**
     * Restores goal and task state from a validated checkpoint.
     */
    restoreFromCheckpoint(checkpoint: ExecutiveCheckpoint): boolean;
    /**
     * Validates a checkpoint, rejecting stale or malformed records.
     */
    validateCheckpoint(checkpoint: ExecutiveCheckpoint, now?: number): {
        valid: boolean;
        error?: string;
    };
}
export declare const globalExecutiveCheckpoint: ExecutiveCheckpointManager;
