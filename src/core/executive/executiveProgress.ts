// src/core/executive/executiveProgress.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Authoritative Progress Engine.
// Evaluates goal progress strictly from underlying task ledger states.
// Invariant: LLM claims cannot fabricate progress; progress is mathematically derived.

import type { ExecutiveGoal, ExecutiveTask, GoalProgress, GoalId } from './executiveTypes.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';

export class ExecutiveProgressEngine {
  /**
   * Calculates progress directly from a goal ID by querying registered goal and tasks.
   */
  public calculateProgress(goalId: GoalId): GoalProgress {
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) {
      throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found for progress calculation`);
    }
    const tasks = globalExecutiveTaskManager.getTasksByGoal(goalId);
    return this.computeProgress(goal, tasks);
  }

  /**
   * Computes authoritative progress for a goal given its associated tasks.
   */
  public computeProgress(goal: ExecutiveGoal, tasks: ExecutiveTask[]): GoalProgress {
    const totalTasks = tasks.length;
    let completedTasks = 0;
    let failedTasks = 0;
    let blockedTasks = 0;
    let pendingTasks = 0;

    for (const task of tasks) {
      if (task.status === 'COMPLETED') {
        completedTasks++;
      } else if (task.status === 'FAILED') {
        failedTasks++;
      } else if (task.status === 'BLOCKED') {
        blockedTasks++;
      } else if (task.status === 'PENDING' || task.status === 'READY') {
        pendingTasks++;
      }
    }

    const percentComplete = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const isComplete = totalTasks > 0 && completedTasks === totalTasks;

    const progress: GoalProgress = {
      goalId: goal.goalId,
      totalTasks,
      completedTasks,
      failedTasks,
      blockedTasks,
      pendingTasks,
      percentComplete,
      isComplete,
      lastUpdated: Date.now(),
    };

    goal.progress = progress;
    return progress;
  }

  /**
   * Evaluates if a goal satisfies its success criteria.
   * Invariant: TASK_COMPLETION != GOAL_COMPLETION. Success criteria must be strictly evaluated.
   */
  public evaluateGoalSuccess(goal: ExecutiveGoal, tasks: ExecutiveTask[]): boolean {
    if (tasks.length === 0) return false;

    if (goal.successCriteria.requiredTasksCompleted) {
      const allCompleted = tasks.every((t) => t.status === 'COMPLETED');
      if (!allCompleted) return false;
    }

    // Every completed task must have been independently verified
    const allVerified = tasks.every((t) => t.result?.verified === true);
    if (!allVerified) return false;

    return true;
  }

  /**
   * Validates cognitive progress claims against ground truth.
   * Rejects if claimed progress deviates from actual mathematical progress by > 1%.
   */
  public validateClaimedProgress(goal: ExecutiveGoal, claimedPercent: number): boolean {
    const actualPercent = goal.progress.percentComplete;
    return Math.abs(claimedPercent - actualPercent) <= 1;
  }
}

export const globalExecutiveProgress = new ExecutiveProgressEngine();
