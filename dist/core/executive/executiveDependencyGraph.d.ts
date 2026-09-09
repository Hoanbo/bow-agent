import type { TaskId, TaskDependency, ExecutiveTask } from './executiveTypes.js';
export declare class ExecutiveDependencyGraph {
    private _tasks;
    private _dependencies;
    private _dependents;
    get totalTasks(): number;
    getAllTasks(): ExecutiveTask[];
    getTask(taskId: TaskId): ExecutiveTask | undefined;
    get size(): number;
    hasTask(taskId: TaskId): boolean;
    hasCycles(): boolean;
    getTopologicalSort(): TaskId[];
    private _isSynthetic;
    addTask(task: ExecutiveTask | string): void;
    removeTask(taskId: TaskId): void;
    addDependency(taskId: TaskId, parentTaskId: TaskId, requiredStatus?: 'COMPLETED' | 'VERIFIED', rejectImmediateCycle?: boolean): void;
    removeDependency(taskId: TaskId, parentTaskId: TaskId): void;
    getDependencies(taskId: TaskId): TaskDependency[];
    getDependents(taskId: TaskId): TaskId[];
    getReadyTasks(completedSet: Set<string>): TaskId[];
    getReadyTasks(): ExecutiveTask[];
    isGoalSatisfied(completedSet: Set<string>): boolean;
    /**
     * Returns tasks that are blocked by unmet dependencies.
     */
    getBlockedTasks(): ExecutiveTask[];
    /**
     * DFS Cycle Detection. Returns { hasCycle: true, cyclePath: [...] } if cyclic.
     */
    detectCycle(): {
        hasCycle: boolean;
        cyclePath?: TaskId[];
    };
    /**
     * Computes topological ordering (Kahn's algorithm).
     */
    topologicalOrder(): TaskId[];
    validateGraph(): {
        valid: boolean;
        errors: string[];
    };
}
