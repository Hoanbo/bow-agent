// src/core/policyStagedActivation/policyStagedActivationRuntime.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Staged Activation Runtime (Component 795).
// Master coordinator orchestrating candidate policy staging, preflight validation,
// explicit human governed activation boundary clearance, atomic active state transition,
// durable isolated persistence, and cryptographic provenance chaining.
//
// Authority Invariants:
// - MASTER_COORDINATOR: Orchestrates governed staged policy activation
// - STAGED_POLICY != ACTIVE_POLICY
// - NO AUTONOMOUS ACTIVATION (HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION)
// - NO AUTONOMOUS PROMOTION
// - NO AUTONOMOUS ROLLBACK
// - NO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING

import path from 'node:path';
import type {
  CandidateAuthorizationRequest,
  HumanAuthorizationDecision,
  ActivationReadinessDecision,
  HumanAuthorizationRole,
} from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type {
  StagedPolicy,
  ActivationPreflightResult,
  GovernedActivationAuthorization,
  ActivePolicyState,
  PolicyStagedActivationOptions,
} from './policyStagedActivationTypes.js';
import { PolicyActivationRevalidationEngine } from './policyActivationRevalidationEngine.js';
import { PolicyStagingEngine } from './policyStagingEngine.js';
import { PolicyActivationPreflightEngine } from './policyActivationPreflightEngine.js';
import { PolicyGovernedActivationBoundary } from './policyGovernedActivationBoundary.js';
import { PolicyActiveStateTransitionEngine } from './policyActiveStateTransitionEngine.js';
import { PolicyActivationStateStore } from './policyActivationStateStore.js';
import { PolicyStagedActivationProvenanceEngine } from './policyStagedActivationProvenanceEngine.js';
import { PolicyStagedActivationAuditEngine } from './policyStagedActivationAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyStagedActivationRuntime {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly revalidationEngine: PolicyActivationRevalidationEngine;
  private readonly stagingEngine: PolicyStagingEngine;
  private readonly preflightEngine: PolicyActivationPreflightEngine;
  private readonly governedBoundary: PolicyGovernedActivationBoundary;
  private readonly transitionEngine: PolicyActiveStateTransitionEngine;
  private readonly stateStore: PolicyActivationStateStore;
  private readonly provenanceEngine: PolicyStagedActivationProvenanceEngine;
  private readonly auditEngine: PolicyStagedActivationAuditEngine;

  constructor(
    options?: PolicyStagedActivationOptions,
    dependencies?: {
      revalidationEngine?: PolicyActivationRevalidationEngine;
      stagingEngine?: PolicyStagingEngine;
      preflightEngine?: PolicyActivationPreflightEngine;
      governedBoundary?: PolicyGovernedActivationBoundary;
      stateStore?: PolicyActivationStateStore;
      provenanceEngine?: PolicyStagedActivationProvenanceEngine;
      auditEngine?: PolicyStagedActivationAuditEngine;
    }
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;

    this.revalidationEngine = dependencies?.revalidationEngine ?? new PolicyActivationRevalidationEngine(options);
    this.stagingEngine = dependencies?.stagingEngine ?? new PolicyStagingEngine(options, this.revalidationEngine);
    this.stateStore = dependencies?.stateStore ?? new PolicyActivationStateStore(options);
    this.preflightEngine = dependencies?.preflightEngine ?? new PolicyActivationPreflightEngine(options, this.stateStore);
    this.governedBoundary = dependencies?.governedBoundary ?? new PolicyGovernedActivationBoundary(options);
    this.transitionEngine = new PolicyActiveStateTransitionEngine(options, this.stateStore);
    this.provenanceEngine = dependencies?.provenanceEngine ?? new PolicyStagedActivationProvenanceEngine(options);
    this.auditEngine = dependencies?.auditEngine ?? new PolicyStagedActivationAuditEngine();
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Staged policy activation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Stages an authorized policy candidate.
   */
  public stagePolicy(params: {
    readonly request: CandidateAuthorizationRequest;
    readonly decision: HumanAuthorizationDecision;
    readonly readiness: ActivationReadinessDecision;
    readonly proposedVersion?: string;
  }): StagedPolicy {
    this.assertUserStopInactive();
    this.validateTenant(params.request.tenantPartition);

    // 1. Stage candidate
    const stagedPolicy = this.stagingEngine.stageCandidate(params);

    // 2. Persist in durable storage
    this.stateStore.saveStagedPolicy(stagedPolicy);

    // 3. Provenance record
    this.provenanceEngine.appendEvent(
      stagedPolicy.tenantPartition,
      stagedPolicy.candidateDraftId,
      'POLICY_STAGED',
      {
        stagedActivationId: stagedPolicy.stagedActivationId,
        authorizationDecisionId: stagedPolicy.authorizationDecisionId,
        activationReadinessId: stagedPolicy.activationReadinessId,
        details: {
          sourcePolicyVersion: stagedPolicy.sourcePolicyVersion,
          proposedPolicyVersion: stagedPolicy.proposedPolicyVersion,
        },
      }
    );

    // 4. Audit record
    this.auditEngine.recordEvent({
      eventType: 'POLICY_STAGED',
      tenantPartition: stagedPolicy.tenantPartition,
      candidateDraftId: stagedPolicy.candidateDraftId,
      stagedActivationId: stagedPolicy.stagedActivationId,
      status: 'STAGED',
      reason: `Policy staged as proposed version ${stagedPolicy.proposedPolicyVersion}`,
    });

    return stagedPolicy;
  }

  /**
   * Runs preflight verification on a staged policy.
   */
  public runPreflight(stagedPolicy: StagedPolicy): ActivationPreflightResult {
    this.assertUserStopInactive();
    this.validateTenant(stagedPolicy.tenantPartition);

    const preflight = this.preflightEngine.runPreflight(stagedPolicy);

    this.provenanceEngine.appendEvent(
      stagedPolicy.tenantPartition,
      stagedPolicy.candidateDraftId,
      'ACTIVATION_PREFLIGHT_EXECUTED',
      {
        stagedActivationId: stagedPolicy.stagedActivationId,
        activationPreflightId: preflight.preflightId,
        details: {
          status: preflight.status,
          checksPassed: preflight.checksPassed,
          blockingReasons: preflight.blockingReasons,
        },
      }
    );

    this.auditEngine.recordEvent({
      eventType: preflight.status === 'READY' ? 'ACTIVATION_PREFLIGHT_PASSED' : 'ACTIVATION_PREFLIGHT_BLOCKED',
      tenantPartition: stagedPolicy.tenantPartition,
      candidateDraftId: stagedPolicy.candidateDraftId,
      stagedActivationId: stagedPolicy.stagedActivationId,
      preflightId: preflight.preflightId,
      status: preflight.status,
      reason: preflight.status === 'READY' ? 'Preflight checks clean' : preflight.blockingReasons.join('; '),
    });

    return preflight;
  }

  /**
   * Evaluates and grants governed human activation clearance.
   */
  public authorizeActivation(params: {
    readonly stagedPolicy: StagedPolicy;
    readonly preflight: ActivationPreflightResult;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly candidateProposer?: string;
  }): GovernedActivationAuthorization {
    this.assertUserStopInactive();
    this.validateTenant(params.stagedPolicy.tenantPartition);

    const auth = this.governedBoundary.authorizeActivation(params);

    this.provenanceEngine.appendEvent(
      params.stagedPolicy.tenantPartition,
      params.stagedPolicy.candidateDraftId,
      'ACTIVATION_BOUNDARY_AUTHORIZED',
      {
        stagedActivationId: params.stagedPolicy.stagedActivationId,
        activationPreflightId: params.preflight.preflightId,
        details: {
          authorizedBy: params.operatorId,
          authorizedRole: params.operatorRole,
          governanceRationale: params.governanceRationale,
        },
      }
    );

    this.auditEngine.recordEvent({
      eventType: 'ACTIVATION_BOUNDARY_EVALUATED',
      tenantPartition: params.stagedPolicy.tenantPartition,
      candidateDraftId: params.stagedPolicy.candidateDraftId,
      stagedActivationId: params.stagedPolicy.stagedActivationId,
      preflightId: params.preflight.preflightId,
      operatorId: params.operatorId,
      operatorRole: params.operatorRole,
      status: 'AUTHORIZED',
      reason: params.governanceRationale,
    });

    return auth;
  }

  /**
   * Commits the governed active state transition from STAGED policy to ACTIVE_POLICY.
   */
  public commitActivation(params: {
    readonly stagedPolicy: StagedPolicy;
    readonly governedAuthorization: GovernedActivationAuthorization;
  }): ActivePolicyState {
    this.assertUserStopInactive();
    this.validateTenant(params.stagedPolicy.tenantPartition);

    const activePolicy = this.transitionEngine.commitActivation(params);

    this.provenanceEngine.appendEvent(
      activePolicy.tenantPartition,
      activePolicy.candidateDraftId,
      'ACTIVATION_COMMITTED',
      {
        stagedActivationId: activePolicy.stagedActivationId,
        activationCommitId: activePolicy.activationCommitId,
        activationPreflightId: activePolicy.preflightId,
        details: {
          activePolicyVersion: activePolicy.activePolicyVersion,
          previousPolicyVersion: activePolicy.previousPolicyVersion,
          activatedBy: activePolicy.activatedBy,
        },
      }
    );

    this.auditEngine.recordEvent({
      eventType: 'ACTIVATION_COMMITTED',
      tenantPartition: activePolicy.tenantPartition,
      candidateDraftId: activePolicy.candidateDraftId,
      stagedActivationId: activePolicy.stagedActivationId,
      activationCommitId: activePolicy.activationCommitId,
      activePolicyStateId: activePolicy.activePolicyStateId,
      operatorId: activePolicy.activatedBy,
      operatorRole: activePolicy.activatedRole,
      status: 'COMMITTED',
      reason: `Policy activated version ${activePolicy.activePolicyVersion} replacing ${activePolicy.previousPolicyVersion}`,
    });

    this.auditEngine.recordEvent({
      eventType: 'ACTIVE_POLICY_CREATED',
      tenantPartition: activePolicy.tenantPartition,
      candidateDraftId: activePolicy.candidateDraftId,
      stagedActivationId: activePolicy.stagedActivationId,
      activePolicyStateId: activePolicy.activePolicyStateId,
      operatorId: activePolicy.activatedBy,
      operatorRole: activePolicy.activatedRole,
      status: 'ACTIVE',
      reason: 'Active policy state committed successfully',
    });

    return activePolicy;
  }

  /**
   * Retrieves a staged policy by candidate draft ID.
   */
  public getStagedPolicy(tenantPartition: string, candidateDraftId: CandidateDraftId): StagedPolicy | null {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.stateStore.getStagedByCandidate(tenantPartition, candidateDraftId);
  }

  /**
   * Retrieves the current active policy state for a tenant.
   */
  public getActivePolicy(tenantPartition: string): ActivePolicyState | null {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.stateStore.getActivePolicy(tenantPartition);
  }

  /**
   * Cryptographically verifies the provenance chain for a candidate activation.
   */
  public verifyProvenance(tenantPartition: string, candidateDraftId: CandidateDraftId): boolean {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.provenanceEngine.verifyChain(tenantPartition, candidateDraftId);
  }
}
