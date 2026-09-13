// src/core/policyActiveRuntime/policyActiveRuntimePDPBridge.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed PDP Active Policy Integration Bridge (Component 801).
// Evaluates tool actions against the synchronized RuntimePolicySnapshot.
// Enforces:
// 1. Absolute USER_STOP supremacy
// 2. Canonical hard-forbidden floor (CANONICAL_HARD_FORBIDDEN_ACTIONS are strictly non-negotiable)
// 3. Governed active policy modifications (tool classifications, custom rules)
// 4. Baseline PDP fallback for uncalibrated tools
//
// Authority Invariants:
// - EVALUATION_GRANTS_ZERO_AUTHORITY: Returns advisory decisions
// - HARD_FORBIDDEN_FLOOR > SNAPSHOT_MODIFICATIONS > BASELINE_PDP
// - ZERO AUTONOMOUS BYPASS
// - USER_STOP > EVERYTHING

import {
  type ActionClassification,
  type PolicyDecision,
  PolicyDecisionPoint,
  globalPDP,
} from '../policyDecisionPoint.js';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
import type {
  RuntimePolicySnapshot,
  RuntimePDPDecision,
  PolicyActiveRuntimeOptions,
} from './policyActiveRuntimeTypes.js';

export class PolicyActiveRuntimePDPBridge {
  private readonly pdp: PolicyDecisionPoint;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveRuntimeOptions, pdp?: PolicyDecisionPoint) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.pdp = pdp ?? globalPDP;
  }

  private assertUserStopInactive(): void {
    if (
      (this.isUserStopActiveFn && this.isUserStopActiveFn()) ||
      this.pdp.isEmergencyStopped()
    ) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: PDP active policy evaluation suspended by USER_STOP supremacy');
    }
  }

  /**
   * Evaluates a proposed tool action against the active runtime policy snapshot.
   */
  public evaluateActionAgainstSnapshot(
    action: string,
    snapshot: RuntimePolicySnapshot,
    args?: Record<string, any>,
    actor?: { userId?: string; role?: string; channel?: string; isOwner?: boolean }
  ): RuntimePDPDecision {
    this.assertUserStopInactive();

    const evaluatedAt = new Date().toISOString();

    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      return {
        action: action || 'empty_action',
        allowed: false,
        classification: 'FORBIDDEN',
        requiresApproval: false,
        reason: 'INVALID_ACTION: Action name must be a non-empty string.',
        snapshotId: snapshot.snapshotId,
        tenantPartition: snapshot.tenantPartition,
        evaluatedAt,
      };
    }

    const cleanAction = action.trim();

    // 1. HARD-FORBIDDEN FLOOR: Absolute non-negotiable rejection
    if (CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(cleanAction)) {
      return {
        action: cleanAction,
        allowed: false,
        classification: 'FORBIDDEN',
        requiresApproval: false,
        reason: `HARD_FORBIDDEN_ACTION_BLOCKED: Action '${cleanAction}' belongs to canonical hard-forbidden safety floor.`,
        snapshotId: snapshot.snapshotId,
        tenantPartition: snapshot.tenantPartition,
        evaluatedAt,
      };
    }

    // 2. CHECK SNAPSHOT GOVERNED CLASSIFICATION
    const snapshotClassification = snapshot.toolClassifications[cleanAction];
    if (snapshotClassification) {
      if (snapshotClassification === 'FORBIDDEN') {
        return {
          action: cleanAction,
          allowed: false,
          classification: 'FORBIDDEN',
          requiresApproval: false,
          reason: `ACTIVE_POLICY_FORBIDDEN: Action '${cleanAction}' is classified as FORBIDDEN by active policy ${snapshot.policyVersion}.`,
          snapshotId: snapshot.snapshotId,
          tenantPartition: snapshot.tenantPartition,
          evaluatedAt,
        };
      }

      if (snapshotClassification === 'HIGH_IMPACT') {
        return {
          action: cleanAction,
          allowed: false, // Requires single-use approval token before execution
          classification: 'HIGH_IMPACT',
          requiresApproval: true,
          reason: `ACTIVE_POLICY_HIGH_IMPACT: Action '${cleanAction}' requires explicit human approval under active policy ${snapshot.policyVersion}.`,
          snapshotId: snapshot.snapshotId,
          tenantPartition: snapshot.tenantPartition,
          evaluatedAt,
        };
      }

      if (snapshotClassification === 'REVERSIBLE' || snapshotClassification === 'OBSERVE' || snapshotClassification === 'RECOMMEND') {
        return {
          action: cleanAction,
          allowed: true,
          classification: snapshotClassification,
          requiresApproval: false,
          reason: `ACTIVE_POLICY_PERMITTED: Action '${cleanAction}' is permitted as ${snapshotClassification} under active policy ${snapshot.policyVersion}.`,
          snapshotId: snapshot.snapshotId,
          tenantPartition: snapshot.tenantPartition,
          evaluatedAt,
        };
      }
    }

    // 3. BASELINE PDP EVALUATION (for tools not explicitly calibrated in the snapshot)
    const baselineDecision: PolicyDecision = this.pdp.evaluate({
      toolName: cleanAction,
      args: args || {},
      actor: actor || { userId: snapshot.tenantPartition, role: 'user' },
    });

    return {
      action: cleanAction,
      allowed: baselineDecision.allowed,
      classification: baselineDecision.classification,
      requiresApproval: baselineDecision.requiresApproval,
      reason: `BASELINE_PDP_EVALUATION: ${baselineDecision.reason}`,
      snapshotId: snapshot.snapshotId,
      tenantPartition: snapshot.tenantPartition,
      evaluatedAt,
    };
  }
}
