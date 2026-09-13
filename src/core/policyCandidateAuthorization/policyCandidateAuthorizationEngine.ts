// src/core/policyCandidateAuthorization/policyCandidateAuthorizationEngine.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Candidate Authorization Engine (Component 779).
// Coordinates the processing and recording of human authorization decisions for candidate drafts.
// Enforces mandatory pre-flight revalidation, explicit human review gates, anti-self-approval,
// and frozen immutable decision artifacts.
//
// Authority Invariants:
// - AUTHORIZE != ACTIVE_POLICY (Candidate authorization grants zero policy mutation)
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  CandidateAuthorizationRequest,
  CandidateAuthorizationDecisionType,
  HumanAuthorizationDecision,
  HumanAuthorizationRole,
  PolicyCandidateAuthorizationOptions,
} from './policyCandidateAuthorizationTypes.js';
import { createAuthorizationDecisionId } from './policyCandidateAuthorizationTypes.js';
import { PolicyCandidateAuthorizationRevalidationEngine } from './policyCandidateAuthorizationRevalidationEngine.js';
import { PolicyHumanAuthorizationGate } from './policyHumanAuthorizationGate.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyCandidateAuthorizationEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly revalidationEngine: PolicyCandidateAuthorizationRevalidationEngine;
  private readonly humanGate: PolicyHumanAuthorizationGate;

  constructor(
    options?: PolicyCandidateAuthorizationOptions,
    revalidationEngine?: PolicyCandidateAuthorizationRevalidationEngine,
    humanGate?: PolicyHumanAuthorizationGate
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.revalidationEngine = revalidationEngine ?? new PolicyCandidateAuthorizationRevalidationEngine(options);
    this.humanGate = humanGate ?? new PolicyHumanAuthorizationGate(options);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Candidate authorization suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('AUTHORIZATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Evaluates and records a human authorization decision on a candidate draft.
   */
  public authorizeCandidate(
    request: CandidateAuthorizationRequest,
    reviewerId: string,
    reviewerRole: HumanAuthorizationRole,
    decision: CandidateAuthorizationDecisionType,
    reason: string
  ): HumanAuthorizationDecision {
    this.assertUserStopInactive();
    this.validateTenant(request.tenantPartition);

    // 1. Verify reason is non-empty
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('MISSING_DECISION_REASON: Human authorization decision requires an explicit non-empty justification');
    }

    // 2. Validate human reviewer identity and authority
    this.humanGate.validateReviewer(request, reviewerId, reviewerRole);

    // 3. Revalidate candidate draft and request
    const revalidation = this.revalidationEngine.revalidateCandidateForAuthorization(request);

    // 4. Decision-specific rules
    if (decision === 'AUTHORIZE') {
      if (!revalidation.valid || revalidation.status !== 'VALID') {
        throw new Error(`AUTHORIZATION_REJECTED_BY_REVALIDATION: Candidate draft '${request.candidateDraftId}' failed revalidation with status '${revalidation.status}': ${revalidation.issues.join('; ')}`);
      }
    }

    const now = new Date().toISOString();
    const rawDecisionHash = crypto.createHash('sha256')
      .update(`${request.requestId}:${request.candidateDraftId}:${request.tenantPartition}:${reviewerId}:${decision}:${now}`)
      .digest('hex');
    const decisionId = createAuthorizationDecisionId(`authdec_${rawDecisionHash.substring(0, 16)}`);

    const provenanceHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        decisionId,
        requestId: request.requestId,
        candidateDraftId: request.candidateDraftId,
        tenantPartition: request.tenantPartition,
        reviewerId,
        reviewerRole,
        decision,
        reason,
        previousHash: request.provenanceHeadHash,
      }))
      .digest('hex');

    const result: HumanAuthorizationDecision = Object.freeze({
      decisionId,
      requestId: request.requestId,
      candidateDraftId: request.candidateDraftId,
      evolutionPlanId: request.evolutionPlanId,
      intakeId: request.intakeId,
      tenantPartition: request.tenantPartition,
      reviewerId,
      reviewerRole,
      decision,
      reason,
      decidedAt: now,
      isActivePolicy: false,       // Strictly false: AUTHORIZE != ACTIVE_POLICY
      isPolicyMutation: false,     // Strictly false
      isAutonomousMutation: false, // Strictly false
      provenanceHash,
    });

    return result;
  }
}
