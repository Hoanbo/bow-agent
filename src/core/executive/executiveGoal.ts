// src/core/executive/executiveGoal.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Canonical Goal Manager with Multi-Session Isolation.

import crypto from 'node:crypto';
import type {
  GoalId,
  TraceId,
  SessionId,
  TaskPriority,
  GoalStatus,
  ExecutiveGoal,
  ExecutiveGoalSuccessCriteria,
  ExecutiveGoalFailureCriteria,
  GoalProgress,
  TaskId,
} from './executiveTypes.js';
import { assertValidGoalTransition } from './executiveTransitions.js';
import { globalExecutiveAudit } from './executiveAudit.js';

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

export class ExecutiveGoalManager {
  private _goals = new Map<GoalId, ExecutiveGoal>();
  // sessionId -> Set<GoalId>
  private _sessionGoals = new Map<SessionId, Set<GoalId>>();

  public createGoal(opts: CreateGoalOptions): ExecutiveGoal {
    const objective = (opts.objective || opts.title || opts.description || '').trim();
    if (objective.length === 0) {
      throw new Error('[GOAL_INVALID_OBJECTIVE] Goal objective cannot be empty');
    }
    const sessionId = (opts.sessionId || 'session_default') as SessionId;

    const goalId: GoalId = `goal_${crypto.randomBytes(6).toString('hex')}`;
    const traceId: TraceId = opts.traceId ?? `tr_goal_${crypto.randomBytes(8).toString('hex')}`;
    const now = Date.now();

    const initialProgress: GoalProgress = {
      goalId,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      blockedTasks: 0,
      pendingTasks: 0,
      percentComplete: 0,
      isComplete: false,
      lastUpdated: now,
    };

    const goal: ExecutiveGoal = {
      goalId,
      traceId,
      sessionId,
      createdAt: now,
      updatedAt: now,
      title: opts.title ?? objective,
      objective,
      description: opts.description ?? objective,
      intent: opts.intent,
      priority: opts.priority ?? 'NORMAL',
      status: opts.status ?? (opts.title ? 'SUBMITTED' : 'CREATED'),
      origin: opts.origin ?? 'USER',
      constraints: opts.constraints ?? [],
      successCriteria: {
        description: opts.successCriteria?.description ?? 'All tasks completed successfully',
        requiredTasksCompleted: opts.successCriteria?.requiredTasksCompleted ?? true,
        customValidationKey: opts.successCriteria?.customValidationKey,
      },
      failureCriteria: {
        description: opts.failureCriteria?.description ?? 'Task execution failed beyond retry limit',
        maxFailedTasks: opts.failureCriteria?.maxFailedTasks ?? 1,
        timeoutMs: opts.failureCriteria?.timeoutMs,
      },
      authorizationPolicy: opts.authorizationPolicy ?? 'DEFAULT',
      deadline: opts.deadline,
      progress: initialProgress,
      metadata: opts.metadata,
    };

    this._goals.set(goalId, goal);

    if (!this._sessionGoals.has(sessionId)) {
      this._sessionGoals.set(sessionId, new Set());
    }
    this._sessionGoals.get(sessionId)!.add(goalId);

    globalExecutiveAudit.record('GOAL_CREATED', goalId, {
      goalId,
      sessionId,
      title: goal.title,
      priority: goal.priority,
    });

    return goal;
  }

  /** Rehydrates a previously validated durable goal without changing its identity. */
  public restoreGoal(goal: ExecutiveGoal): ExecutiveGoal {
    if (this._goals.has(goal.goalId)) {
      throw new Error(`[GOAL_RESTORE_CONFLICT] Goal '${goal.goalId}' already exists`);
    }
    if (!goal.goalId || !goal.sessionId || !goal.objective) {
      throw new Error('[GOAL_RESTORE_INVALID] Durable goal is missing required identity fields');
    }
    this._goals.set(goal.goalId, goal);
    if (!this._sessionGoals.has(goal.sessionId)) this._sessionGoals.set(goal.sessionId, new Set());
    this._sessionGoals.get(goal.sessionId)!.add(goal.goalId);
    return goal;
  }

  public getGoal(goalId: GoalId, sessionId?: SessionId): ExecutiveGoal | undefined {
    const goal = this._goals.get(goalId);
    if (!goal) return undefined;

    // Multi-session isolation check
    if (sessionId && goal.sessionId !== sessionId) {
      throw new Error(
        `[SESSION_ISOLATION_VIOLATION] Session '${sessionId}' cannot access goal '${goalId}' belonging to session '${goal.sessionId}'`
      );
    }

    return goal;
  }

  public getGoalsBySession(sessionId: SessionId): ExecutiveGoal[] {
    const ids = this._sessionGoals.get(sessionId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this._goals.get(id))
      .filter((g): g is ExecutiveGoal => g !== undefined);
  }

  public updateGoalStatus(goalId: GoalId, nextStatus: GoalStatus, context?: string): ExecutiveGoal {
    const goal = this._goals.get(goalId);
    if (!goal) {
      throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
    }

    assertValidGoalTransition(goal.status, nextStatus, context);
    goal.status = nextStatus;
    goal.updatedAt = Date.now();

    return goal;
  }

  public setCurrentTaskId(goalId: GoalId, taskId?: TaskId): void {
    const goal = this._goals.get(goalId);
    if (!goal) {
      throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
    }
    goal.currentTaskId = taskId;
    goal.updatedAt = Date.now();
  }

  public updateGoalProgress(goalId: GoalId, progress: GoalProgress): void {
    const goal = this._goals.get(goalId);
    if (!goal) {
      throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
    }
    goal.progress = progress;
    goal.updatedAt = Date.now();
  }

  public getAllGoals(): ExecutiveGoal[] {
    return Array.from(this._goals.values());
  }

  public upsertGoal(goal: ExecutiveGoal): ExecutiveGoal {
    this._goals.set(goal.goalId, goal);
    if (!this._sessionGoals.has(goal.sessionId)) {
      this._sessionGoals.set(goal.sessionId, new Set());
    }
    this._sessionGoals.get(goal.sessionId)!.add(goal.goalId);
    return goal;
  }

  public clear(): void {
    this._goals.clear();
    this._sessionGoals.clear();
  }
}

export const globalExecutiveGoalManager = new ExecutiveGoalManager();
