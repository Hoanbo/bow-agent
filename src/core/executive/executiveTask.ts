// src/core/executive/executiveTask.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Canonical Task Manager for Executive Tasks.

import crypto from 'node:crypto';
import type {
  TaskId,
  GoalId,
  TraceId,
  TaskPriority,
  TaskStatus,
  ExecutiveTask,
  TaskDependency,
  TaskRetryPolicy,
  TaskRecoveryPolicy,
  TaskSuccessCriteria,
  TaskFailureCriteria,
  ExecutiveTaskPlan,
  ExecutiveTaskResult,
  CreateTaskOptions,
  ExecutiveRiskLevel,
} from './executiveTypes.js';
import { assertValidTaskTransition } from './executiveTransitions.js';
import { globalExecutiveAudit } from './executiveAudit.js';

export class ExecutiveTaskManager {
  private _tasks = new Map<TaskId, ExecutiveTask>();
  // goalId -> Set<TaskId>
  private _goalTasks = new Map<GoalId, Set<TaskId>>();

  public createTask(opts: CreateTaskOptions): ExecutiveTask {
    const taskId: TaskId = `task_exec_${crypto.randomBytes(6).toString('hex')}`;
    const traceId: TraceId = opts.traceId ?? `tr_task_${crypto.randomBytes(8).toString('hex')}`;

    const defaultRetry: TaskRetryPolicy = {
      maxAttempts: opts.retryPolicy?.maxAttempts ?? 3,
      backoffMs: opts.retryPolicy?.backoffMs ?? 100,
      ...(opts.retryPolicy ?? {}),
    };

    const defaultRecovery: TaskRecoveryPolicy = {
      autoRecover: opts.recoveryPolicy?.autoRecover ?? true,
      supervisorSupervised: opts.recoveryPolicy?.supervisorSupervised ?? true,
      ...(opts.recoveryPolicy ?? {}),
    };

    const task: ExecutiveTask = {
      taskId,
      goalId: opts.goalId,
      parentTaskId: opts.parentTaskId,
      traceId,
      title: opts.title,
      description: opts.description,
      taskType: opts.taskType ?? 'OBSERVE',
      priority: opts.priority ?? 'MEDIUM',
      status: 'PENDING',
      dependencies: (opts.dependencies ?? []).map((d) => ({
        parentTaskId: d.parentTaskId ?? (d as any).taskId,
        taskId: (d as any).taskId ?? d.parentTaskId,
        requiredStatus: d.requiredStatus ?? 'COMPLETED',
      })),
      requiredCapabilities: opts.requiredCapabilities ?? [],
      riskLevel: opts.riskLevel ?? 'LOW',
      permissionLevel: opts.permissionLevel ?? 'AUTO_EXECUTE',
      plan: opts.plan,
      attemptCount: 0,
      retryPolicy: defaultRetry,
      recoveryPolicy: defaultRecovery,
      successCriteria: opts.successCriteria ?? [],
      failureCriteria: opts.failureCriteria ?? [],
      createdAt: Date.now(),
      metadata: opts.metadata,
    };

    this._tasks.set(taskId, task);

    if (!this._goalTasks.has(opts.goalId)) {
      this._goalTasks.set(opts.goalId, new Set());
    }
    this._goalTasks.get(opts.goalId)!.add(taskId);

    globalExecutiveAudit.record('TASK_CREATED', taskId, {
      taskId,
      goalId: task.goalId,
      title: task.title,
      taskType: task.taskType,
      riskLevel: task.riskLevel,
    });

    return task;
  }

  /** Rehydrates a previously validated durable task without changing its identity. */
  public restoreTask(task: ExecutiveTask): ExecutiveTask {
    if (this._tasks.has(task.taskId)) {
      throw new Error(`[TASK_RESTORE_CONFLICT] Task '${task.taskId}' already exists`);
    }
    if (!task.taskId || !task.goalId || !task.traceId) {
      throw new Error('[TASK_RESTORE_INVALID] Durable task is missing required identity fields');
    }
    this._tasks.set(task.taskId, task);
    if (!this._goalTasks.has(task.goalId)) this._goalTasks.set(task.goalId, new Set());
    this._goalTasks.get(task.goalId)!.add(task.taskId);
    return task;
  }

  public getTask(taskId: TaskId): ExecutiveTask | undefined {
    return this._tasks.get(taskId);
  }

  public getTasksByGoal(goalId: GoalId): ExecutiveTask[] {
    const ids = this._goalTasks.get(goalId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this._tasks.get(id))
      .filter((t): t is ExecutiveTask => t !== undefined);
  }

  public getTasksForGoal(goalId: GoalId): ExecutiveTask[] {
    return this.getTasksByGoal(goalId);
  }

  public updateTaskStatus(
    taskId: TaskId,
    nextStatus: TaskStatus,
    context?: string | ExecutiveTaskResult
  ): ExecutiveTask {
    const task = this._tasks.get(taskId);
    if (!task) {
      throw new Error(`[TASK_NOT_FOUND] Task '${taskId}' not found`);
    }

    const contextStr = typeof context === 'string' ? context : undefined;
    if (task.status !== 'PENDING' || nextStatus !== 'COMPLETED') {
      assertValidTaskTransition(task.status, nextStatus, contextStr);
    }
    task.status = nextStatus;

    if (typeof context === 'object' && context !== null) {
      task.result = context as ExecutiveTaskResult;
    }

    if (nextStatus === 'RUNNING' && !task.startedAt) {
      task.startedAt = Date.now();
      task.attemptCount += 1;
    } else if (nextStatus === 'COMPLETED' || nextStatus === 'FAILED' || nextStatus === 'CANCELLED') {
      task.completedAt = Date.now();
    }

    globalExecutiveAudit.record('TASK_STATUS_UPDATED', taskId, {
      taskId,
      goalId: task.goalId,
      status: nextStatus,
    });

    return task;
  }

  public setTaskResult(taskId: TaskId, result: ExecutiveTaskResult): void {
    const task = this._tasks.get(taskId);
    if (!task) {
      throw new Error(`[TASK_NOT_FOUND] Task '${taskId}' not found`);
    }
    task.result = result;
  }

  public setTaskError(taskId: TaskId, error: string): void {
    const task = this._tasks.get(taskId);
    if (!task) {
      throw new Error(`[TASK_NOT_FOUND] Task '${taskId}' not found`);
    }
    task.error = error;
  }

  public getAllTasks(): ExecutiveTask[] {
    return Array.from(this._tasks.values());
  }

  public upsertTask(task: ExecutiveTask): ExecutiveTask {
    this._tasks.set(task.taskId, task);
    if (!this._goalTasks.has(task.goalId)) {
      this._goalTasks.set(task.goalId, new Set());
    }
    this._goalTasks.get(task.goalId)!.add(task.taskId);
    return task;
  }

  public clear(): void {
    this._tasks.clear();
    this._goalTasks.clear();
  }
}

export const globalExecutiveTaskManager = new ExecutiveTaskManager();
