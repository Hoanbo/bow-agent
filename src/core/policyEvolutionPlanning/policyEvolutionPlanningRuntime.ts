// src/core/policyEvolutionPlanning/policyEvolutionPlanningRuntime.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Evolution Planning Runtime (Component 774).
// Master coordinator for policy evolution planning, candidate draft synthesis,
// independent candidate validation, safety constraint enforcement, and human review boundaries.
//
// Authority Invariants:
// - MASTER_COORDINATOR: Orchestrates planning only; zero active policy mutation
// - CANDIDATE_DRAFT != ACTIVE_POLICY
// - USER_STOP > EVERYTHING: Verified at every checkpoint
// - STRICT_TENANT_ISOLATION: Enforced via resolveUserPartition

import path from 'node:path';
import type { PolicyEvolutionIntakeRequest } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type {
  EvolutionPlan,
  CandidateDraft,
  CandidateValidationResult,
  HumanEvolutionReviewRequirement,
  PolicyEvolutionPlanningOptions,
} from './policyEvolutionPlanningTypes.js';
import { PolicyEvolutionPlanEngine } from './policyEvolutionPlanEngine.js';
import { PolicyCandidateSynthesisEngine, type SynthesizeCandidateDraftInput } from './policyCandidateSynthesisEngine.js';
import { PolicyCandidateValidationEngine } from './policyCandidateValidationEngine.js';
import { PolicyEvolutionConstraintEngine } from './policyEvolutionConstraintEngine.js';
import { PolicyEvolutionHumanBoundary } from './policyEvolutionHumanBoundary.js';
import { PolicyEvolutionPlanningProvenanceEngine } from './policyEvolutionPlanningProvenanceEngine.js';
import { PolicyEvolutionPlanningAuditEngine, globalPolicyEvolutionPlanningAuditEngine } from './policyEvolutionPlanningAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface EvolutionPlanningPipelineResult {
  readonly success: boolean;
  readonly plan: EvolutionPlan;
  readonly candidateDraft?: CandidateDraft;
  readonly validationResult?: CandidateValidationResult;
  readonly humanRequirement?: HumanEvolutionReviewRequirement;
  readonly status: 'PLAN_CREATED' | 'CANDIDATE_SYNTHESIZED_AND_VALIDATED' | 'VALIDATION_FAILED' | 'BLOCKED';
  readonly reasons: readonly string[];
}

export class PolicyEvolutionPlanningRuntime {
  private readonly planEngine: PolicyEvolutionPlanEngine;
  private readonly synthesisEngine: PolicyCandidateSynthesisEngine;
  private readonly validationEngine: PolicyCandidateValidationEngine;
  private readonly constraintEngine: PolicyEvolutionConstraintEngine;
  private readonly humanBoundary: PolicyEvolutionHumanBoundary;
  private readonly provenanceEngine: PolicyEvolutionPlanningProvenanceEngine;
  private readonly auditEngine: PolicyEvolutionPlanningAuditEngine;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyEvolutionPlanningOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;

