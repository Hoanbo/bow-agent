// src/core/supervisor/supervisorRecoveryPolicy.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Supervisory Recovery Policy & PDP Gatekeeper.
//
// INVARIANTS:
// DIAGNOSIS != AUTHORIZATION
// CONFIDENCE != AUTHORIZATION
// High diagnosis confidence (e.g. 0.99) NEVER grants automatic authorization.

import type { RecoveryPlan } from './supervisorTypes.js';

export interface SupervisorPolicyDecision {
  readonly allowed: boolean;
  readonly requiresHumanGate: boolean;
  readonly reason: string;
}

export class SupervisorRecoveryPolicy {
  public evaluate(plan: RecoveryPlan, target?: string): SupervisorPolicyDecision {
    // 1. Absolute Protected Workspace Invariant
    if (target && target.toLowerCase().includes('shopofbow')) {
      return {
        allowed: false,
        requiresHumanGate: false,
        reason: 'DENIED: Protected workspace C:\\BOW\\shopofbow is strictly forbidden.',
      };
    }

    // 2. Critical Blocked or Inconclusive
    if (plan.recoveryClass === 'CRITICAL_BLOCKED' || plan.recoveryClass === 'UNRECOVERABLE') {
      return {
        allowed: false,
        requiresHumanGate: true,
        reason: 'CRITICAL_BLOCKED: Recovery cannot proceed autonomously.',
      };
    }

    // 3. Human Gate Required
    if (plan.requiresHumanApproval || plan.recoveryClass === 'HUMAN_REQUIRED') {
      return {
        allowed: false,
        requiresHumanGate: true,
        reason: 'HUMAN_GATE_REQUIRED: Plan involves elevated or high-impact mutations.',
      };
    }

    // 4. Safe Autonomous Execution Allowed
    return {
      allowed: true,
      requiresHumanGate: false,
      reason: 'AUTO_SAFE_ALLOWED: Plan is certified low-risk and non-destructive.',
    };
  }
}

export const globalSupervisorRecoveryPolicy = new SupervisorRecoveryPolicy();
