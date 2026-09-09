import type { GoalId } from './executiveTypes.js';
export interface CancellationToken {
    readonly isCancelled: boolean;
    readonly reason?: string;
    readonly origin: 'USER_STOP' | 'USER_CANCEL' | 'USER_PAUSE' | 'NONE';
}
export declare class ExecutiveCancellationManager {
    private _userStopActive;
    private _userStopReason?;
    private _safeStopActive;
    private _safeStopReason?;
    private _cancelledGoals;
    private _pausedGoals;
    get isUserStopActive(): boolean;
    get isSafeStopActive(): boolean;
    get userStopReason(): string | undefined;
    get safeStopReason(): string | undefined;
    triggerSafeStop(reason?: string): void;
    resetSafeStop(): void;
    /**
     * Triggers global USER_STOP with unconditional supremacy.
     */
    triggerUserStop(reason?: string): void;
    activateUserStop(reason?: string): void;
    /**
     * Resets USER_STOP (only via explicit human operator action).
     */
    resetUserStop(_operatorToken?: string): void;
    /**
     * Cancels a specific goal and cascades cancellation to all incomplete subtasks.
     */
    cancelGoal(goalId: GoalId, reason?: string): number;
    isGoalCancelled(goalId: GoalId): boolean;
    /**
     * Pauses a specific goal.
     */
    pauseGoal(goalId: GoalId, reason?: string): void;
    resumeGoal(goalId: GoalId): void;
    isGoalPaused(goalId: GoalId): boolean;
    /**
     * Checks cancellation status for a goal.
     */
    checkCancellation(goalId: GoalId): CancellationToken;
    clear(): void;
}
export declare const globalExecutiveCancellation: ExecutiveCancellationManager;
