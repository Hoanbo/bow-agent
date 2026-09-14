import { type GoalPriorityVector, type GoalPriorityWeights, type GovernedGoal } from './goalTypes.js';
export declare class GoalPriorityEngine {
    private readonly weights;
    constructor(customWeights?: Partial<GoalPriorityWeights>);
    /**
     * Computes a deterministic priority score bounded within [0.0, 1.0] from a GoalPriorityVector.
     *
     * Formula:
     * P_goal = clamp(wi*I + wu*U + we*E + wr*R + wd*D + wb*B, 0.0, 1.0)
     */
    calculateScore(vector: GoalPriorityVector): number;
    /**
     * Deterministically orders goals by scheduling priority.
     *
     * Tie-breaking order:
     * 1. priorityScore descending (higher score first)
     * 2. userEmphasis descending (higher user emphasis first)
     * 3. createdAt ascending (earlier creation first - FIFO fairness)
     * 4. goalId ascending (lexicographical stability)
     */
    compareGoals(a: GovernedGoal, b: GovernedGoal): number;
    /**
     * Sorts an array of goals according to deterministic priority rules.
     */
    sortGoals(goals: readonly GovernedGoal[]): readonly GovernedGoal[];
}
export declare const globalGoalPriorityEngine: GoalPriorityEngine;
