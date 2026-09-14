// src/core/goal/goalValidator.ts
// BOWCON V4.0 — MS-1.5.04: GOAL VALIDATOR (FAILS-CLOSED)
// Component 1009 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_MALFORMED_GOAL == TRUE
// PROTOYPE_POLLUTION_DEFENSE == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import {
  type GoalProposalInput,
  type GovernedGoal,
  type GoalPriorityVector,
  GoalValidationError,
  GoalSecurityError,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  assertNoChainOfThought,
} from './goalTypes.js';

const WINDOWS_RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export class GoalValidator {
  /**
   * Validates an untrusted GoalProposalInput.
   * Fails closed on any schema, boundary, CoT, or security violation.
   */
  public static validateProposal(proposal: unknown): asserts proposal is GoalProposalInput {
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
      throw new GoalValidationError('Goal proposal must be a non-null object', ['INVALID_OBJECT']);
    }

    const p = proposal as Record<string, unknown>;

    // 1. Prototype pollution & CoT checks
    assertNoChainOfThought(proposal, 'proposal');

    const errors: string[] = [];

    // 2. Tenant ID validation
    if (typeof p.tenantId !== 'string' || !p.tenantId.trim()) {
      errors.push('tenantId must be a non-empty string');
    } else {
      const cleanTenant = p.tenantId.trim().toLowerCase();
      if (
        cleanTenant.includes('..') ||
        cleanTenant.includes('/') ||
        cleanTenant.includes('\\') ||
        cleanTenant.includes('\0') ||
        WINDOWS_RESERVED_NAMES.has(cleanTenant)
      ) {
        throw new GoalSecurityError(`Illegal tenant identifier: '${p.tenantId}'`, {
          tenantId: p.tenantId,
        });
      }
    }

    // 3. Session ID validation (if provided)
    if (p.sessionId !== undefined && p.sessionId !== null) {
      if (typeof p.sessionId !== 'string' || !p.sessionId.trim()) {
        errors.push('sessionId must be a non-empty string if provided');
      }
    }

    // 4. Origin & Intent validation
    const validOrigins = new Set(['USER_DIRECTIVE', 'SYSTEM_EVENT', 'COGNITIVE_REGISTER', 'TASK_OUTCOME']);
    if (typeof p.origin !== 'string' || !validOrigins.has(p.origin)) {
      errors.push(`origin must be one of: ${Array.from(validOrigins).join(', ')}`);
    }

    const isValidIntent =
      (typeof p.sourceIntent === 'string' && p.sourceIntent.trim().length > 0) ||
      (typeof p.sourceIntent === 'object' &&
        p.sourceIntent !== null &&
        typeof (p.sourceIntent as any).intentId === 'string' &&
        (p.sourceIntent as any).intentId.trim().length > 0);

    if (!isValidIntent) {
      errors.push('sourceIntent must be a valid CognitiveIntent or non-empty string');
    }

    // 5. Title validation
    if (typeof p.title !== 'string' || !p.title.trim()) {
      errors.push('title must be a non-empty string');
    } else if (p.title.trim().length > MAX_TITLE_LENGTH) {
      errors.push(`title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`);
    }

    // 6. Description validation
    if (typeof p.description !== 'string' || !p.description.trim()) {
      errors.push('description must be a non-empty string');
    } else if (p.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    // 7. Success criteria validation
    if (!Array.isArray(p.successCriteria) || p.successCriteria.length === 0) {
      errors.push('successCriteria must be a non-empty array of strings');
    } else {
      const validCriteria = p.successCriteria.filter(
        (c) => typeof c === 'string' && c.trim().length > 0
      );
      if (validCriteria.length === 0) {
        errors.push('successCriteria must contain at least one non-empty criterion');
      }
    }

    // 8. Failure criteria validation (optional)
    if (p.failureCriteria !== undefined && p.failureCriteria !== null) {
      if (!Array.isArray(p.failureCriteria)) {
        errors.push('failureCriteria must be an array of strings if provided');
      }
    }

    // 9. Constraints validation (optional)
    if (p.constraints !== undefined && p.constraints !== null) {
      if (!Array.isArray(p.constraints)) {
        errors.push('constraints must be an array of strings if provided');
      }
    }

    // 10. Priority vector validation (optional)
    if (p.priorityVector !== undefined && p.priorityVector !== null) {
      if (typeof p.priorityVector !== 'object' || Array.isArray(p.priorityVector)) {
        errors.push('priorityVector must be an object');
      } else {
        const pv = p.priorityVector as Record<string, unknown>;
        const dimensions = ['importance', 'urgency', 'userEmphasis', 'risk', 'dependencyPressure', 'blockingImpact'];
        for (const dim of dimensions) {
          if (pv[dim] !== undefined && pv[dim] !== null) {
            const val = pv[dim];
            if (typeof val !== 'number' || !Number.isFinite(val) || val < 0.0 || val > 1.0) {
              errors.push(`priorityVector.${dim} must be a finite number between 0.0 and 1.0`);
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new GoalValidationError('Goal proposal validation failed', errors, { proposal });
    }
  }

  /**
   * Validates a constructed GovernedGoal.
   */
  public static validateGoal(goal: GovernedGoal): void {
    if (!goal || typeof goal !== 'object') {
      throw new GoalValidationError('Goal must be a non-null object');
    }

    assertNoChainOfThought(goal, 'goal');

    const errors: string[] = [];

    if (!goal.goalId || typeof goal.goalId !== 'string') {
      errors.push('goalId must be a valid string');
    }
    if (!goal.tenantId || typeof goal.tenantId !== 'string') {
      errors.push('tenantId must be a valid string');
    }
    if (typeof goal.priorityScore !== 'number' || !Number.isFinite(goal.priorityScore) || goal.priorityScore < 0.0 || goal.priorityScore > 1.0) {
      errors.push('priorityScore must be a finite number between 0.0 and 1.0');
    }
    if (typeof goal.version !== 'number' || !Number.isInteger(goal.version) || goal.version < 1) {
      errors.push('version must be a positive integer >= 1');
    }
    if (!goal.provenanceHash || typeof goal.provenanceHash !== 'string' || goal.provenanceHash.length !== 64) {
      errors.push('provenanceHash must be a 64-character hex string');
    }

    if (errors.length > 0) {
      throw new GoalValidationError('Governed goal validation failed', errors, { goalId: goal.goalId });
    }
  }

  /**
   * Validates priority vector dimensions bounds strictly [0.0, 1.0].
   */
  public static sanitizePriorityVector(input?: Partial<GoalPriorityVector>): GoalPriorityVector {
    const sanitizeDim = (val: unknown, def = 0.5): number => {
      if (typeof val !== 'number' || !Number.isFinite(val)) return def;
      return Math.max(0.0, Math.min(1.0, val));
    };

    return Object.freeze({
      importance: sanitizeDim(input?.importance, 0.5),
      urgency: sanitizeDim(input?.urgency, 0.3),
      userEmphasis: sanitizeDim(input?.userEmphasis, 0.5),
      risk: sanitizeDim(input?.risk, 0.2),
      dependencyPressure: sanitizeDim(input?.dependencyPressure, 0.0),
      blockingImpact: sanitizeDim(input?.blockingImpact, 0.0),
    });
  }
}
