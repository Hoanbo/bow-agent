import type { AgentTask, TaskId, OrchestrationErrorCode } from './taskOrchestrationTypes.js';
export declare class TaskDependencyError extends Error {
    readonly code: OrchestrationErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestrationErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
export interface DependencyEvaluationResult {
    readonly status: 'SATISFIED' | 'WAITING' | 'BLOCKED' | 'INVALID';
    readonly code?: OrchestrationErrorCode;
    readonly reason?: string;
    readonly blockingTaskIds: readonly TaskId[];
}
export declare class TaskDependencyEngine {
    /**
     * Evaluates if all dependencies of a task are satisfied.
     */
    evaluateDependencies(task: AgentTask, taskLookup: (id: TaskId) => AgentTask | undefined): DependencyEvaluationResult;
    /**
     * Detects circular dependencies in a set of tasks using Depth First Search.
     */
    detectCycles(tasks: readonly AgentTask[]): {
        hasCycle: boolean;
        cyclePath?: string[];
    };
    /**
     * Asserts that adding a new task with dependencies does not introduce a cycle.
     */
    assertNoCycle(candidateTask: AgentTask, existingTasks: readonly AgentTask[]): void;
    /**
     * Determines if a task can safely transition to READY.
     */
    canTransitionToReady(task: AgentTask, taskLookup: (id: TaskId) => AgentTask | undefined): boolean;
}
export declare const globalTaskDependencyEngine: TaskDependencyEngine;
