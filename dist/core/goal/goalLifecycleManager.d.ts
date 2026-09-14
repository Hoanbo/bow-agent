import { type GovernedGoal, type GoalStatus } from './goalTypes.js';
export declare const LEGAL_GOAL_TRANSITIONS: Readonly<Record<GoalStatus, readonly GoalStatus[]>>;
export declare class GoalLifecycleManager {
    private readonly userStopProvider;
    constructor(userStopProvider?: () => boolean);
    /**
     * Transitions a GovernedGoal to a new lifecycle status.
     * Enforces transition legality, completion evidence, USER_STOP preemption,
     * version increments, and provenance hash chaining.
     */
    transitionGoal(goal: GovernedGoal, nextStatus: GoalStatus, options?: {
        readonly reason?: string;
        readonly verificationEvidence?: readonly string[];
        readonly activeTaskRefs?: readonly string[];
    }): GovernedGoal;
}
export declare const globalGoalLifecycleManager: GoalLifecycleManager;
