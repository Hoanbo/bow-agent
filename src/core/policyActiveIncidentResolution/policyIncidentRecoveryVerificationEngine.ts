// src/core/policyActiveIncidentResolution/policyIncidentRecoveryVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Incident Recovery Verification Engine (Component 847).
// Conducts independent, multi-layer verification following recovery handoff.
// Reconciles ActivePolicyState (MS-1.3.70), RuntimePolicySnapshot (MS-1.3.71),
// PDP safety floor evaluation, PEP enforcement bridges, and Lifecycle Reconciliation (MS-1.3.73).
//
// Core Authority Invariants:
// - RECOVERY_VERIFICATION != RECOVERY_EXECUTION
// - RECOVERY_VERIFICATION != INCIDENT_CLOSURE
// - RECOVERY_VERIFICATION != POLICY_AUTHORITY
// - ZERO AUTO_REPAIR
// - ZERO AUTO_RESYNC
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { LifecycleReconciliationResult } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationTypes.js';
import type { SafetyBoundaryState } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import type {
  IncidentRecoveryHandoffRecord,
  IncidentRecoveryVerificationRecord,
  RecoveryVerificationStatus,
  PolicyActiveIncidentResolutionOptions,
} from './policyActiveIncidentResolutionTypes.js';
import { createRecoveryVerificationId } from './policyActiveIncidentResolutionTypes.js';

export interface RecoveryVerificationInput {
  readonly tenantPartition: string;
  readonly handoffRecord: IncidentRecoveryHandoffRecord;
  readonly activePolicyState?: ActivePolicyState | null;
  readonly runtimeSnapshot?: RuntimePolicySnapshot | null;
  readonly reconciliationResult?: LifecycleReconciliationResult | null;
  readonly safetyBoundary?: SafetyBoundaryState | null;
}

export class PolicyIncidentRecoveryVerificationEngine {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveIncidentResolutionOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Recovery verification engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Evaluates post-recovery consistency across all layers.
   */
  public verifyRecovery(input: RecoveryVerificationInput): IncidentRecoveryVerificationRecord {
    this.assertUserStopInactive();

    const {
      tenantPartition,
      handoffRecord,
      activePolicyState,
      runtimeSnapshot,
      reconciliationResult,
      safetyBoundary,
    } = input;

    const checksPassed: string[] = [];
    const discrepancies: string[] = [];

    // 1. Tenant match
    if (tenantPartition !== handoffRecord.tenantPartition) {
      discrepancies.push(`TENANT_MISMATCH: Input tenant '${tenantPartition}' does not match handoff tenant '${handoffRecord.tenantPartition}'`);
    } else {
      checksPassed.push('TENANT_CONSISTENCY_VERIFIED');
    }

    // 2. Active Policy State Verification (MS-1.3.70)
    let activePolicyVerified = false;
    if (!activePolicyState) {
      discrepancies.push('ACTIVE_POLICY_MISSING: Active policy state not found after recovery commit');
    } else if (activePolicyState.activePolicyVersion !== handoffRecord.targetPolicyVersion) {
      discrepancies.push(`POLICY_VERSION_MISMATCH: Active policy version '${activePolicyState.activePolicyVersion}' does not match recovered target '${handoffRecord.targetPolicyVersion}'`);
    } else {
      activePolicyVerified = true;
      checksPassed.push(`ACTIVE_POLICY_VERIFIED: ${activePolicyState.activePolicyVersion}`);
    }

    // 3. Runtime Snapshot Synchronization Verification (MS-1.3.71)
    let runtimeSnapshotSynchronized = false;
    if (!runtimeSnapshot) {
      discrepancies.push('RUNTIME_SNAPSHOT_MISSING: Runtime snapshot not synchronized after recovery');
    } else if (runtimeSnapshot.policyVersion !== handoffRecord.targetPolicyVersion) {
      discrepancies.push(`RUNTIME_SNAPSHOT_VERSION_MISMATCH: Runtime snapshot version '${runtimeSnapshot.policyVersion}' != '${handoffRecord.targetPolicyVersion}'`);
    } else {
      runtimeSnapshotSynchronized = true;
      checksPassed.push(`RUNTIME_SNAPSHOT_SYNCHRONIZED: ${runtimeSnapshot.snapshotId}`);
    }

    // 4. PDP Safety Floor Verification
    let pdpSafetyFloorVerified = true;
    if (activePolicyState?.activeModifications) {
      for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
        if ((activePolicyState.activeModifications as any)[forbidden] !== undefined) {
          pdpSafetyFloorVerified = false;
          discrepancies.push(`HARD_FORBIDDEN_FLOOR_BREACH: Recovered policy contains modification for hard-forbidden action '${forbidden}'`);
        }
      }
    }
    if (pdpSafetyFloorVerified) {
      checksPassed.push('PDP_HARD_FORBIDDEN_FLOOR_VERIFIED');
    }

