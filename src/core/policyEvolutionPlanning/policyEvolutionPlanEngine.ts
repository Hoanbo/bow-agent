// src/core/policyEvolutionPlanning/policyEvolutionPlanEngine.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Evolution Plan Engine (Component 767).
// Consumes verified PolicyEvolutionIntakeRequests from MS-1.3.67 and generates
// bounded, deterministic Evolution Plans describing required policy evolution steps.
//
// Authority Invariants:
// - EVOLUTION_INTAKE != EVOLUTION_PLAN
// - EVOLUTION_PLAN != POLICY_MUTATION
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Plans describe actions only; zero active mutation
// - STRICT_TENANT_ISOLATION: Partition resolved via resolveUserPartition
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type { PolicyEvolutionIntakeRequest } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type {
  EvolutionPlan,
  EvolutionPlanType,
  PolicyEvolutionPlanningOptions,
} from './policyEvolutionPlanningTypes.js';
import { createEvolutionPlanId } from './policyEvolutionPlanningTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyEvolutionPlanEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  // Tenant -> Map<intakeId, EvolutionPlan>
  private readonly plans: Map<string, Map<string, EvolutionPlan>> = new Map();

  constructor(options?: PolicyEvolutionPlanningOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Evolution planning suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('PLANNING_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  private getTenantPlans(tenantPartition: string): Map<string, EvolutionPlan> {
    let map = this.plans.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.plans.set(tenantPartition, map);
    }
    return map;
  }

  /**
   * Deterministically maps intake action to plan type.
   */
  public mapIntakeActionToPlanType(intakeAction: string): EvolutionPlanType {
    switch (intakeAction) {
      case 'INVESTIGATION_INTAKE':
        return 'INVESTIGATION_PLAN';
      case 'CANDIDATE_REEVALUATION_INTAKE':
        return 'CANDIDATE_REEVALUATION_PLAN';
      case 'CANDIDATE_GENERATION_INTAKE':
        return 'CANDIDATE_SYNTHESIS_PLAN';
      case 'ROLLBACK_REVIEW_INTAKE':
        return 'ROLLBACK_REVIEW_PLAN';
      case 'HUMAN_INVESTIGATION_INTAKE':
        return 'HUMAN_INVESTIGATION_PLAN';
      default:
        throw new Error(`UNSUPPORTED_INTAKE_ACTION: Cannot generate evolution plan for '${intakeAction}'`);
    }
  }

  /**
   * Creates an evolution plan from a verified intake request.
   */
  public createEvolutionPlan(intake: PolicyEvolutionIntakeRequest): EvolutionPlan {
    // 1. USER_STOP check
    this.assertUserStopInactive();

    // 2. Validate tenant partition
    this.validateTenant(intake.tenantPartition);

    if (!intake || !intake.intakeId || typeof intake.intakeId !== 'string' || intake.intakeId.trim().length === 0) {
      throw new Error('INVALID_INTAKE_REQUEST: Missing or malformed intakeId');
    }

    // 3. Invariant checks on intake
    if (intake.isAutonomousMutation !== false || intake.isPolicyMutation !== false) {
      throw new Error('AUTHORITY_INVARIANT_VIOLATION: Intake request must declare isAutonomousMutation and isPolicyMutation as false');
    }

    // 4. Idempotency / anti-duplicate check
    const tenantMap = this.getTenantPlans(intake.tenantPartition);
    const existing = tenantMap.get(intake.intakeId);
    if (existing) {
      return existing;
    }

    const planType = this.mapIntakeActionToPlanType(intake.intakeAction);

    // Formulate proposed modifications and rationale deterministically based on planType
    const proposedModifications: string[] = [];
    const expectedEffects: string[] = [];
    let rationale = '';

    switch (planType) {
      case 'CANDIDATE_SYNTHESIS_PLAN':
        proposedModifications.push('synthesize_candidate_rule_calibration', 'adjust_threshold_margins');
        expectedEffects.push('restore_telemetric_stability', 'prevent_recurring_violations');
        rationale = `Synthesize candidate policy draft to address remediation effectiveness ${intake.effectivenessStatus} and impact ${intake.impactClassification}`;
        break;
      case 'CANDIDATE_REEVALUATION_PLAN':
        proposedModifications.push('re_evaluate_candidate_metrics', 'counterfactual_margin_check');
        expectedEffects.push('verify_candidate_readiness_prior_to_rollout');
        rationale = `Re-evaluate candidate ${intake.candidateId ?? 'UNKNOWN'} following observed post-execution telemetry`;
        break;
      case 'INVESTIGATION_PLAN':
        proposedModifications.push('gather_extended_telemetry', 'analyze_policy_drift_signatures');
        expectedEffects.push('determine_root_cause_of_drift');
        rationale = `Investigate policy drift flagged during execution verification (${intake.sourceExecutionId})`;
        break;
      case 'ROLLBACK_REVIEW_PLAN':
        proposedModifications.push('evaluate_rollback_necessity', 'assess_baseline_reversion_impact');
        expectedEffects.push('prevent_prolonged_degradation');
        rationale = `Review potential rollback following safety regression or degradation (${intake.regressionTypes.join(', ')})`;
        break;
      case 'HUMAN_INVESTIGATION_PLAN':
        proposedModifications.push('compile_human_investigation_dossier', 'solicit_operator_guidance');
        expectedEffects.push('human_operator_determination');
        rationale = `Escalate to supervisory human investigation per policy review decision`;
        break;
    }

    const rawIdHash = crypto.createHash('sha256')
      .update(`${intake.intakeId}:${planType}:${intake.tenantPartition}:${intake.provenanceHeadHash}`)
      .digest('hex');
    const planId = createEvolutionPlanId(`plan_${rawIdHash.substring(0, 16)}`);

    const plan: EvolutionPlan = Object.freeze({
      planId,
      intakeId: intake.intakeId,
      reviewId: intake.reviewId,
      proposalId: intake.proposalId,
      tenantPartition: intake.tenantPartition,
      planType,
      sourceExecutionId: intake.sourceExecutionId,
      candidateId: intake.candidateId,
      proposedModifications: Object.freeze(proposedModifications),
      rationale,
      expectedEffects: Object.freeze(expectedEffects),
      targetPolicyDomain: 'OPERATIONAL_GOVERNANCE',
      createdAt: new Date().toISOString(),
      isPolicyMutation: false,
      isAutonomousMutation: false,
    });

    tenantMap.set(intake.intakeId, plan);
    return plan;
  }

  /**
   * Retrieves an existing plan for an intakeId.
   */
  public getPlanByIntakeId(tenantPartition: string, intakeId: string): EvolutionPlan | undefined {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.getTenantPlans(tenantPartition).get(intakeId);
  }
}
