// src/core/executive/executiveCancellation.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Cooperative Cancellation & Control Plane.
// Implements absolute precedence for USER_STOP, USER_CANCEL, and USER_PAUSE.

import type { GoalId } from './executiveTypes.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';

export interface CancellationToken {
  readonly isCancelled: boolean;
  readonly reason?: string;
  readonly origin: 'USER_STOP' | 'USER_CANCEL' | 'USER_PAUSE' | 'NONE';
}

export class ExecutiveCancellationManager {
  private _userStopActive: boolean = false;
  private _userStopReason?: string;
  private _safeStopActive: boolean = false;
  private _safeStopReason?: string;
  private _cancelledGoals = new Map<GoalId, string>();
  private _pausedGoals = new Map<GoalId, string>();

  public get isUserStopActive(): boolean {
    return this._userStopActive;
  }

  public get isSafeStopActive(): boolean {
    return this._safeStopActive;
  }

  public get userStopReason(): string | undefined {
    return this._userStopReason;
  }

  public get safeStopReason(): string | undefined {
    return this._safeStopReason;
  }

  public triggerSafeStop(reason: string = 'Safe stop requested'): void {
    this._safeStopActive = true;
    this._safeStopReason = reason;
  }

  public resetSafeStop(): void {
    this._safeStopActive = false;
    this._safeStopReason = undefined;
  }

  /**
   * Triggers global USER_STOP with unconditional supremacy.
   */
  public triggerUserStop(reason: string = 'Operator emergency stop'): void {
    this._userStopActive = true;
    this._userStopReason = reason;
  }

  public activateUserStop(reason: string = 'Operator emergency stop'): void {
    this.triggerUserStop(reason);
  }

  /**
   * Resets USER_STOP (only via explicit human operator action).
   */
  public resetUserStop(_operatorToken?: string): void {
    this._userStopActive = false;
    this._userStopReason = undefined;
  }

  /**
   * Cancels a specific goal and cascades cancellation to all incomplete subtasks.
   */
  public cancelGoal(goalId: GoalId, reason: string = 'Cancelled by operator'): number {
    this._cancelledGoals.set(goalId, reason);
    let cancelledTaskCount = 0;
    const tasks = globalExecutiveTaskManager.getTasksByGoal(goalId);
    for (const t of tasks) {
      if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
        globalExecutiveTaskManager.updateTaskStatus(t.taskId, 'CANCELLED', reason);
        cancelledTaskCount++;
      }
    }
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (goal && goal.status !== 'COMPLETED' && goal.status !== 'CANCELLED') {
      globalExecutiveGoalManager.updateGoalStatus(goalId, 'CANCELLED', reason);
    }
    return cancelledTaskCount;
  }

  public isGoalCancelled(goalId: GoalId): boolean {
    if (this._userStopActive) return true;
    return this._cancelledGoals.has(goalId);
  }

  /**
   * Pauses a specific goal.
   */
  public pauseGoal(goalId: GoalId, reason: string = 'Paused by operator'): void {
    this._pausedGoals.set(goalId, reason);
  }

  public resumeGoal(goalId: GoalId): void {
    this._pausedGoals.delete(goalId);
  }

  public isGoalPaused(goalId: GoalId): boolean {
    return this._pausedGoals.has(goalId);
  }

  /**
   * Checks cancellation status for a goal.
   */
  public checkCancellation(goalId: GoalId): CancellationToken {
    if (this._userStopActive) {
      return {
        isCancelled: true,
        reason: this._userStopReason ?? 'USER_STOP active',
        origin: 'USER_STOP',
      };
    }
    if (this._cancelledGoals.has(goalId)) {
      return {
        isCancelled: true,
        reason: this._cancelledGoals.get(goalId),
        origin: 'USER_CANCEL',
      };
    }
    if (this._pausedGoals.has(goalId)) {
      return {
        isCancelled: true,
        reason: this._pausedGoals.get(goalId),
        origin: 'USER_PAUSE',
      };
    }
    return {
      isCancelled: false,
      origin: 'NONE',
    };
  }

  public clear(): void {
    this._userStopActive = false;
    this._userStopReason = undefined;
    this._cancelledGoals.clear();
    this._pausedGoals.clear();
  }
}

export const globalExecutiveCancellation = new ExecutiveCancellationManager();
