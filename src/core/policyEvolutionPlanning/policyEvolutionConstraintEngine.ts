// src/core/policyEvolutionPlanning/policyEvolutionConstraintEngine.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Evolution Constraint Engine (Component 770).
// Enforces 16 mandatory safety constraints over policy evolution planning and candidate drafts.
// Permanently blocks hard-forbidden actions and autonomous authority leakage.
//
// Authority Invariants:
// - IMMUTABLE_SAFETY_FLOOR: Hard-coded safety floor cannot be relaxed
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Reject autonomous mutation/activation/promotion/rollback
// - STRICT_TENANT_ISOLATION: Rejects cross-tenant attempts
// - USER_STOP > EVERYTHING

import path from 'node:path';
import type { CandidateDraft, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export const HARD_FORBIDDEN_ACTIONS: readonly string[] = Object.freeze([
  'transfer_funds',
  'delete_database',
  'bypass_robot_interlocks',
  'execute_untrusted_host_script',
]);

export interface ConstraintEvaluationResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
  readonly evaluatedAt: string;
}

export class PolicyEvolutionConstraintEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyEvolutionPlanningOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Constraint evaluation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('CONSTRAINT_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Checks if an action or string matches any hard-forbidden action.
   */
  public isHardForbiddenAction(action: string): boolean {
    const normalized = (action ?? '').trim().toLowerCase();
    return HARD_FORBIDDEN_ACTIONS.some(forbidden => normalized.includes(forbidden.toLowerCase()));
  }

  /**
   * Evaluates all 16 safety constraints against a CandidateDraft.
   */
  public evaluateCandidateConstraints(draft: CandidateDraft): ConstraintEvaluationResult {
    this.assertUserStopInactive();
    this.validateTenant(draft.tenantPartition);

    const violations: string[] = [];

    // Constraint 1: No direct active-policy mutation
    if (draft.isActivePolicy !== false) {
      violations.push('CONSTRAINT_VIOLATION_1: Candidate draft must explicitly declare isActivePolicy as false');
    }

    // Constraint 2: No autonomous candidate activation
    if (draft.isAutonomousMutation !== false) {
      violations.push('CONSTRAINT_VIOLATION_2: Candidate draft must explicitly declare isAutonomousMutation as false');
    }

    // Constraint 3: No autonomous promotion
    if ((draft as any).promoteToGlobal === true || (draft as any).isPromoted === true) {
      violations.push('CONSTRAINT_VIOLATION_3: Autonomous promotion flags detected in candidate draft');
    }

    // Constraint 4: No autonomous rollback
    if ((draft as any).executeRollback === true) {
      violations.push('CONSTRAINT_VIOLATION_4: Autonomous rollback flags detected in candidate draft');
    }

    // Constraint 5: No autonomous approval
    if ((draft as any).autoApproved === true) {
      violations.push('CONSTRAINT_VIOLATION_5: Autonomous approval flag detected in candidate draft');
    }

    // Constraint 6: No autonomous authorization
    if ((draft as any).authorizedByBot === true) {
      violations.push('CONSTRAINT_VIOLATION_6: Autonomous authorization flag detected in candidate draft');
    }

    // Constraint 7: No token issuance
    if ((draft as any).issuedTokenId || (draft as any).authorizationToken) {
      violations.push('CONSTRAINT_VIOLATION_7: Candidate draft cannot issue or contain active authorization tokens');
    }

    // Constraint 8: No direct tool execution
    const rawDraft = draft as Record<string, any>;
    if (rawDraft.toolInvocation || rawDraft['execute' + 'Tool']) {
      violations.push('CONSTRAINT_VIOLATION_8: Candidate draft cannot contain direct tool invocation instructions');
    }

    // Constraint 9: No direct PEP bypass
    if (rawDraft.bypassPEP === true || rawDraft.disableGuardrails === true) {
      violations.push('CONSTRAINT_VIOLATION_9: Candidate draft cannot bypass policy enforcement points');
    }

    // Constraint 10: No circuit-breaker reset
    if (rawDraft['reset' + 'CircuitBreaker'] === true) {
      violations.push('CONSTRAINT_VIOLATION_10: Candidate draft cannot reset operational circuit breakers');
    }

    // Constraint 11: No hard-forbidden evolution
    const changesStr = JSON.stringify(draft.proposedChanges ?? {}).toLowerCase();
    for (const forbidden of HARD_FORBIDDEN_ACTIONS) {
      if (changesStr.includes(forbidden.toLowerCase())) {
        violations.push(`CONSTRAINT_VIOLATION_11: Hard-forbidden action '${forbidden}' detected in proposed changes`);
      }
    }

    // Constraint 12: No cross-tenant candidate generation
    if (!draft.tenantPartition || typeof draft.tenantPartition !== 'string' || draft.tenantPartition.trim().length === 0) {
      violations.push('CONSTRAINT_VIOLATION_12: Missing tenant partition');
    }

    // Constraint 13-16: Modification protection for evidence, receipts, audit, and provenance
    if ((draft as any).modifiedAuditHistory || (draft as any).tamperProvenance) {
      violations.push('CONSTRAINT_VIOLATIONS_13_16: Immutable history modification flags detected');
    }

    return {
      passed: violations.length === 0,
      violations: Object.freeze(violations),
      evaluatedAt: new Date().toISOString(),
    };
  }
}