    // 5. PEP Enforcement Bridge Consistency
    let pepEnforcementConsistent = true;
    if (runtimeSnapshot && !runtimeSnapshot.isGovernedActiveSnapshot) {
      pepEnforcementConsistent = false;
      discrepancies.push('PEP_DEFAULT_DENY_BREACH: Runtime policy snapshot is not a governed active snapshot');
    } else {
      checksPassed.push('PEP_ENFORCEMENT_CONSISTENCY_VERIFIED');
    }

    // 6. MS-1.3.73 Lifecycle Reconciliation Check
    let lifecycleReconciliationClean = true;
    if (reconciliationResult) {
      if (reconciliationResult.status === 'DRIFT_DETECTED' || reconciliationResult.status === 'PROVENANCE_INVALID' || reconciliationResult.status === 'CORRUPTED') {
        lifecycleReconciliationClean = false;
        discrepancies.push(`LIFECYCLE_RECONCILIATION_FAILED: Reconciler reports status '${reconciliationResult.status}'`);
      } else {
        checksPassed.push(`LIFECYCLE_RECONCILIATION_CLEAN: ${reconciliationResult.status}`);
      }
    } else {
      checksPassed.push('LIFECYCLE_RECONCILIATION_ASSUMED_CLEAN_STANDALONE');
    }


    // 7. Emergency Safety Boundary state check
    let safetyBoundaryNormalized = true;
    if (safetyBoundary && safetyBoundary.status === 'FAIL_CLOSED') {
      // If still FAIL_CLOSED, recovery verification cannot pass without human de-escalation
      safetyBoundaryNormalized = false;
      discrepancies.push('SAFETY_BOUNDARY_FAIL_CLOSED_ACTIVE: Emergency safety boundary remains FAIL_CLOSED');
    } else {
      checksPassed.push(`SAFETY_BOUNDARY_STATE_CHECKED: ${safetyBoundary?.status ?? 'NORMAL'}`);
    }

    const isSuccess =
      activePolicyVerified &&
      runtimeSnapshotSynchronized &&
      pdpSafetyFloorVerified &&
      pepEnforcementConsistent &&
      lifecycleReconciliationClean &&
      safetyBoundaryNormalized &&
      discrepancies.length === 0;

    const status: RecoveryVerificationStatus = isSuccess ? 'VERIFIED' : 'FAILED';
    const verificationId = createRecoveryVerificationId(`rv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return Object.freeze({
      verificationId,
      tenantPartition,
      incidentId: handoffRecord.incidentId,
      handoffId: handoffRecord.handoffId,
      status,
      recoveredPolicyVersion: handoffRecord.targetPolicyVersion,
      activePolicyVerified,
      runtimeSnapshotSynchronized,
      pdpSafetyFloorVerified,
      pepEnforcementConsistent,
      lifecycleReconciliationClean,
      safetyBoundaryNormalized,
      verifiedAt: new Date().toISOString(),
      checksPassed: Object.freeze(checksPassed),
      discrepancyDetails: Object.freeze(discrepancies),
      isAutoRepairAttempted: false as const,
      isAutoResyncAttempted: false as const,
    });
  }
}
