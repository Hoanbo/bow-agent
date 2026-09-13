// src/core/policyCandidateAuthorization/policyCandidateAuthorizationRuntime.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Candidate Authorization Runtime (Component 784).
// Master coordinator orchestrating candidate authorization requests, independent revalidation,
// explicit human review decision submission, activation readiness evaluation, durable isolated storage,
// and append-only cryptographic provenance chaining.
//
// Authority Invariants:
// - MASTER_COORDINATOR: Orchestrates candidate authorization and readiness evaluation
// - CANDIDATE_DRAFT != ACTIVE_POLICY
// - AUTHORIZE != ACTIVE_POLICY
// - READY_FOR_ACTIVATION != ACTIVATED
// - NO_AUTONOMOUS_AUTHORIZATION (HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION)
// - NO AUTONOMOUS ACTIVATION
// - NO AUTONOMOUS PROMOTION
// - NO AUTONOMOUS ROLLBACK
// - NO DIRECT POLICY MUTATION
// - NO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  CandidateDraft,
  CandidateValidationResult,
  CandidateDraftId,
} from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type {
  CandidateAuthorizationRequest,
  HumanAuthorizationDecision,
  ActivationReadinessDecision,
  CandidateAuthorizationResult,
  CandidateAuthorizationRevalidationResult,
  CandidateAuthorizationDecisionType,
  HumanAuthorizationRole,
  CandidateAuthorizationAction,
  PolicyCandidateAuthorizationOptions,
} from './policyCandidateAuthorizationTypes.js';
import { createAuthorizationRequestId } from './policyCandidateAuthorizationTypes.js';
import { PolicyCandidateAuthorizationRevalidationEngine } from './policyCandidateAuthorizationRevalidationEngine.js';
import { PolicyHumanAuthorizationGate } from './policyHumanAuthorizationGate.js';
import { PolicyCandidateAuthorizationEngine } from './policyCandidateAuthorizationEngine.js';
import { PolicyActivationReadinessEngine } from './policyActivationReadinessEngine.js';
import { PolicyAuthorizationDecisionStore } from './policyAuthorizationDecisionStore.js';
import { PolicyAuthorizationProvenanceEngine } from './policyAuthorizationProvenanceEngine.js';
import { PolicyCandidateAuthorizationAuditEngine } from './policyCandidateAuthorizationAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyCandidateAuthorizationRuntime {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly revalidationEngine: PolicyCandidateAuthorizationRevalidationEngine;
  private readonly humanGate: PolicyHumanAuthorizationGate;
  private readonly authorizationEngine: PolicyCandidateAuthorizationEngine;
  private readonly readinessEngine: PolicyActivationReadinessEngine;
  private readonly decisionStore: PolicyAuthorizationDecisionStore;
  private readonly provenanceEngine: PolicyAuthorizationProvenanceEngine;
  private readonly auditEngine: PolicyCandidateAuthorizationAuditEngine;

  constructor(
    options?: PolicyCandidateAuthorizationOptions,
    dependencies?: {
      revalidationEngine?: PolicyCandidateAuthorizationRevalidationEngine;
      humanGate?: PolicyHumanAuthorizationGate;
      authorizationEngine?: PolicyCandidateAuthorizationEngine;
      readinessEngine?: PolicyActivationReadinessEngine;
      decisionStore?: PolicyAuthorizationDecisionStore;
      provenanceEngine?: PolicyAuthorizationProvenanceEngine;
      auditEngine?: PolicyCandidateAuthorizationAuditEngine;
    }
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;

    this.revalidationEngine = dependencies?.revalidationEngine ?? new PolicyCandidateAuthorizationRevalidationEngine(options);
    this.humanGate = dependencies?.humanGate ?? new PolicyHumanAuthorizationGate(options);
    this.authorizationEngine = dependencies?.authorizationEngine ?? new PolicyCandidateAuthorizationEngine(
      options,
      this.revalidationEngine,
      this.humanGate
    );
    this.readinessEngine = dependencies?.readinessEngine ?? new PolicyActivationReadinessEngine(
      options,
      this.revalidationEngine
    );
    this.decisionStore = dependencies?.decisionStore ?? new PolicyAuthorizationDecisionStore(options);
    this.provenanceEngine = dependencies?.provenanceEngine ?? new PolicyAuthorizationProvenanceEngine(options);
    this.auditEngine = dependencies?.auditEngine ?? new PolicyCandidateAuthorizationAuditEngine();
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy candidate authorization suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Constructs and registers a CandidateAuthorizationRequest for human governance.
   */
  public requestAuthorization(params: {
    readonly candidateDraft: CandidateDraft;
    readonly candidateValidation: CandidateValidationResult;
    readonly requestedBy: string;
    readonly requestedAction?: CandidateAuthorizationAction;
    readonly rationale?: string;
    readonly requiredRole?: HumanAuthorizationRole;
    readonly ttlMs?: number;
  }): CandidateAuthorizationRequest {
    this.assertUserStopInactive();
    this.validateTenant(params.candidateDraft.tenantPartition);

    // Validate requestedBy is human identity
    this.humanGate.assertHumanIdentity(params.requestedBy);

    const now = Date.now();
    const ttl = params.ttlMs ?? 86400000; // 24 hours
    const expiresAt = new Date(now + ttl).toISOString();
    const createdAt = new Date(now).toISOString();

    const rawIdHash = crypto.createHash('sha256')
      .update(`${params.candidateDraft.candidateDraftId}:${params.candidateDraft.tenantPartition}:${params.requestedBy}:${createdAt}`)
      .digest('hex');
    const requestId = createAuthorizationRequestId(`authreq_${rawIdHash.substring(0, 16)}`);

    const request: CandidateAuthorizationRequest = Object.freeze({
      requestId,
      candidateDraftId: params.candidateDraft.candidateDraftId,
      evolutionPlanId: params.candidateDraft.evolutionPlanId,
      intakeId: params.candidateDraft.intakeId,
      tenantPartition: params.candidateDraft.tenantPartition,
      sourcePolicyVersion: params.candidateDraft.sourcePolicyVersion,
      targetPolicyDomain: 'OPERATIONAL_GOVERNANCE',
      requestedAction: params.requestedAction ?? 'AUTHORIZE_FOR_ACTIVATION',
      requestedBy: params.requestedBy,
      rationale: params.rationale ?? params.candidateDraft.rationale ?? 'Requesting human candidate authorization',
      requiredRole: params.requiredRole ?? 'MASTER_HUMAN_OPERATOR',
      candidateDraft: params.candidateDraft,
      candidateValidation: params.candidateValidation,
      provenanceHeadHash: params.candidateDraft.provenanceHeadHash ?? crypto.createHash('sha256').update(params.candidateDraft.candidateDraftId).digest('hex'),
      createdAt,
      expiresAt,
    });

    // Provenance event
    this.provenanceEngine.appendEvent(
      request.tenantPartition,
      request.candidateDraftId,
      request.evolutionPlanId,
      'CANDIDATE_AUTHORIZATION_REQUESTED',
      {
        authorizationRequestId: request.requestId,
        details: {
          requestedBy: request.requestedBy,
          requiredRole: request.requiredRole,
          expiresAt: request.expiresAt,
        },
      }
    );

    // Audit event
    this.auditEngine.recordEvent({
      eventType: 'CANDIDATE_AUTHORIZATION_REQUESTED',
      tenantPartition: request.tenantPartition,
      candidateDraftId: request.candidateDraftId,
      evolutionPlanId: request.evolutionPlanId,
      authorizationRequestId: request.requestId,
      reviewerId: request.requestedBy,
      reason: request.rationale,
    });

    return request;
  }

  /**
   * Independently revalidates a candidate authorization request.
   */
  public revalidateAuthorization(
    request: CandidateAuthorizationRequest
  ): CandidateAuthorizationRevalidationResult {
    this.assertUserStopInactive();
    this.validateTenant(request.tenantPartition);

    const result = this.revalidationEngine.revalidateCandidateForAuthorization(request);

    this.auditEngine.recordEvent({
      eventType: 'CANDIDATE_AUTHORIZATION_REVALIDATED',
      tenantPartition: request.tenantPartition,
      candidateDraftId: request.candidateDraftId,
      evolutionPlanId: request.evolutionPlanId,
      authorizationRequestId: request.requestId,
      status: result.status,
      reason: result.valid ? 'Revalidation clean' : result.issues.join('; '),
    });

    return result;
  }

  /**
   * Submits an explicit human authorization decision, evaluates activation readiness,
   * commits durable state, and registers cryptographic provenance.
   */
  public submitHumanDecision(params: {
    readonly request: CandidateAuthorizationRequest;
    readonly reviewerId: string;
    readonly reviewerRole: HumanAuthorizationRole;
    readonly decision: CandidateAuthorizationDecisionType;
    readonly reason: string;
  }): CandidateAuthorizationResult {
    this.assertUserStopInactive();
    this.validateTenant(params.request.tenantPartition);

    // 1. Authorize candidate
    const decision = this.authorizationEngine.authorizeCandidate(
      params.request,
      params.reviewerId,
      params.reviewerRole,
      params.decision,
      params.reason
    );

    // 2. Persist decision with idempotency and replay guards
    const savedDecision = this.decisionStore.saveDecision(decision);

    // 3. Evaluate activation readiness
    const readiness = this.readinessEngine.evaluateReadiness(params.request, savedDecision);

    // 4. Persist readiness
    const savedReadiness = this.decisionStore.saveReadiness(readiness);

    // 5. Append provenance events
    this.provenanceEngine.appendEvent(
      params.request.tenantPartition,
      params.request.candidateDraftId,
      params.request.evolutionPlanId,
      'HUMAN_AUTHORIZATION_DECIDED',
      {
        authorizationRequestId: params.request.requestId,
        authorizationDecisionId: savedDecision.decisionId,
        details: {
          reviewerId: params.reviewerId,
          reviewerRole: params.reviewerRole,
          decision: params.decision,
          reason: params.reason,
        },
      }
    );

    this.provenanceEngine.appendEvent(
      params.request.tenantPartition,
      params.request.candidateDraftId,
      params.request.evolutionPlanId,
      'ACTIVATION_READINESS_EVALUATED',
      {
        authorizationRequestId: params.request.requestId,
        authorizationDecisionId: savedDecision.decisionId,
        activationReadinessId: savedReadiness.readinessId,
        details: {
          state: savedReadiness.state,
          prerequisitesSatisfied: savedReadiness.prerequisitesSatisfied,
          blockingReasons: savedReadiness.blockingReasons,
        },
      }
    );

    const provenanceHash = this.provenanceEngine.getProvenanceHead(
      params.request.tenantPartition,
      params.request.candidateDraftId
    );

    // 6. Audit event
    const auditEvent = params.decision === 'AUTHORIZE'
      ? 'CANDIDATE_AUTHORIZED'
      : params.decision === 'REJECT'
        ? 'CANDIDATE_REJECTED'
        : params.decision === 'DEFER'
          ? 'CANDIDATE_DEFERRED'
          : params.decision === 'REQUEST_MORE_EVIDENCE'
            ? 'CANDIDATE_MORE_EVIDENCE_REQUESTED'
            : 'CANDIDATE_CANCELLED';

    this.auditEngine.recordEvent({
      eventType: auditEvent,
      tenantPartition: params.request.tenantPartition,
      candidateDraftId: params.request.candidateDraftId,
      evolutionPlanId: params.request.evolutionPlanId,
      authorizationRequestId: params.request.requestId,
      authorizationDecisionId: savedDecision.decisionId,
      activationReadinessId: savedReadiness.readinessId,
      reviewerId: params.reviewerId,
      reviewerRole: params.reviewerRole,
      decision: params.decision,
      readinessState: savedReadiness.state,
      reason: params.reason,
    });

    if (savedReadiness.state === 'READY_FOR_ACTIVATION') {
      this.auditEngine.recordEvent({
        eventType: 'ACTIVATION_READINESS_CONFIRMED',
        tenantPartition: params.request.tenantPartition,
        candidateDraftId: params.request.candidateDraftId,
        evolutionPlanId: params.request.evolutionPlanId,
        authorizationDecisionId: savedDecision.decisionId,
        activationReadinessId: savedReadiness.readinessId,
        readinessState: savedReadiness.state,
        reason: 'All activation readiness prerequisites positively verified',
      });
    }

    return Object.freeze({
      request: params.request,
      decision: savedDecision,
      readiness: savedReadiness,
      provenanceHash,
    });
  }

  /**
   * Retrieves an authorization decision by candidate draft ID.
   */
  public getAuthorizationDecision(
    tenantPartition: string,
    candidateDraftId: CandidateDraftId
  ): HumanAuthorizationDecision | null {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.decisionStore.getDecisionByCandidate(tenantPartition, candidateDraftId);
  }

  /**
   * Retrieves activation readiness by candidate draft ID.
   */
  public getActivationReadiness(
    tenantPartition: string,
    candidateDraftId: CandidateDraftId
  ): ActivationReadinessDecision | null {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.decisionStore.getReadinessByCandidate(tenantPartition, candidateDraftId);
  }

  /**
   * Verifies the cryptographic provenance chain for a candidate authorization.
   */
  public verifyAuthorizationProvenance(
    tenantPartition: string,
    candidateDraftId: CandidateDraftId
  ): boolean {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.provenanceEngine.verifyChain(tenantPartition, candidateDraftId);
  }
}
