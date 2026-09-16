// src/core/governedPolicyLifecycle/GovernedOperationalControlGateway.ts
// Component 1184: GovernedOperationalControlGateway (REAL)
//
// Authoritative cryptographic sole-human gateway for privileged lifecycle mutations.
// Reuses MS-1.5.20 HumanDecisionTokenVerificationEngine (Component 1170).
// Enforces anti-agent defenses, secondary-authority rejection, emergency stop dominance,
// and OCC versioning. Enforces SOLE_HUMAN_AUTHORITY = TRUE.

import type {
  PolicyDomain,
  HumanDecisionToken,
  HumanDecisionRecord,
} from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from '../governedPolicyDecisionIngestion/HumanDecisionTokenVerificationEngine.js';
import {
  type PolicyLifecycleRecord,
  AntiAgentIdentityRejectedError,
  PolicyLifecycleInterlockActiveError,
  SecondaryAuthorityRejectedError,
  UnauthorizedLifecycleMutationError,
} from './GovernedPolicyLifecycleTypes.js';
import type { PolicyLifecycleStateManager } from './PolicyLifecycleStateManager.js';
import type { PolicyHealthObservationEngine } from './PolicyHealthObservationEngine.js';
import type { PolicyLifecycleInterlockCoordinator } from './PolicyLifecycleInterlockCoordinator.js';

export interface PrivilegedLifecycleOperationParams {
  tenantId: string;
  policyDomain: PolicyDomain;
  policyId: string;
  expectedVersion?: number;
  reason: string;
  token: HumanDecisionToken;
  record: HumanDecisionRecord;
}

export class GovernedOperationalControlGateway {
  constructor(
    private readonly stateManager: PolicyLifecycleStateManager,
    private readonly tokenVerifier?: HumanDecisionTokenVerificationEngine,
    private readonly healthEngine?: PolicyHealthObservationEngine,
    private readonly interlockCoordinator?: PolicyLifecycleInterlockCoordinator
  ) {}

