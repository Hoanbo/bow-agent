// src/core/policyEvolutionPlanning/policyCandidateValidationEngine.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Candidate Validation Engine (Component 769).
// Independently validates candidate policy drafts against schemas, tenant isolation,
// safety constraints, and hard-forbidden boundaries.
//
// Authority Invariants:
// - LEVEL_0_ANALYSIS: Pure validation; zero active mutation
// - FAIL_CLOSED: Invalid or blocked candidates never pass
// - STRICT_TENANT_ISOLATION: Enforced via resolveUserPartition
// - USER_STOP > EVERYTHING

import path from 'node:path';
import type {
  CandidateDraft,
  CandidateValidationResult,
  CandidateValidationStatus,
  PolicyEvolutionPlanningOptions,
} from './policyEvolutionPlanningTypes.js';
import { PolicyEvolutionConstraintEngine } from './policyEvolutionConstraintEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyCandidateValidationEngine {
  private readonly constraintEngine: PolicyEvolutionConstraintEngine;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyEvolutionPlanningOptions,
    constraintEngine?: PolicyEvolutionConstraintEngine
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.constraintEngine = constraintEngine ?? new PolicyEvolutionConstraintEngine(options);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Candidate validation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('VALIDATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Independently validates a candidate policy draft.
   */
  public validateCandidateDraft(draft: CandidateDraft): CandidateValidationResult {
    this.assertUserStopInactive();

    const issues: string[] = [];

    // 1. Basic draft format and ID validation
    if (!draft || !draft.candidateDraftId || typeof draft.candidateDraftId !== 'string' || draft.candidateDraftId.trim().length === 0) {
      return {
        valid: false,
        candidateDraftId: (draft?.candidateDraftId ?? 'UNKNOWN_DRAFT') as any,
        status: 'INVALID',
        tenantPartition: draft?.tenantPartition ?? 'UNKNOWN_TENANT',
        issues: ['INVALID_CANDIDATE_PAYLOAD: Missing or malformed candidateDraftId'],
        validatedAt: new Date().toISOString(),
      };
    }

    // 2. Strict tenant isolation
    try {
      this.validateTenant(draft.tenantPartition);
    } catch (err: any) {
      return {
        valid: false,
        candidateDraftId: draft.candidateDraftId,
        status: 'BLOCKED',
        tenantPartition: draft.tenantPartition,
        issues: [`TENANT_ISOLATION_FAILURE: ${err.message}`],
        validatedAt: new Date().toISOString(),
      };
    }

    // 3. Plan and Intake linkage
    if (!draft.evolutionPlanId || draft.evolutionPlanId.trim().length === 0) {
      issues.push('MISSING_PLAN_LINKAGE: Candidate draft lacks evolutionPlanId binding');
    }
    if (!draft.intakeId || draft.intakeId.trim().length === 0) {
      issues.push('MISSING_INTAKE_LINKAGE: Candidate draft lacks intakeId binding');
    }

    // 4. Invariant checks
    if (draft.isActivePolicy !== false) {
      issues.push('ACTIVE_POLICY_LEAKAGE: Candidate draft cannot declare isActivePolicy as true');
    }
    if (draft.isPolicyMutation !== false) {
      issues.push('POLICY_MUTATION_LEAKAGE: Candidate draft cannot declare isPolicyMutation as true');
    }
    if (draft.isAutonomousMutation !== false) {
      issues.push('AUTONOMOUS_MUTATION_LEAKAGE: Candidate draft cannot declare isAutonomousMutation as true');
    }

    // 5. Source version consistency
    if (!draft.sourcePolicyVersion || draft.sourcePolicyVersion.trim().length === 0) {
      issues.push('MISSING_SOURCE_VERSION: Candidate draft must identify sourcePolicyVersion baseline');
    }

    // 6. Proposed changes presence
    if (!draft.proposedChanges || typeof draft.proposedChanges !== 'object') {
      issues.push('MISSING_PROPOSED_CHANGES: Candidate draft must specify structured proposedChanges');
    }

    // 7. Safety constraints evaluation
    const constraintResult = this.constraintEngine.evaluateCandidateConstraints(draft);
    if (!constraintResult.passed) {
      issues.push(...constraintResult.violations);
    }

    let status: CandidateValidationStatus = 'VALID';
    if (issues.some(i => i.includes('Hard-forbidden') || i.includes('TENANT') || i.includes('LEAKAGE'))) {
      status = 'BLOCKED';
    } else if (issues.length > 0) {
      status = 'INVALID';
    }

    const valid = issues.length === 0;

    return {
      valid,
      candidateDraftId: draft.candidateDraftId,
      status,
      tenantPartition: draft.tenantPartition,
      issues: Object.freeze(issues),
      validatedAt: new Date().toISOString(),
    };
  }
}
