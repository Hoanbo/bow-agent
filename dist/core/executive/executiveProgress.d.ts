import type { ExecutiveGoal, ExecutiveTask, GoalProgress, GoalId } from './executiveTypes.js';
export declare class ExecutiveProgressEngine {
    /**
     * Calculates progress directly from a goal ID by querying registered goal and tasks.
     */
    calculateProgress(goalId: GoalId): GoalProgress;
    /**
     * Computes authoritative progress for a goal given its associated tasks.
     */
    computeProgress(goal: ExecutiveGoal, tasks: ExecutiveTask[]): GoalProgress;
    /**
     * Evaluates if a goal satisfies its success criteria.
     * Invariant: TASK_COMPLETION != GOAL_COMPLETION. Success criteria must be strictly evaluated.
     */
    evaluateGoalSuccess(goal: ExecutiveGoal, tasks: ExecutiveTask[]): boolean;
    /**
     * Validates cognitive progress claims against ground truth.
     * Rejects if claimed progress deviates from actual mathematical progress by > 1%.
     */
    validateClaimedProgress(goal: ExecutiveGoal, claimedPercent: number): boolean;
}
export declare const globalExecutiveProgress: ExecutiveProgressEngine;
