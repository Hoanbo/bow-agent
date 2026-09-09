import type { TaskId, GoalId, TaskStatus, ExecutiveTask, ExecutiveTaskResult, CreateTaskOptions } from './executiveTypes.js';
export declare class ExecutiveTaskManager {
    private _tasks;
    private _goalTasks;
    createTask(opts: CreateTaskOptions): ExecutiveTask;
    /** Rehydrates a previously validated durable task without changing its identity. */
    restoreTask(task: ExecutiveTask): ExecutiveTask;
    getTask(taskId: TaskId): ExecutiveTask | undefined;
    getTasksByGoal(goalId: GoalId): ExecutiveTask[];
    getTasksForGoal(goalId: GoalId): ExecutiveTask[];
    updateTaskStatus(taskId: TaskId, nextStatus: TaskStatus, context?: string | ExecutiveTaskResult): ExecutiveTask;
    setTaskResult(taskId: TaskId, result: ExecutiveTaskResult): void;
    setTaskError(taskId: TaskId, error: string): void;
    getAllTasks(): ExecutiveTask[];
    upsertTask(task: ExecutiveTask): ExecutiveTask;
    clear(): void;
}
export declare const globalExecutiveTaskManager: ExecutiveTaskManager;
