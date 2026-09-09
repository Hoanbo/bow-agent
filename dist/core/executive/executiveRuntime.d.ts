import type { GoalId, TaskId, ExecutiveGoal, ExecutiveTask, GoalProgress, ExecutiveHealth, ExecutiveCheckpoint, CreateTaskOptions } from './executiveTypes.js';
import { CreateGoalOptions } from './executiveGoal.js';
import { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
export declare class ExecutiveRuntime {
    private _goalGraphs;
    private _completedGoalsCount;
    private _failedGoalsCount;
    private _totalTasksExecutedCount;
    submitGoal(opts: CreateGoalOptions, customTaskSpecs?: CreateTaskOptions[]): Promise<ExecutiveGoal>;
    interpretGoal(goalId: GoalId): Promise<ExecutiveGoal>;
    decomposeGoal(goalId: GoalId, customTaskSpecs?: CreateTaskOptions[]): Promise<ExecutiveTask[]>;
    planGoalTasks(goalId: GoalId): Promise<ExecutiveGoal>;
    runGoal(goalId: GoalId): Promise<GoalProgress>;
    /**
     * Executes a single atomic step for the given goal.
     * Selects next ready task, evaluates governance, executes, independently verifies,
     * updates DAG and progress, and handles failure recovery if necessary.
     */
    stepGoal(goalId: GoalId, humanAuthTokenId?: string): Promise<ExecutiveGoal>;
    /**
     * Runs a goal step-by-step until terminal status or maxSteps reached.
     */
    runGoalUntilCompletion(goalId: GoalId, options?: {
        maxSteps?: number;
        humanAuthTokens?: Map<TaskId, string>;
    }): Promise<ExecutiveGoal>;
    triggerUserStop(reason?: string): void;
    resetUserStop(): void;
    cancelGoal(goalId: GoalId, reason?: string): void;
    pauseGoal(goalId: GoalId, reason?: string): void;
    resumeGoal(goalId: GoalId): void;
    checkpointGoal(goalId: GoalId): ExecutiveCheckpoint;
    restoreFromCheckpoint(goalId: GoalId): ExecutiveGoal;
    getGoalGraph(goalId: GoalId): ExecutiveDependencyGraph | undefined;
    getHealth(): ExecutiveHealth;
    clear(): void;
}
export declare const globalExecutiveRuntime: ExecutiveRuntime;
