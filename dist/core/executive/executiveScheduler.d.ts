import type { ExecutiveTask } from './executiveTypes.js';
import type { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
export declare class ExecutiveScheduler {
    private _activeLocks;
    acquireLock(resourceKey: string): boolean;
    releaseLock(resourceKey: string): void;
    get activeLockCount(): number;
    /**
     * Selects the next eligible task to execute from a dependency graph.
     */
    selectNextTask(graph: ExecutiveDependencyGraph, now?: number): ExecutiveTask | undefined;
    /**
     * Selects the highest priority runnable task from a provided list of tasks.
     */
    getNextRunnableTask(tasks: ExecutiveTask[], now?: number): ExecutiveTask | undefined;
    clear(): void;
}
export declare const globalExecutiveScheduler: ExecutiveScheduler;
