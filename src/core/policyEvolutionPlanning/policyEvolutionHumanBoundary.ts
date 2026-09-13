// src/core/policyEvolutionPlanning/policyEvolutionHumanBoundary.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Evolution Human Boundary (Component 771).
// Establishes the mandatory human governance boundary for candidate drafts.
// Formulates immutable HumanEvolutionReviewRequirements and enforces anti-self-approval.
//
// Authority Invariants:
// - ANTI_SELF_APPROVAL: Autonomous agent personas explicitly rejected
// - NO_AUTONOMOUS_POLICY_ACTIVATION: Boundary defines requirements; never self-approves
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  CandidateDraft,
  HumanEvolutionReviewRequirement,
  PolicyEvolutionPlanningOptions,
} from './policyEvolutionPlanningTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

const AUTONOMOUS_ACTOR_PATTERNS = [
  /^auto_/i,
  /^bot_/i,
  /^ai_agent/i,
  /^ai_/i,
  /^autonomous/i,
  /^synthetic_/i,
  /^system_daemon/i,
  /^system/i,
  /^agent_/i,
  /^daemon/i,
  /^cron_/i,
  /^scheduler/i,
  /^runtime/i,
];

export class PolicyEvolutionHumanBoundary {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyEvolutionPlanningOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Human boundary evaluation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('BOUNDARY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Asserts that a reviewer identity is not an autonomous persona.
   */
  public assertHumanIdentity(reviewerId: string): void {
    const trimmed = (reviewerId ?? '').trim();
    if (!trimmed) {
      throw new Error('MISSING_REVIEWER_ID: Reviewer identifier must be a non-empty string');
    }

    for (const pattern of AUTONOMOUS_ACTOR_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Autonomous persona '${trimmed}' cannot review or satisfy evolution requirements. Explicit human review is mandatory.`);
      }
    }
  }

  /**
   * Formulates a mandatory human review requirement for a candidate draft.
   */
  public createReviewRequirement(
    draft: CandidateDraft,
    requestedAction: HumanEvolutionReviewRequirement['requestedReviewAction'] = 'APPROVE_FOR_SIMULATION',
    ttlMs: number = 86400000 // 24h
  ): HumanEvolutionReviewRequirement {
    this.assertUserStopInactive();
    this.validateTenant(draft.tenantPartition);

    const now = Date.now();
    const rawIdHash = crypto.createHash('sha256')
      .update(`${draft.candidateDraftId}:${draft.evolutionPlanId}:${draft.tenantPartition}:${requestedAction}:${now}`)
      .digest('hex');
    const requirementId = `hreq_${rawIdHash.substring(0, 16)}`;

    return Object.freeze({
      requirementId,
      candidateDraftId: draft.candidateDraftId,
      evolutionPlanId: draft.evolutionPlanId,
      tenantPartition: draft.tenantPartition,
      sourcePolicyVersion: draft.sourcePolicyVersion,
      requiredRole: 'MASTER_HUMAN_OPERATOR',
      requestedReviewAction: requestedAction,
      expiresAt: new Date(now + ttlMs).toISOString(),
      createdAt: new Date(now).toISOString(),
      provenanceHeadHash: draft.provenanceHeadHash,
    });
  }
}
