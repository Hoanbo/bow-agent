// src/core/executive/executiveGoal.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Canonical Goal Manager with Multi-Session Isolation.
import crypto from 'node:crypto';
import { assertValidGoalTransition } from './executiveTransitions.js';
import { globalExecutiveAudit } from './executiveAudit.js';
export class ExecutiveGoalManager {
    _goals = new Map();
    // sessionId -> Set<GoalId>
    _sessionGoals = new Map();
    createGoal(opts) {
        const objective = (opts.objective || opts.title || opts.description || '').trim();
        if (objective.length === 0) {
            throw new Error('[GOAL_INVALID_OBJECTIVE] Goal objective cannot be empty');
        }
        const sessionId = (opts.sessionId || 'session_default');
        const goalId = `goal_${crypto.randomBytes(6).toString('hex')}`;
        const traceId = opts.traceId ?? `tr_goal_${crypto.randomBytes(8).toString('hex')}`;
        const now = Date.now();
        const initialProgress = {
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
        const goal = {
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
        this._sessionGoals.get(sessionId).add(goalId);
        globalExecutiveAudit.record('GOAL_CREATED', goalId, {
            goalId,
            sessionId,
            title: goal.title,
            priority: goal.priority,
        });
        return goal;
    }
    /** Rehydrates a previously validated durable goal without changing its identity. */
    restoreGoal(goal) {
        if (this._goals.has(goal.goalId)) {
            throw new Error(`[GOAL_RESTORE_CONFLICT] Goal '${goal.goalId}' already exists`);
        }
        if (!goal.goalId || !goal.sessionId || !goal.objective) {
            throw new Error('[GOAL_RESTORE_INVALID] Durable goal is missing required identity fields');
        }
        this._goals.set(goal.goalId, goal);
        if (!this._sessionGoals.has(goal.sessionId))
            this._sessionGoals.set(goal.sessionId, new Set());
        this._sessionGoals.get(goal.sessionId).add(goal.goalId);
        return goal;
    }
    getGoal(goalId, sessionId) {
        const goal = this._goals.get(goalId);
        if (!goal)
            return undefined;
        // Multi-session isolation check
        if (sessionId && goal.sessionId !== sessionId) {
            throw new Error(`[SESSION_ISOLATION_VIOLATION] Session '${sessionId}' cannot access goal '${goalId}' belonging to session '${goal.sessionId}'`);
        }
        return goal;
    }
    getGoalsBySession(sessionId) {
        const ids = this._sessionGoals.get(sessionId);
        if (!ids)
            return [];
        return Array.from(ids)
            .map((id) => this._goals.get(id))
            .filter((g) => g !== undefined);
    }
    updateGoalStatus(goalId, nextStatus, context) {
        const goal = this._goals.get(goalId);
        if (!goal) {
            throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
        }
        assertValidGoalTransition(goal.status, nextStatus, context);
        goal.status = nextStatus;
        goal.updatedAt = Date.now();
        return goal;
    }
    setCurrentTaskId(goalId, taskId) {
        const goal = this._goals.get(goalId);
        if (!goal) {
            throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
        }
        goal.currentTaskId = taskId;
        goal.updatedAt = Date.now();
    }
    updateGoalProgress(goalId, progress) {
        const goal = this._goals.get(goalId);
        if (!goal) {
            throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
        }
        goal.progress = progress;
        goal.updatedAt = Date.now();
    }
    getAllGoals() {
        return Array.from(this._goals.values());
    }
    upsertGoal(goal) {
        this._goals.set(goal.goalId, goal);
        if (!this._sessionGoals.has(goal.sessionId)) {
            this._sessionGoals.set(goal.sessionId, new Set());
        }
        this._sessionGoals.get(goal.sessionId).add(goal.goalId);
        return goal;
    }
    clear() {
        this._goals.clear();
        this._sessionGoals.clear();
    }
}
export const globalExecutiveGoalManager = new ExecutiveGoalManager();
