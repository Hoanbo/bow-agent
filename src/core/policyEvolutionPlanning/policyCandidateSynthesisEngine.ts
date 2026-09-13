// src/core/policyEvolutionPlanning/policyCandidateSynthesisEngine.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Candidate Synthesis Engine (Component 768).
// Synthesizes deterministic, immutable CandidateDraft objects from an EvolutionPlan.
//
// Authority Invariants:
// - CANDIDATE_DRAFT != ACTIVE_POLICY
// - CANDIDATE_SYNTHESIS != POLICY_MUTATION
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Purely non-authoritative draft synthesis
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  EvolutionPlan,
  CandidateDraft,
  PolicyEvolutionPlanningOptions,
} from './policyEvolutionPlanningTypes.js';
import { createCandidateDraftId } from './policyEvolutionPlanningTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface SynthesizeCandidateDraftInput {
  readonly plan: EvolutionPlan;
  readonly sourcePolicyVersion?: string;
  readonly proposedRuleModifications?: Record<string, any>;
  readonly provenanceHeadHash?: string;
}

export class PolicyCandidateSynthesisEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  // Tenant -> Map<evolutionPlanId, CandidateDraft>
  private readonly drafts: Map<string, Map<string, CandidateDraft>> = new Map();

  constructor(options?: PolicyEvolutionPlanningOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Candidate synthesis suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('SYNTHESIS_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  private getTenantDrafts(tenantPartition: string): Map<string, CandidateDraft> {
    let map = this.drafts.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.drafts.set(tenantPartition, map);
    }
    return map;
  }

  /**
   * Synthesizes a deterministic CandidateDraft from an evolution plan.
   */
  public synthesizeCandidateDraft(input: SynthesizeCandidateDraftInput): CandidateDraft {
    // 1. USER_STOP check
    this.assertUserStopInactive();

    const { plan, sourcePolicyVersion, proposedRuleModifications, provenanceHeadHash } = input;

    // 2. Validate tenant partition
    this.validateTenant(plan.tenantPartition);

    // 3. Invariant check on plan
    if (!plan || !plan.planId) {
      throw new Error('INVALID_PLAN_INPUT: Valid EvolutionPlan is required for candidate synthesis');
    }
    if (plan.isPolicyMutation !== false || plan.isAutonomousMutation !== false) {
      throw new Error('AUTHORITY_INVARIANT_VIOLATION: Plan must declare isPolicyMutation and isAutonomousMutation as false');
    }

    // 4. Idempotency defense: check existing draft for this planId
    const tenantMap = this.getTenantDrafts(plan.tenantPartition);
    const existing = tenantMap.get(plan.planId);
    if (existing) {
      return existing;
    }

    const version = sourcePolicyVersion ?? 'v4.0.0-baseline';
    const headHash = provenanceHeadHash ?? 'draft_genesis_hash';

    // Formulate proposed changes deterministically
    const proposedChanges = proposedRuleModifications ?? {
      modifications: [...plan.proposedModifications],
      calibratedThresholds: {
        errorBudgetMargin: 0.05,
        maxRetries: 3,
        approvalTimeoutMs: 30000,
      },
    };

    const constraintsSummary: string[] = [
      'NO_DIRECT_ACTIVE_POLICY_MUTATION',
      'NO_AUTONOMOUS_CANDIDATE_ACTIVATION',
      'NO_AUTONOMOUS_PROMOTION',
      'NO_AUTONOMOUS_ROLLBACK',
      'MANDATORY_HUMAN_REVIEW_REQUIRED',
    ];

    const rawDraftHash = crypto.createHash('sha256')
      .update(`${plan.planId}:${plan.tenantPartition}:${version}:${JSON.stringify(proposedChanges)}:${headHash}`)
      .digest('hex');
    const candidateDraftId = createCandidateDraftId(`cdraft_${rawDraftHash.substring(0, 16)}`);

    const draft: CandidateDraft = Object.freeze({
      candidateDraftId,
      evolutionPlanId: plan.planId,
      intakeId: plan.intakeId,
      tenantPartition: plan.tenantPartition,
      sourcePolicyVersion: version,
      sourceCandidateId: plan.candidateId,
      proposedChanges: Object.freeze(proposedChanges),
      rationale: plan.rationale,
      expectedEffects: plan.expectedEffects,
      constraintsSummary: Object.freeze(constraintsSummary),
      requiredHumanReview: true,
      provenanceHeadHash: headHash,
      createdAt: new Date().toISOString(),
      isActivePolicy: false,
      isPolicyMutation: false,
      isAutonomousMutation: false,
    });

    tenantMap.set(plan.planId, draft);
    return draft;
  }

  /**
   * Retrieves an existing candidate draft by evolutionPlanId.
   */
  public getCandidateDraftByPlanId(tenantPartition: string, planId: string): CandidateDraft | undefined {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.getTenantDrafts(tenantPartition).get(planId as any);
  }
}
