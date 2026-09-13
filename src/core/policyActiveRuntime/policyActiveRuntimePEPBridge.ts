// src/core/policyActiveRuntime/policyActiveRuntimePEPBridge.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed PEP Active Policy Enforcement Bridge (Component 802).
// Sits directly at the capability execution gate, applying the PDP decision
// derived from the synchronized RuntimePolicySnapshot.
// Enforces:
// 1. Absolute USER_STOP supremacy
// 2. Token-gated execution for HIGH_IMPACT actions via ApprovalService
// 3. Fail-closed rejection of FORBIDDEN actions
// 4. ZERO direct tool execution or PEP bypass
//
// Authority Invariants:
// - ENFORCEMENT_GATES_EXECUTION_ONLY: Does NOT execute tools directly
// - ZERO AUTONOMOUS TOKEN ISSUANCE
// - ZERO AUTONOMOUS APPROVAL
// - USER_STOP > EVERYTHING

import {
  ApprovalService,
  globalApprovalService,
} from '../approvalService.js';
import type {
  RuntimePolicySnapshot,
  RuntimePEPEnforcementResult,
  RuntimeEnforcementDisposition,
  PolicyActiveRuntimeOptions,
} from './policyActiveRuntimeTypes.js';
import { createRuntimePolicyEnforcementId } from './policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimePDPBridge } from './policyActiveRuntimePDPBridge.js';

export class PolicyActiveRuntimePEPBridge {
  private readonly pdpBridge: PolicyActiveRuntimePDPBridge;
  private readonly approvalService: ApprovalService;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveRuntimeOptions,
    pdpBridge?: PolicyActiveRuntimePDPBridge,
    approvalService?: ApprovalService
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.pdpBridge = pdpBridge ?? new PolicyActiveRuntimePDPBridge(options);
    this.approvalService = approvalService ?? globalApprovalService;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: PEP active policy enforcement suspended by USER_STOP supremacy');
    }
  }

  /**
   * Enforces policy boundaries prior to execution.
   * If action is HIGH_IMPACT, verifies valid single-use execution token.
   */
  public enforceBeforeExecution(
    action: string,
    snapshot: RuntimePolicySnapshot,
    args?: Record<string, any>,
    executionToken?: string,
    actorUserId?: string
  ): RuntimePEPEnforcementResult {
    this.assertUserStopInactive();

    const enforcementId = createRuntimePolicyEnforcementId(
      `rpenf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );
    const enforcedAt = new Date().toISOString();

    // 1. Evaluate PDP decision against active snapshot
    const pdpDecision = this.pdpBridge.evaluateActionAgainstSnapshot(action, snapshot, args, {
      userId: actorUserId || snapshot.tenantPartition,
      role: 'user',
    });

    // 2. Check for FORBIDDEN
    if (pdpDecision.classification === 'FORBIDDEN') {
      return {
        enforcementId,
        action,
        disposition: 'FORBIDDEN',
        decision: pdpDecision,
        tenantPartition: snapshot.tenantPartition,
        enforcedAt,
      };
    }

    // 3. Check for HIGH_IMPACT (requires valid, unexpired, single-use token)
    if (pdpDecision.requiresApproval || pdpDecision.classification === 'HIGH_IMPACT') {
      if (!executionToken || typeof executionToken !== 'string' || executionToken.trim().length === 0) {
        return {
          enforcementId,
          action,
          disposition: 'REQUIRES_APPROVAL',
          decision: pdpDecision,
          tenantPartition: snapshot.tenantPartition,
          enforcedAt,
        };
      }

      // Verify and consume token via ApprovalService
      const effectiveUser = actorUserId || snapshot.tenantPartition;
      const tokenValid = this.approvalService.consumeToken(executionToken.trim(), effectiveUser);
      if (!tokenValid) {
        return {
          enforcementId,
          action,
          disposition: 'DENY',
          decision: {
            ...pdpDecision,
            allowed: false,
            reason: 'TOKEN_CONSUMPTION_FAILED: Invalid, expired, or already-consumed execution token.',
          },
          tenantPartition: snapshot.tenantPartition,
          enforcedAt,
        };
      }

      // Token successfully verified and consumed
      return {
        enforcementId,
        action,
        disposition: 'PERMIT',
        decision: {
          ...pdpDecision,
          allowed: true,
          reason: 'TOKEN_VERIFIED: Explicit human approval token verified and consumed.',
        },
        tenantPartition: snapshot.tenantPartition,
        approvalId: executionToken.trim(),
        enforcedAt,
      };
    }

    // 4. Standard PERMIT or DENY based on PDP decision
    const disposition: RuntimeEnforcementDisposition = pdpDecision.allowed ? 'PERMIT' : 'DENY';
    return {
      enforcementId,
      action,
      disposition,
      decision: pdpDecision,
      tenantPartition: snapshot.tenantPartition,
      enforcedAt,
    };
  }
}