    this.planEngine = new PolicyEvolutionPlanEngine(options);
    this.synthesisEngine = new PolicyCandidateSynthesisEngine(options);
    this.constraintEngine = new PolicyEvolutionConstraintEngine(options);
    this.validationEngine = new PolicyCandidateValidationEngine(options, this.constraintEngine);
    this.humanBoundary = new PolicyEvolutionHumanBoundary(options);
    this.provenanceEngine = new PolicyEvolutionPlanningProvenanceEngine(options);
    this.auditEngine = globalPolicyEvolutionPlanningAuditEngine;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Evolution planning runtime suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Executes the end-to-end governed evolution planning pipeline:
   * 1. Intake ingestion & plan creation
   * 2. Candidate draft synthesis (for synthesis/reevaluation plans)
   * 3. Candidate validation & constraint verification
   * 4. Human review requirement generation
   * 5. Cryptographic provenance chaining
   * 6. Audit logging
   */
  public planAndSynthesize(
    intake: PolicyEvolutionIntakeRequest,
    options?: {
      readonly sourcePolicyVersion?: string;
      readonly proposedRuleModifications?: Record<string, any>;
    }
  ): EvolutionPlanningPipelineResult {
    this.assertUserStopInactive();
    this.validateTenant(intake.tenantPartition);

    // 1. Plan creation
    const plan = this.planEngine.createEvolutionPlan(intake);

    this.provenanceEngine.appendEvent(
      intake.tenantPartition,
      intake.intakeId,
      'EVOLUTION_PLAN_CREATED',
      { planId: plan.planId, details: { planType: plan.planType } }
    );

    this.auditEngine.recordEvent({
      eventType: 'EVOLUTION_PLAN_CREATED',
      tenantPartition: intake.tenantPartition,
      intakeId: intake.intakeId,
      planId: plan.planId,
      status: 'PLAN_CREATED',
      details: { planType: plan.planType },
    });

    // If plan is investigation or rollback review, candidate synthesis may not be required immediately
    if (plan.planType === 'INVESTIGATION_PLAN' || plan.planType === 'ROLLBACK_REVIEW_PLAN' || plan.planType === 'HUMAN_INVESTIGATION_PLAN') {
      return {
        success: true,
        plan,
        status: 'PLAN_CREATED',
        reasons: [`Plan of type '${plan.planType}' formulated; candidate synthesis deferred pending investigation`],
      };
    }

    // 2. Candidate synthesis
    const currentHeadHash = this.provenanceEngine.getHeadHash(intake.tenantPartition, intake.intakeId);
    const candidateDraft = this.synthesisEngine.synthesizeCandidateDraft({
      plan,
      sourcePolicyVersion: options?.sourcePolicyVersion,
      proposedRuleModifications: options?.proposedRuleModifications,
      provenanceHeadHash: currentHeadHash,
    });

    this.provenanceEngine.appendEvent(
      intake.tenantPartition,
      intake.intakeId,
      'CANDIDATE_DRAFT_SYNTHESIZED',
      { planId: plan.planId, candidateDraftId: candidateDraft.candidateDraftId }
    );

    this.auditEngine.recordEvent({
      eventType: 'CANDIDATE_DRAFT_CREATED',
      tenantPartition: intake.tenantPartition,
      intakeId: intake.intakeId,
      planId: plan.planId,
      candidateDraftId: candidateDraft.candidateDraftId,
      status: 'CREATED',
    });

    // 3. Candidate validation
    const validationResult = this.validationEngine.validateCandidateDraft(candidateDraft);

    if (!validationResult.valid) {
      this.auditEngine.recordEvent({
        eventType: validationResult.status === 'BLOCKED' ? 'CANDIDATE_BLOCKED' : 'CANDIDATE_REJECTED',
        tenantPartition: intake.tenantPartition,
        intakeId: intake.intakeId,
        planId: plan.planId,
        candidateDraftId: candidateDraft.candidateDraftId,
        status: validationResult.status,
        reason: validationResult.issues.join('; '),
      });

      return {
        success: false,
        plan,
        candidateDraft,
        validationResult,
        status: validationResult.status === 'BLOCKED' ? 'BLOCKED' : 'VALIDATION_FAILED',
        reasons: validationResult.issues,
      };
    }

    this.auditEngine.recordEvent({
      eventType: 'CANDIDATE_VALIDATED',
      tenantPartition: intake.tenantPartition,
      intakeId: intake.intakeId,
      planId: plan.planId,
      candidateDraftId: candidateDraft.candidateDraftId,
      status: 'VALID',
    });

    // 4. Formulate human review requirement
    const humanRequirement = this.humanBoundary.createReviewRequirement(candidateDraft);

    this.provenanceEngine.appendEvent(
      intake.tenantPartition,
      intake.intakeId,
      'HUMAN_REVIEW_REQUIREMENT_FORMULATED',
      {
        planId: plan.planId,
        candidateDraftId: candidateDraft.candidateDraftId,
        details: { requirementId: humanRequirement.requirementId },
      }
    );

    this.auditEngine.recordEvent({
      eventType: 'HUMAN_REVIEW_REQUIRED',
      tenantPartition: intake.tenantPartition,
      intakeId: intake.intakeId,
      planId: plan.planId,
      candidateDraftId: candidateDraft.candidateDraftId,
      status: 'AWAITING_HUMAN_REVIEW',
      details: { requirementId: humanRequirement.requirementId },
    });

    return {
      success: true,
      plan,
      candidateDraft,
      validationResult,
      humanRequirement,
      status: 'CANDIDATE_SYNTHESIZED_AND_VALIDATED',
      reasons: [],
    };
  }

  /**
   * Verifies provenance integrity for an intake chain.
   */
  public verifyProvenanceIntegrity(
    tenantPartition: string,
    intakeId: PolicyEvolutionIntakeRequest['intakeId']
  ): { valid: boolean; errors: string[] } {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.provenanceEngine.verifyChainIntegrity(tenantPartition, intakeId);
  }
}
