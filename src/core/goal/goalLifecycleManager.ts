// src/core/goal/goalLifecycleManager.ts
// BOWCON V4.0 — MS-1.5.04: GOAL LIFECYCLE MANAGER
// Component 1014 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_ILLEGAL_TRANSITION == TRUE
// EMPIRICAL_COMPLETION_VERIFICATION == TRUE
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import {
  type GovernedGoal,
  type GoalStatus,
  GoalTransitionError,
  GoalValidationError,
  GoalUserStopError,
  computeGoalHash,
} from './goalTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export const LEGAL_GOAL_TRANSITIONS: Readonly<Record<GoalStatus, readonly GoalStatus[]>> = Object.freeze({
  PROPOSED: Object.freeze(['VALIDATING', 'REJECTED'] as GoalStatus[]),
  VALIDATING: Object.freeze(['APPROVED', 'REJECTED'] as GoalStatus[]),
  APPROVED: Object.freeze(['ACTIVE', 'ABANDONED'] as GoalStatus[]),
  ACTIVE: Object.freeze(['BLOCKED', 'PAUSED', 'COMPLETED', 'ABANDONED'] as GoalStatus[]),
  BLOCKED: Object.freeze(['ACTIVE', 'ABANDONED'] as GoalStatus[]),
  PAUSED: Object.freeze(['ACTIVE', 'ABANDONED'] as GoalStatus[]),
  COMPLETED: Object.freeze([] as GoalStatus[]), // Terminal
  ABANDONED: Object.freeze([] as GoalStatus[]), // Terminal
  REJECTED: Object.freeze([] as GoalStatus[]),  // Terminal
});

export class GoalLifecycleManager {
  private readonly userStopProvider: () => boolean;

  constructor(userStopProvider?: () => boolean) {
    this.userStopProvider =
      userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Transitions a GovernedGoal to a new lifecycle status.
   * Enforces transition legality, completion evidence, USER_STOP preemption,
   * version increments, and provenance hash chaining.
   */
  public transitionGoal(
    goal: GovernedGoal,
    nextStatus: GoalStatus,
    options?: {
      readonly reason?: string;
      readonly verificationEvidence?: readonly string[];
      readonly activeTaskRefs?: readonly string[];
    }
  ): GovernedGoal {
    // 1. Synchronous USER_STOP check
    if (this.userStopProvider()) {
      throw new GoalUserStopError('transition_goal');
    }

    // 2. Legality check
    const allowed = LEGAL_GOAL_TRANSITIONS[goal.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new GoalTransitionError(goal.status, nextStatus, options?.reason);
    }

    // 3. Completion invariant: SEMANTIC SIMILARITY != FACTUAL TRUTH
    // Transition to COMPLETED strictly requires empirical verification evidence
    if (nextStatus === 'COMPLETED') {
      const evidence = options?.verificationEvidence ?? (options as any)?.completionEvidence;
      if (!evidence || !Array.isArray(evidence) || evidence.length === 0) {
        throw new GoalValidationError(
          'Goal completion strictly requires empirical verification evidence',
          ['MISSING_COMPLETION_EVIDENCE']
        );
      }
    }

    const updatedAt = new Date().toISOString();
    const version = goal.version + 1;

    const updatedDraft = {
      goalId: goal.goalId,
      parentGoalId: goal.parentGoalId,
      tenantId: goal.tenantId,
      sessionId: goal.sessionId,
      origin: goal.origin,
      sourceIntent: goal.sourceIntent,
      title: goal.title,
      description: goal.description,
      successCriteria: goal.successCriteria,
      failureCriteria: goal.failureCriteria,
      constraints: goal.constraints,
      priorityScore: goal.priorityScore,
      priorityVector: goal.priorityVector,
      status: nextStatus,
      statusReason: options?.reason,
      activeTaskRefs: options?.activeTaskRefs
        ? Object.freeze([...options.activeTaskRefs])
        : goal.activeTaskRefs,
      version,
      createdAt: goal.createdAt,
      updatedAt,
    };

    const provenanceHash = computeGoalHash(updatedDraft, goal.provenanceHash);

    return Object.freeze({
      ...updatedDraft,
      provenanceHash,
    });
  }
}

export const globalGoalLifecycleManager = new GoalLifecycleManager();
