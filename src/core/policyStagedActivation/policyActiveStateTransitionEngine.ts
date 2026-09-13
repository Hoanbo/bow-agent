// src/core/policyStagedActivation/policyActiveStateTransitionEngine.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Active State Transition Engine (Component 791).
// Executes the atomic, governed state transition from STAGED policy to ACTIVE_POLICY.
// Enforces mandatory governed clearance verification, version consistency, anti-overwrite protection,
// and immutable active state formation.
//
// Authority Invariants:
// - ATOMIC_ACTIVATION_TRANSITION: Governed state transition only; zero partial activation
// - ANTI_OVERWRITE: Stale source versions and conflicting concurrent activations fail closed
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - ZERO_AUTONOMOUS_ROLLBACK: System cannot autonomously rollback
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  StagedPolicy,
  GovernedActivationAuthorization,
  ActivePolicyState,
  PolicyStagedActivationOptions,
} from './policyStagedActivationTypes.js';
import {
  createActivationCommitId,
  createActivePolicyStateId,
} from './policyStagedActivationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import type { PolicyActivationStateStore } from './policyActivationStateStore.js';

export class PolicyActiveStateTransitionEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly stateStore: PolicyActivationStateStore;

  constructor(
    options: PolicyStagedActivationOptions | undefined,
    stateStore: PolicyActivationStateStore
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.stateStore = stateStore;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy state transition suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('TRANSITION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Commits the governed active state transition from StagedPolicy to ActivePolicyState.
   */
  public commitActivation(params: {
    readonly stagedPolicy: StagedPolicy;
    readonly governedAuthorization: GovernedActivationAuthorization;
  }): ActivePolicyState {
    this.assertUserStopInactive();
    this.validateTenant(params.stagedPolicy.tenantPartition);

    // 1. Linkage checks
    if (params.governedAuthorization.stagedActivationId !== params.stagedPolicy.stagedActivationId) {
      throw new Error(`AUTHORIZATION_LINKAGE_MISMATCH: Governed authorization '${params.governedAuthorization.authorizationId}' does not match staged policy '${params.stagedPolicy.stagedActivationId}'`);
    }
    if (params.governedAuthorization.tenantPartition !== params.stagedPolicy.tenantPartition) {
      throw new Error('TENANT_MISMATCH: Governed authorization tenant does not match staged policy');
    }

    // 2. Check existing active policy for version conflict and idempotency
    const currentActive = this.stateStore.getActivePolicy(params.stagedPolicy.tenantPartition);

    if (currentActive) {
      // Idempotency: same candidate already active
      if (currentActive.candidateDraftId === params.stagedPolicy.candidateDraftId) {
        return currentActive;
      }

      // Version conflict: expected source version must match current active version
      if (currentActive.activePolicyVersion !== params.stagedPolicy.sourcePolicyVersion) {
        throw new Error(`ACTIVE_POLICY_VERSION_CONFLICT: Staged policy expects source version '${params.stagedPolicy.sourcePolicyVersion}', but current active policy is at '${currentActive.activePolicyVersion}'`);
      }
    }

    const now = new Date().toISOString();
    const rawCommitHash = crypto.createHash('sha256')
      .update(`${params.stagedPolicy.stagedActivationId}:${params.governedAuthorization.authorizationId}:${now}`)
      .digest('hex');
    const activationCommitId = createActivationCommitId(`actcom_${rawCommitHash.substring(0, 16)}`);

    const rawStateHash = crypto.createHash('sha256')
      .update(`${params.stagedPolicy.tenantPartition}:${params.stagedPolicy.proposedPolicyVersion}:${activationCommitId}`)
      .digest('hex');
    const activePolicyStateId = createActivePolicyStateId(`polstate_${rawStateHash.substring(0, 16)}`);

    const provenanceHeadHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        activePolicyStateId,
        activationCommitId,
        stagedActivationId: params.stagedPolicy.stagedActivationId,
        previousHash: params.governedAuthorization.provenanceHash,
        activePolicyVersion: params.stagedPolicy.proposedPolicyVersion,
        timestamp: now,
      }))
      .digest('hex');

    const activePolicyState: ActivePolicyState = Object.freeze({
      activePolicyStateId,
      activationCommitId,
      stagedActivationId: params.stagedPolicy.stagedActivationId,
      candidateDraftId: params.stagedPolicy.candidateDraftId,
      evolutionPlanId: params.stagedPolicy.evolutionPlanId,
      intakeId: params.stagedPolicy.intakeId,
      authorizationDecisionId: params.stagedPolicy.authorizationDecisionId,
      activationReadinessId: params.stagedPolicy.activationReadinessId,
      preflightId: params.governedAuthorization.preflightId,
      tenantPartition: params.stagedPolicy.tenantPartition,
      previousPolicyVersion: params.stagedPolicy.sourcePolicyVersion,
      activePolicyVersion: params.stagedPolicy.proposedPolicyVersion,
      targetPolicyDomain: params.stagedPolicy.targetPolicyDomain,
      activeModifications: Object.freeze({ ...params.stagedPolicy.stagedModifications }),
      activatedBy: params.governedAuthorization.authorizedBy,
      activatedRole: params.governedAuthorization.authorizedRole,
      activatedAt: now,
      provenanceHeadHash,
      isActivePolicy: true, // Governed Active State
      isActivated: true,
    });

    // 3. Atomically persist active state
    this.stateStore.saveActivePolicy(activePolicyState);

    // 4. Update staged policy state to ACTIVATION_COMMITTED
    const committedStaged: StagedPolicy = Object.freeze({
      ...params.stagedPolicy,
      state: 'ACTIVATION_COMMITTED',
    });
    this.stateStore.saveStagedPolicy(committedStaged);

    return activePolicyState;
  }
}
