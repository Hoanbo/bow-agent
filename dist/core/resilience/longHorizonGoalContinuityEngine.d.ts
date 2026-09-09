import { LongHorizonGoalRecord, OwnerIntentSemantic } from './cognitiveResilienceTypes.js';
export declare function computeGoalContinuityHash(goals: LongHorizonGoalRecord[]): string;
export declare class LongHorizonGoalContinuityEngine {
    private readonly _goals;
    private readonly _storagePath?;
    private readonly _stallThresholdMs;
    constructor(options?: {
        storageDir?: string;
        stallThresholdMs?: number;
    });
    /**
     * Registers a new long-horizon goal.
     */
    registerGoal(params: {
        goalId?: string;
        sessionId?: string;
        projectId: string;
        title: string;
        objective: string;
        capabilityDependencies?: string[];
        initialProgress?: number;
    }): LongHorizonGoalRecord;
    /**
     * Updates goal progress with verifiable metrics.
     * Resets stalled duration upon verified progress.
     */
    recordProgress(goalId: string, progressPercent: number, outcomeDetails?: string): LongHorizonGoalRecord;
    /**
     * Evaluates stall status based on elapsed time since last meaningful progress.
     * INVARIANT: Inactivity != Abandonment. State transitions to STALLED or AT_RISK, never ABANDONED.
     */
    evaluateStallStatus(goalId: string, currentTime?: number): LongHorizonGoalRecord;
    /**
     * Records an interruption (e.g. host shutdown, process restart, or cycle interruption).
     */
    recordInterruption(goalId: string, reason: string): LongHorizonGoalRecord;
    /**
     * Resumes an interrupted goal.
     */
    resumeInterruptedGoal(goalId: string): LongHorizonGoalRecord;
    /**
     * Associates an episodic memory ID with the goal.
     */
    linkEpisode(goalId: string, episodeId: string): void;
    /**
     * Updates capability feasibility for the goal.
     */
    updateFeasibility(goalId: string, feasibility: 'FEASIBLE' | 'FEASIBLE_WITH_CAUTION' | 'PLAN_BLOCKED' | 'UNKNOWN', missingGap?: string): LongHorizonGoalRecord;
    /**
     * MASTER OWNER INTENT AFFIRMATION:
     * Only the Master Owner authority can definitively establish owner-semantic states:
     * ABANDONED, REPRIORITIZED, COMPLETED_BY_EXTERNAL_ACTION.
     * INVARIANT: Throws if caller is not Master Owner.
     */
    setOwnerIntentSemantic(params: {
        goalId: string;
        operatorId: string;
        semantic: OwnerIntentSemantic;
        rationale: string;
    }): LongHorizonGoalRecord;
    getGoal(goalId: string): LongHorizonGoalRecord | undefined;
    getAllGoals(): LongHorizonGoalRecord[];
    getActiveGoals(): LongHorizonGoalRecord[];
    clear(): void;
    private _getGoal;
    private _persist;
    private _rehydrate;
}
export declare const globalLongHorizonGoalContinuityEngine: LongHorizonGoalContinuityEngine;
