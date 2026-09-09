import type { GoalId, TraceId, SessionId, TaskPriority, GoalStatus, ExecutiveGoal, ExecutiveGoalSuccessCriteria, ExecutiveGoalFailureCriteria, GoalProgress, TaskId } from './executiveTypes.js';
export interface CreateGoalOptions {
    readonly sessionId?: SessionId;
    readonly objective?: string;
    readonly title?: string;
    readonly description?: string;
    readonly intent?: string;
    readonly priority?: TaskPriority;
    readonly traceId?: TraceId;
    readonly origin?: 'USER' | 'SYSTEM' | 'SUPERVISOR';
    readonly constraints?: string[];
    readonly successCriteria?: Partial<ExecutiveGoalSuccessCriteria>;
    readonly failureCriteria?: Partial<ExecutiveGoalFailureCriteria>;
    readonly authorizationPolicy?: 'DEFAULT' | 'STRICT' | 'ELEVATED';
    readonly deadline?: number;
    readonly metadata?: Record<string, unknown>;
    readonly status?: GoalStatus;
}
export declare class ExecutiveGoalManager {
    private _goals;
    private _sessionGoals;
    createGoal(opts: CreateGoalOptions): ExecutiveGoal;
    /** Rehydrates a previously validated durable goal without changing its identity. */
    restoreGoal(goal: ExecutiveGoal): ExecutiveGoal;
    getGoal(goalId: GoalId, sessionId?: SessionId): ExecutiveGoal | undefined;
    getGoalsBySession(sessionId: SessionId): ExecutiveGoal[];
    updateGoalStatus(goalId: GoalId, nextStatus: GoalStatus, context?: string): ExecutiveGoal;
    setCurrentTaskId(goalId: GoalId, taskId?: TaskId): void;
    updateGoalProgress(goalId: GoalId, progress: GoalProgress): void;
    getAllGoals(): ExecutiveGoal[];
    upsertGoal(goal: ExecutiveGoal): ExecutiveGoal;
    clear(): void;
}
export declare const globalExecutiveGoalManager: ExecutiveGoalManager;
