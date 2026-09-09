// src/core/executive/executiveScheduler.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Priority Scheduler with Resource Locking and Starvation Avoidance.
// Invariant: USER_STOP > SCHEDULER; unmet dependencies block scheduling regardless of priority.

import type { ExecutiveTask } from './executiveTypes.js';
import type { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
import { globalExecutivePriority } from './executivePriority.js';
import { globalExecutiveCancellation } from './executiveCancellation.js';

export class ExecutiveScheduler {
  private _activeLocks = new Set<string>();

  public acquireLock(resourceKey: string): boolean {
    if (this._activeLocks.has(resourceKey)) {
      return false;
    }
    this._activeLocks.add(resourceKey);
    return true;
  }

  public releaseLock(resourceKey: string): void {
    this._activeLocks.delete(resourceKey);
  }

  public get activeLockCount(): number {
    return this._activeLocks.size;
  }

  /**
   * Selects the next eligible task to execute from a dependency graph.
   */
  public selectNextTask(graph: ExecutiveDependencyGraph, now: number = Date.now()): ExecutiveTask | undefined {
    // 1. Invariant: USER_STOP supersedes all scheduling
    if (globalExecutiveCancellation.isUserStopActive) {
      return undefined;
    }

    // 2. Query DAG for ready tasks whose dependencies are completed/verified
    const readyTasks = graph.getReadyTasks();
    if (readyTasks.length === 0) {
      return undefined;
    }

    // 3. Sort ready tasks by priority and starvation aging
    const sorted = [...readyTasks].sort((a, b) =>
      globalExecutivePriority.compareTasks(a, b, now)
    );

    // 4. Select highest priority task that is not resource-locked
    for (const task of sorted) {
      const resource = task.plan?.targetPath ?? (task.metadata?.resourceLock as string | undefined);
      if (resource && this._activeLocks.has(resource)) {
        // Resource locked by another operation, skip and check next ready task
        continue;
      }
      return task;
    }

    return undefined;
  }

  /**
   * Selects the highest priority runnable task from a provided list of tasks.
   */
  public getNextRunnableTask(tasks: ExecutiveTask[], now: number = Date.now()): ExecutiveTask | undefined {
    if (globalExecutiveCancellation.isUserStopActive) {
      return undefined;
    }
    const runnable = tasks.filter((t) => t.status === 'READY');
    if (runnable.length === 0) return undefined;

    const sorted = [...runnable].sort((a, b) =>
      globalExecutivePriority.compareTasks(a, b, now)
    );

    for (const task of sorted) {
      const resource = task.plan?.targetPath ?? (task.metadata?.resourceLock as string | undefined);
      if (resource && this._activeLocks.has(resource)) {
        continue;
      }
      return task;
    }
    return undefined;
  }

  public clear(): void {
    this._activeLocks.clear();
  }
}

export const globalExecutiveScheduler = new ExecutiveScheduler();
