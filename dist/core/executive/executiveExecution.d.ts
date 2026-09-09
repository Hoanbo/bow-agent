import type { ExecutiveTask, ExecutiveTaskResult, SessionId, GoalId } from './executiveTypes.js';
export declare class ExecutiveExecutionEngine {
    private _executedTasksCount;
    get executedTasksCount(): number;
    /**
     * Executes an executive task after strict governance and authorization validation.
     */
    executeTask(task: ExecutiveTask, sessionIdOrToken?: SessionId | any, authTokenId?: string | any, goalId?: GoalId): Promise<ExecutiveTaskResult>;
    /**
     * Independently verifies the result of an executed task.
     * Invariant: VERIFICATION != COMMIT
     */
    verifyTask(task: ExecutiveTask): boolean;
    clear(): void;
}
export declare const globalExecutiveExecution: ExecutiveExecutionEngine;
