// src/core/goal/goalPriorityEngine.ts
// BOWCON V4.0 — MS-1.5.04: GOAL PRIORITY ENGINE (PURE MATHEMATICS)
// Component 1011 — REAL
//
// Invariants:
// PRIORITY != AUTHORIZATION
// MATHEMATICAL_PRECISION == TRUE
// DETERMINISTIC_TIE_BREAKING == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import {
  type GoalPriorityVector,
  type GoalPriorityWeights,
  type GovernedGoal,
  CANONICAL_PRIORITY_WEIGHTS,
} from './goalTypes.js';

export class GoalPriorityEngine {
  private readonly weights: GoalPriorityWeights;

  constructor(customWeights?: Partial<GoalPriorityWeights>) {
    this.weights = Object.freeze({
      wi: customWeights?.wi ?? CANONICAL_PRIORITY_WEIGHTS.wi,
      wu: customWeights?.wu ?? CANONICAL_PRIORITY_WEIGHTS.wu,
      we: customWeights?.we ?? CANONICAL_PRIORITY_WEIGHTS.we,
      wr: customWeights?.wr ?? CANONICAL_PRIORITY_WEIGHTS.wr,
      wd: customWeights?.wd ?? CANONICAL_PRIORITY_WEIGHTS.wd,
      wb: customWeights?.wb ?? CANONICAL_PRIORITY_WEIGHTS.wb,
    });
  }

  /**
   * Computes a deterministic priority score bounded within [0.0, 1.0] from a GoalPriorityVector.
   *
   * Formula:
   * P_goal = clamp(wi*I + wu*U + we*E + wr*R + wd*D + wb*B, 0.0, 1.0)
   */
  public calculateScore(vector: GoalPriorityVector): number {
    const raw =
      this.weights.wi * vector.importance +
      this.weights.wu * vector.urgency +
      this.weights.we * vector.userEmphasis +
      this.weights.wr * vector.risk +
      this.weights.wd * vector.dependencyPressure +
      this.weights.wb * vector.blockingImpact;

    if (!Number.isFinite(raw)) {
      return 0.0;
    }

    const clamped = Math.max(0.0, Math.min(1.0, raw));
    return Math.round(clamped * 10000) / 10000;
  }

  /**
   * Deterministically orders goals by scheduling priority.
   *
   * Tie-breaking order:
   * 1. priorityScore descending (higher score first)
   * 2. userEmphasis descending (higher user emphasis first)
   * 3. createdAt ascending (earlier creation first - FIFO fairness)
   * 4. goalId ascending (lexicographical stability)
   */
  public compareGoals(a: GovernedGoal, b: GovernedGoal): number {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    if (b.priorityVector.userEmphasis !== a.priorityVector.userEmphasis) {
      return b.priorityVector.userEmphasis - a.priorityVector.userEmphasis;
    }

    if (a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }

    return a.goalId.localeCompare(b.goalId);
  }

  /**
   * Sorts an array of goals according to deterministic priority rules.
   */
  public sortGoals(goals: readonly GovernedGoal[]): readonly GovernedGoal[] {
    return Object.freeze([...goals].sort((a, b) => this.compareGoals(a, b)));
  }
}

export const globalGoalPriorityEngine = new GoalPriorityEngine();
