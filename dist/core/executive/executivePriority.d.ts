import type { TaskPriority, ExecutiveTask } from './executiveTypes.js';
export declare const PRIORITY_WEIGHTS: Record<TaskPriority, number>;
export declare class ExecutivePriorityManager {
    private _starvationThresholdMs;
    getWeight(priority: TaskPriority): number;
    /**
     * Compares two tasks for scheduling priority.
     * Positive if a should execute before b, negative if b should execute before a.
     * Enforces starvation prevention: tasks waiting longer than threshold receive a priority boost.
     */
    compareTasks(a: ExecutiveTask, b: ExecutiveTask, now?: number): number;
}
export declare const globalExecutivePriority: ExecutivePriorityManager;
export declare function compareTaskPriority(a: TaskPriority, b: TaskPriority): number;
export declare function compareGoalPriority(a: TaskPriority, b: TaskPriority): number;
export declare function isHigherPriority(a: TaskPriority, b: TaskPriority): boolean;
