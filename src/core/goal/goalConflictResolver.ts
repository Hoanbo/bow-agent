// src/core/goal/goalConflictResolver.ts
// BOWCON V4.0 — MS-1.5.04: GOAL CONFLICT RESOLVER
// Component 1013 — REAL
//
// Invariants:
// CONFLICT_RESOLUTION_HIERARCHY == TRUE
// USER_STOP > ALL_MUTATION
// ZERO_SELF_AUTHORIZATION == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import crypto from 'node:crypto';
import {
  type GovernedGoal,
  type GoalConflictDescriptor,
  GoalUserStopError,
} from './goalTypes.js';
import { PriorityGraphEngine } from './priorityGraphEngine.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export class GoalConflictResolver {
  private readonly userStopProvider: () => boolean;

  constructor(userStopProvider?: () => boolean) {
    this.userStopProvider =
      userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Detects conflicts across all goals in a PriorityGraphEngine.
   */
  public detectConflicts(graph: PriorityGraphEngine): readonly GoalConflictDescriptor[] {
    const goals = graph.listGoals();
    const conflicts: GoalConflictDescriptor[] = [];

    for (let i = 0; i < goals.length; i++) {
      for (let j = i + 1; j < goals.length; j++) {
        const a = goals[i];
        const b = goals[j];

        // 1. Check resource exclusion conflicts
        const resourceConflict = this.checkResourceConflict(a, b);
        if (resourceConflict) {
          conflicts.push(resourceConflict);
          continue;
        }

        // 2. Check constraint / policy contradictions
        const policyConflict = this.checkPolicyConflict(a, b);
        if (policyConflict) {
          conflicts.push(policyConflict);
        }
      }
    }

    return Object.freeze(conflicts);
  }

  /**
   * Deterministically resolves a detected conflict.
   * Accepts either (conflict, graph) or (goalA, goalB).
   *
   * Hierarchy:
   * 1. USER_DIRECTIVE (Master Human) beats autonomous origin. Lower transitions to BLOCKED.
   * 2. Higher priority score beats lower priority score. Lower transitions to BLOCKED.
   * 3. Equal priority and authority -> both transition to BLOCKED for human escalation.
   */
  public resolveConflict(
    conflictOrGoalA: GoalConflictDescriptor | GovernedGoal,
    graphOrGoalB: PriorityGraphEngine | GovernedGoal
  ): {
    readonly winnerGoalId: string | null;
    readonly loserGoalId: string | null;
    readonly winningGoalId: string | null;
    readonly blockedGoalIds: readonly string[];
    readonly requiresHumanEscalation: boolean;
    readonly strategy: string;
    readonly rationale: string;
    readonly resolutionReason: string;
  } {
    if (this.userStopProvider()) {
      throw new GoalUserStopError('resolve_conflict');
    }

    let a: GovernedGoal;
    let b: GovernedGoal;

    if ('conflictId' in conflictOrGoalA) {
      const graph = graphOrGoalB as PriorityGraphEngine;
      const ga = graph.getGoal(conflictOrGoalA.goalIdA);
      const gb = graph.getGoal(conflictOrGoalA.goalIdB);
      if (!ga || !gb) {
        throw new GoalUserStopError(`Goals for conflict '${conflictOrGoalA.conflictId}' not found in graph`);
      }
      a = ga;
      b = gb;
    } else {
      a = conflictOrGoalA;
      b = graphOrGoalB as GovernedGoal;
    }

    // Rule 1: Master Operator Directive authority beats autonomous
    if (a.origin === 'USER_DIRECTIVE' && b.origin !== 'USER_DIRECTIVE') {
      const reason = `Goal '${a.goalId}' (USER_DIRECTIVE) takes precedence over autonomous goal '${b.goalId}'`;
      return Object.freeze({
        winnerGoalId: a.goalId,
        loserGoalId: b.goalId,
        winningGoalId: a.goalId,
        blockedGoalIds: Object.freeze([b.goalId]),
        requiresHumanEscalation: false,
        strategy: 'AUTHORITY_HIERARCHY',
        rationale: reason,
        resolutionReason: reason,
      });
    }

    if (b.origin === 'USER_DIRECTIVE' && a.origin !== 'USER_DIRECTIVE') {
      const reason = `Goal '${b.goalId}' (USER_DIRECTIVE) takes precedence over autonomous goal '${a.goalId}'`;
      return Object.freeze({
        winnerGoalId: b.goalId,
        loserGoalId: a.goalId,
        winningGoalId: b.goalId,
        blockedGoalIds: Object.freeze([a.goalId]),
        requiresHumanEscalation: false,
        strategy: 'AUTHORITY_HIERARCHY',
        rationale: reason,
        resolutionReason: reason,
      });
    }

    // Rule 2: Priority Score differential
    if (Math.abs(a.priorityScore - b.priorityScore) > 0.0001) {
      const winner = a.priorityScore > b.priorityScore ? a : b;
      const loser = a.priorityScore > b.priorityScore ? b : a;
      const reason = `Higher priority goal '${winner.goalId}' (${winner.priorityScore}) blocks lower priority goal '${loser.goalId}' (${loser.priorityScore})`;
      return Object.freeze({
        winnerGoalId: winner.goalId,
        loserGoalId: loser.goalId,
        winningGoalId: winner.goalId,
        blockedGoalIds: Object.freeze([loser.goalId]),
        requiresHumanEscalation: false,
        strategy: 'BLOCK_LOWER_PRIORITY',
        rationale: reason,
        resolutionReason: reason,
      });
    }

    // Rule 3: Tie in authority and priority -> Fail closed, block both for human governance
    const tieReason = `Contradictory goals '${a.goalId}' and '${b.goalId}' have equal authority and priority; both blocked pending Human Gate`;
    return Object.freeze({
      winnerGoalId: null,
      loserGoalId: null,
      winningGoalId: null,
      blockedGoalIds: Object.freeze([a.goalId, b.goalId]),
      requiresHumanEscalation: true,
      strategy: 'ESCALATE_TO_HUMAN_GATE',
      rationale: tieReason,
      resolutionReason: tieReason,
    });
  }

  /**
   * Applies the resolution by updating blocked goals in the graph to status BLOCKED.
   */
  public applyResolution(
    resolution: {
      winnerGoalId?: string | null;
      loserGoalId?: string | null;
      blockedGoalIds?: readonly string[];
      rationale?: string;
      resolutionReason?: string;
    },
    graph: PriorityGraphEngine
  ): void {
    if (this.userStopProvider()) {
      throw new GoalUserStopError('apply_conflict_resolution');
    }

    const toBlock = new Set<string>();
    if (resolution.loserGoalId) toBlock.add(resolution.loserGoalId);
    if (resolution.blockedGoalIds) {
      for (const id of resolution.blockedGoalIds) {
        toBlock.add(id);
      }
    }

    const reason = resolution.rationale ?? resolution.resolutionReason ?? 'CONFLICT_WITH_HIGHER_PRIORITY_GOAL';

    for (const goalId of toBlock) {
      const goal = graph.getGoal(goalId);
      if (goal) {
        const updated: GovernedGoal = {
          ...goal,
          status: 'BLOCKED',
          statusReason: reason,
          updatedAt: new Date().toISOString(),
          version: goal.version + 1,
        };
        graph.updateGoal(updated);
      }
    }
  }

  private checkResourceConflict(a: GovernedGoal, b: GovernedGoal): GoalConflictDescriptor | null {
    const extractResources = (goal: GovernedGoal): Set<string> => {
      const set = new Set<string>();
      for (const c of goal.constraints) {
        const match = c.match(/exclusive(?:_resource)?:\s*([A-Za-z0-9_.-]+)/i);
        if (match) set.add(match[1].toLowerCase());
      }
      return set;
    };

    const resA = extractResources(a);
    const resB = extractResources(b);

    for (const r of resA) {
      if (resB.has(r)) {
        return {
          conflictId: `conf_${crypto.randomBytes(6).toString('hex')}`,
          goalIdA: a.goalId,
          goalIdB: b.goalId,
          conflictType: 'RESOURCE_EXCLUSION',
          severity: 'HIGH',
          reason: `Mutual exclusion: both goals request exclusive lock on resource '${r}'`,
          detectedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  }

  private checkPolicyConflict(a: GovernedGoal, b: GovernedGoal): GoalConflictDescriptor | null {
    // Check if Goal A requires what Goal B explicitly forbids
    for (const cA of a.constraints) {
      for (const cB of b.constraints) {
        if (
          (cA.toLowerCase().includes('prohibit:') && cB.toLowerCase().includes(cA.toLowerCase().replace('prohibit:', '').trim())) ||
          (cB.toLowerCase().includes('prohibit:') && cA.toLowerCase().includes(cB.toLowerCase().replace('prohibit:', '').trim()))
        ) {
          return {
            conflictId: `conf_${crypto.randomBytes(6).toString('hex')}`,
            goalIdA: a.goalId,
            goalIdB: b.goalId,
            conflictType: 'POLICY_CONTRADICTION',
            severity: 'CRITICAL',
            reason: `Policy contradiction detected between constraint '${cA}' and '${cB}'`,
            detectedAt: new Date().toISOString(),
          };
        }
      }
    }
    return null;
  }
}

export const globalGoalConflictResolver = new GoalConflictResolver();
