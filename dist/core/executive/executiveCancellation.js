// src/core/executive/executiveCancellation.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Cooperative Cancellation & Control Plane.
// Implements absolute precedence for USER_STOP, USER_CANCEL, and USER_PAUSE.
import { globalExecutiveTaskManager } from './executiveTask.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
export class ExecutiveCancellationManager {
    _userStopActive = false;
    _userStopReason;
    _safeStopActive = false;
    _safeStopReason;
    _cancelledGoals = new Map();
    _pausedGoals = new Map();
    get isUserStopActive() {
        return this._userStopActive;
    }
    get isSafeStopActive() {
        return this._safeStopActive;
    }
    get userStopReason() {
        return this._userStopReason;
    }
    get safeStopReason() {
        return this._safeStopReason;
    }
    triggerSafeStop(reason = 'Safe stop requested') {
        this._safeStopActive = true;
        this._safeStopReason = reason;
    }
    resetSafeStop() {
        this._safeStopActive = false;
        this._safeStopReason = undefined;
    }
    /**
     * Triggers global USER_STOP with unconditional supremacy.
     */
    triggerUserStop(reason = 'Operator emergency stop') {
        this._userStopActive = true;
        this._userStopReason = reason;
    }
    activateUserStop(reason = 'Operator emergency stop') {
        this.triggerUserStop(reason);
    }
    /**
     * Resets USER_STOP (only via explicit human operator action).
     */
    resetUserStop(_operatorToken) {
        this._userStopActive = false;
        this._userStopReason = undefined;
    }
    /**
     * Cancels a specific goal and cascades cancellation to all incomplete subtasks.
     */
    cancelGoal(goalId, reason = 'Cancelled by operator') {
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
    isGoalCancelled(goalId) {
        if (this._userStopActive)
            return true;
        return this._cancelledGoals.has(goalId);
    }
    /**
     * Pauses a specific goal.
     */
    pauseGoal(goalId, reason = 'Paused by operator') {
        this._pausedGoals.set(goalId, reason);
    }
    resumeGoal(goalId) {
        this._pausedGoals.delete(goalId);
    }
    isGoalPaused(goalId) {
        return this._pausedGoals.has(goalId);
    }
    /**
     * Checks cancellation status for a goal.
     */
    checkCancellation(goalId) {
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
    clear() {
        this._userStopActive = false;
        this._userStopReason = undefined;
        this._cancelledGoals.clear();
        this._pausedGoals.clear();
    }
}
export const globalExecutiveCancellation = new ExecutiveCancellationManager();
