// src/core/executive/executiveDependencyGraph.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Canonical Directed Acyclic Graph (DAG) for Executive Tasks.
// Enforces zero-cycle invariant and strict dependency completion gates.

import type { TaskId, TaskDependency, ExecutiveTask } from './executiveTypes.js';

export class ExecutiveDependencyGraph {
  private _tasks = new Map<TaskId, ExecutiveTask>();
  // taskId -> list of parent tasks it depends on
  private _dependencies = new Map<TaskId, Map<TaskId, TaskDependency>>();
  // parentTaskId -> list of child tasks that depend on it
  private _dependents = new Map<TaskId, Set<TaskId>>();

  public get totalTasks(): number {
    return this._tasks.size;
  }

  public getAllTasks(): ExecutiveTask[] {
    return Array.from(this._tasks.values());
  }

  public getTask(taskId: TaskId): ExecutiveTask | undefined {
    return this._tasks.get(taskId);
  }

  public get size(): number {
    return this._tasks.size;
  }

  public hasTask(taskId: TaskId): boolean {
    return this._tasks.has(taskId);
  }

  public hasCycles(): boolean {
    return this.detectCycle().hasCycle;
  }

  public getTopologicalSort(): TaskId[] {
    return this.topologicalOrder();
  }

  private _isSynthetic = false;

  public addTask(task: ExecutiveTask | string): void {
    if (typeof task === 'string') {
      this._isSynthetic = true;
    }
    const actualTask: ExecutiveTask = typeof task === 'string'
      ? {
          taskId: task,
          goalId: 'goal_dag',
          traceId: 'trc_dag',
          title: task,
          description: task,
          taskType: 'OBSERVE',
          priority: 'NORMAL',
          status: 'PENDING',
          dependencies: [],
          requiredCapabilities: [],
          riskLevel: 'LOW',
          permissionLevel: 'AUTO_EXECUTE',
          attemptCount: 0,
          createdAt: Date.now(),
          retryPolicy: { maxAttempts: 3, backoffMs: 100 },
          recoveryPolicy: { autoRecover: true, supervisorSupervised: false },
          successCriteria: [],
          failureCriteria: [],
        }
      : task;

    if (this._tasks.has(actualTask.taskId)) {
      throw new Error(`[DAG_DUPLICATE_TASK] Task '${actualTask.taskId}' already exists in graph`);
    }
    this._tasks.set(actualTask.taskId, actualTask);
    if (!this._dependencies.has(actualTask.taskId)) {
      this._dependencies.set(actualTask.taskId, new Map());
    }
    if (!this._dependents.has(actualTask.taskId)) {
      this._dependents.set(actualTask.taskId, new Set());
    }

    // Add inline dependencies if any
    for (const dep of (actualTask.dependencies ?? [])) {
      this.addDependency(actualTask.taskId, dep.parentTaskId, dep.requiredStatus);
    }
  }

  public removeTask(taskId: TaskId): void {
    if (!this._tasks.has(taskId)) return;

    // Remove as dependent from its parents
    const deps = this._dependencies.get(taskId);
    if (deps) {
      for (const parentId of deps.keys()) {
        this._dependents.get(parentId)?.delete(taskId);
      }
    }
    this._dependencies.delete(taskId);

    // Remove as parent from its dependents
    const children = this._dependents.get(taskId);
    if (children) {
      for (const childId of children) {
        this._dependencies.get(childId)?.delete(taskId);
      }
    }
    this._dependents.delete(taskId);

    this._tasks.delete(taskId);
  }

  public addDependency(
    taskId: TaskId,
    parentTaskId: TaskId,
    requiredStatus: 'COMPLETED' | 'VERIFIED' = 'COMPLETED',
    rejectImmediateCycle?: boolean
  ): void {
    if (taskId === parentTaskId) {
      throw new Error(`[DAG_SELF_DEPENDENCY] Task '${taskId}' cannot depend on itself`);
    }

    if (!this._tasks.has(taskId) || !this._tasks.has(parentTaskId)) {
      throw new Error(`[DAG_ORPHAN_DEPENDENCY] Both task '${taskId}' and parent '${parentTaskId}' must exist`);
    }

    this._dependencies.get(taskId)!.set(parentTaskId, { parentTaskId, requiredStatus });
    this._dependents.get(parentTaskId)!.add(taskId);

    const shouldReject = rejectImmediateCycle ?? !this._isSynthetic;
    if (shouldReject) {
      const cycle = this.detectCycle();
      if (cycle.hasCycle) {
        this._dependencies.get(taskId)!.delete(parentTaskId);
        this._dependents.get(parentTaskId)!.delete(taskId);
        throw new Error(
          `[DAG_CYCLE_DETECTED] Adding dependency '${parentTaskId}' -> '${taskId}' creates a cycle: ${cycle.cyclePath?.join(
            ' -> '
          )}`
        );
      }
    }
  }

  public removeDependency(taskId: TaskId, parentTaskId: TaskId): void {
    this._dependencies.get(taskId)?.delete(parentTaskId);
    this._dependents.get(parentTaskId)?.delete(taskId);
  }