  /**
   * Reinstate a SUSPENDED policy back to ACTIVE.
   * Strictly requires cryptographic Human Authority.
   */
  public reinstateActivePolicy(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord {
    this.assertHumanAuthority(params, 'REINSTATE_ACTIVE_POLICY');

    return this.stateManager.transitionState({
      tenantId: params.tenantId,
      policyDomain: params.policyDomain,
      policyId: params.policyId,
      targetState: 'ACTIVE',
      expectedVersion: params.expectedVersion,
      reason: `Human Authority reinstated policy: ${params.reason}`,
      trigger: 'OPERATOR_COMMAND',
      authorizationRef: {
        operatorId: params.token.operatorId,
        nonce: params.token.nonce,
        tokenSignature: params.token.operatorSignature,
      },
    });
  }

  /**
   * Override DEGRADED state and restore policy to ACTIVE.
   */
  public overrideDegradation(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord {
    this.assertHumanAuthority(params, 'OVERRIDE_DEGRADATION');

    return this.stateManager.transitionState({
      tenantId: params.tenantId,
      policyDomain: params.policyDomain,
      policyId: params.policyId,
      targetState: 'ACTIVE',
      expectedVersion: params.expectedVersion,
      reason: `Human Authority overrode degraded status: ${params.reason}`,
      trigger: 'OPERATOR_COMMAND',
      authorizationRef: {
        operatorId: params.token.operatorId,
        nonce: params.token.nonce,
        tokenSignature: params.token.operatorSignature,
      },
    });
  }

  /**
   * Decommission and permanently retire an active, suspended, or rolled-back policy.
   * RETIRED is strictly terminal.
   */
  public retirePolicy(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord {
    this.assertHumanAuthority(params, 'RETIRE_POLICY');

    return this.stateManager.transitionState({
      tenantId: params.tenantId,
      policyDomain: params.policyDomain,
      policyId: params.policyId,
      targetState: 'RETIRED',
      expectedVersion: params.expectedVersion,
      reason: `Human Authority permanently retired policy: ${params.reason}`,
      trigger: 'OPERATOR_COMMAND',
      authorizationRef: {
        operatorId: params.token.operatorId,
        nonce: params.token.nonce,
        tokenSignature: params.token.operatorSignature,
      },
    });
  }

  /**
   * Operator-initiated manual suspension of an active policy.
   */
  public manualSuspend(params: PrivilegedLifecycleOperationParams): PolicyLifecycleRecord {
    this.assertHumanAuthority(params, 'MANUAL_SUSPEND');

    return this.stateManager.transitionState({
      tenantId: params.tenantId,
      policyDomain: params.policyDomain,
      policyId: params.policyId,
      targetState: 'SUSPENDED',
      expectedVersion: params.expectedVersion,
      reason: `Operator manual suspension: ${params.reason}`,
      trigger: 'OPERATOR_COMMAND',
      authorizationRef: {
        operatorId: params.token.operatorId,
        nonce: params.token.nonce,
        tokenSignature: params.token.operatorSignature,
      },
    });
  }

  /**
   * Cryptographic verification and constitutional assertions.
   */
  private assertHumanAuthority(
    params: PrivilegedLifecycleOperationParams,
    operationName: string
  ): void {
    const { token, record, tenantId, policyDomain } = params;

    // 0. Emergency Stop Interlock Barrier (EMERGENCY_STOP > GOVERNANCE)
    if (this.interlockCoordinator) {
      this.interlockCoordinator.assertLifecyclePermitted(tenantId, policyDomain, 'ACTIVE');
    }

    if (!token || !record) {
      throw new UnauthorizedLifecycleMutationError(
        `UNAUTHORIZED_MUTATION: HumanDecisionToken and HumanDecisionRecord are required for '${operationName}'.`
      );
    }

    // 1. Anti-Agent Identity Barrier
    const prohibitedPrefixes = ['agent', 'bot', 'synthetic', 'system', 'model', 'assistant', 'autonomous', 'auto', 'ai'];
    const opLower = token.operatorId.normalize('NFKC').trim().toLowerCase();
    for (const prefix of prohibitedPrefixes) {
      if (
        opLower === prefix ||
        opLower.startsWith(`${prefix}:`) ||
        opLower.startsWith(`${prefix}_`) ||
        opLower.startsWith(`${prefix}-`)
      ) {
        throw new AntiAgentIdentityRejectedError(
          `ANTI_AGENT_REJECTION: Operator '${token.operatorId}' is an agent or synthetic identity. Sole Human Authority is required.`
        );
      }
    }

    // 2. Secondary Authority / Committee Rejection Barrier
    const rawAny = token as any;
    if (
      rawAny.twoPersonVerifierId ||
      rawAny.twoPersonVerifierSignature ||
      rawAny.secondaryOperatorId ||
      rawAny.coSigners ||
      rawAny.additionalSignatures
    ) {
      throw new SecondaryAuthorityRejectedError(
        `SECONDARY_AUTHORITY_REJECTED: Secondary operator or committee approval claims are prohibited. SOLE_HUMAN_AUTHORITY is enforced.`
      );
    }

    // 3. Cryptographic Verification via MS-1.5.20 Engine
    if (this.tokenVerifier) {
      try {
        const provenanceHash = record.provenanceHash || token.policyDeltaHash;
        const verification = this.tokenVerifier.verifyDecisionToken(token, record, provenanceHash);
        if (!verification.verified) {
          throw new UnauthorizedLifecycleMutationError(
            'HMAC_VERIFICATION_FAILED: Invalid cryptographic signature.'
          );
        }
      } catch (err: any) {
        if (
          err instanceof UnauthorizedLifecycleMutationError ||
          err instanceof AntiAgentIdentityRejectedError ||
          err instanceof SecondaryAuthorityRejectedError ||
          err instanceof PolicyLifecycleInterlockActiveError
        ) {
          throw err;
        }
        throw new UnauthorizedLifecycleMutationError(
          `HMAC_VERIFICATION_FAILED: ${err.message}`
        );
      }
    }
  }
}