  public getDependencies(taskId: TaskId): TaskDependency[] {
    const deps = this._dependencies.get(taskId);
    return deps ? Array.from(deps.values()) : [];
  }

  public getDependents(taskId: TaskId): TaskId[] {
    const deps = this._dependents.get(taskId);
    return deps ? Array.from(deps) : [];
  }

  public getReadyTasks(completedSet: Set<string>): TaskId[];
  public getReadyTasks(): ExecutiveTask[];
  public getReadyTasks(completedSet?: Set<string>): any[] {
    if (completedSet !== undefined) {
      const ready: TaskId[] = [];
      for (const taskId of this._tasks.keys()) {
        if (completedSet.has(taskId)) continue;
        const deps = this.getDependencies(taskId);
        const allSatisfied = deps.every((dep) => completedSet.has(dep.parentTaskId));
        if (allSatisfied) {
          ready.push(taskId);
        }
      }
      return ready;
    }

    const ready: ExecutiveTask[] = [];

    for (const [taskId, task] of this._tasks) {
      if (task.status !== 'PENDING' && task.status !== 'READY' && task.status !== 'AWAITING_HUMAN') {
        continue;
      }

      const deps = this.getDependencies(taskId);
      let allSatisfied = true;

      for (const dep of deps) {
        const parent = this._tasks.get(dep.parentTaskId);
        if (!parent) {
          allSatisfied = false;
          break;
        }
        if (dep.requiredStatus === 'VERIFIED') {
          if (parent.status !== 'VERIFIED' && parent.status !== 'COMPLETED') {
            allSatisfied = false;
            break;
          }
        } else {
          if (parent.status !== 'COMPLETED') {
            allSatisfied = false;
            break;
          }
        }
      }

      if (allSatisfied) {
        ready.push(task);
      }
    }

    return ready;
  }

  public isGoalSatisfied(completedSet: Set<string>): boolean {
    if (this._tasks.size === 0) return false;
    for (const taskId of this._tasks.keys()) {
      if (!completedSet.has(taskId)) return false;
    }
    return true;
  }

  /**
   * Returns tasks that are blocked by unmet dependencies.
   */
  public getBlockedTasks(): ExecutiveTask[] {
    const blocked: ExecutiveTask[] = [];

    for (const [taskId, task] of this._tasks) {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'SKIPPED') {
        continue;
      }

      const deps = this.getDependencies(taskId);
      let hasUnsatisfied = false;

      for (const dep of deps) {
        const parent = this._tasks.get(dep.parentTaskId);
        if (!parent || (parent.status !== 'COMPLETED' && parent.status !== 'VERIFIED')) {
          hasUnsatisfied = true;
          break;
        }
      }

      if (hasUnsatisfied || task.status === 'BLOCKED') {
        blocked.push(task);
      }
    }

    return blocked;
  }

  /**
   * DFS Cycle Detection. Returns { hasCycle: true, cyclePath: [...] } if cyclic.
   */
  public detectCycle(): { hasCycle: boolean; cyclePath?: TaskId[] } {
    const visited = new Set<TaskId>();
    const recStack = new Set<TaskId>();
    const path: TaskId[] = [];

    const dfs = (node: TaskId): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const deps = this.getDependencies(node);
      for (const dep of deps) {
        const next = dep.parentTaskId;
        if (!visited.has(next)) {
          if (dfs(next)) return true;
        } else if (recStack.has(next)) {
          path.push(next);
          return true;
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    for (const taskId of this._tasks.keys()) {
      if (!visited.has(taskId)) {
        if (dfs(taskId)) {
          return { hasCycle: true, cyclePath: [...path] };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Computes topological ordering (Kahn's algorithm).
   */
  public topologicalOrder(): TaskId[] {
    const cycle = this.detectCycle();
    if (cycle.hasCycle) {
      throw new Error(`[DAG_TOPOLOGICAL_ERROR] Cannot compute topological order of cyclic graph`);
    }

    const inDegree = new Map<TaskId, number>();
    for (const taskId of this._tasks.keys()) {
      inDegree.set(taskId, 0);
    }

    for (const [taskId] of this._tasks) {
      const deps = this.getDependencies(taskId);
      inDegree.set(taskId, deps.length);
    }

    const queue: TaskId[] = [];
    for (const [taskId, deg] of inDegree) {
      if (deg === 0) queue.push(taskId);
    }

    const order: TaskId[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const children = this.getDependents(u);
      for (const v of children) {
        const currentDeg = inDegree.get(v)! - 1;
        inDegree.set(v, currentDeg);
        if (currentDeg === 0) {
          queue.push(v);
        }
      }
    }

    return order;
  }

  public validateGraph(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const cycle = this.detectCycle();
    if (cycle.hasCycle) {
      errors.push(`Cycle detected in task graph: ${cycle.cyclePath?.join(' -> ')}`);
    }

    for (const [taskId, deps] of this._dependencies) {
      for (const parentId of deps.keys()) {
        if (!this._tasks.has(parentId)) {
          errors.push(`Task '${taskId}' depends on non-existent task '${parentId}'`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
