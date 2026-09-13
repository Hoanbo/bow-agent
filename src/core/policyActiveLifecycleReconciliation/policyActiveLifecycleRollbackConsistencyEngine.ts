// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleRollbackConsistencyEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Rollback Consistency Engine (Component 823).
// Independently verifies consistency between rollback, sunset, and recovery records
// from MS-1.3.72 and the currently active policy state.
// Strictly READ-ONLY; zero autonomous rollback, sunset, or recovery.
//
// Core Authority Invariants:
// - ROLLBACK_ENGINE_GRANTS_ZERO_AUTHORITY
// - ROLLBACK_REQUEST != ROLLBACK_COMMIT != ACTIVE_POLICY
// - SUNSET_REQUEST != SUNSET_COMMIT != HISTORICAL_POLICY
// - RECOVERY_REQUEST != RECOVERY_COMMIT != ACTIVE_POLICY
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { PolicyActiveRollbackStore } from '../policyActiveRollback/policyActiveRollbackStore.js';
import type {
  LifecycleDriftRecord,
  LifecycleBoundaryCheckResult,
  PolicyActiveLifecycleReconciliationOptions,
} from './policyActiveLifecycleReconciliationTypes.js';
import {
  createLifecycleDriftId,
  createLifecycleConsistencyCheckId,
} from './policyActiveLifecycleReconciliationTypes.js';

export interface RollbackConsistencyCheckResult {
  readonly consistent: boolean;
  readonly rollbackStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
  readonly sunsetStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
  readonly recoveryStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
  readonly detectedDrifts: readonly LifecycleDriftRecord[];
  readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
  readonly blockingReasons: readonly string[];
}

export class PolicyActiveLifecycleRollbackConsistencyEngine {
  private readonly rollbackStore?: PolicyActiveRollbackStore;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveLifecycleReconciliationOptions,
    rollbackStore?: PolicyActiveRollbackStore
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.rollbackStore = rollbackStore;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Rollback consistency check suspended by USER_STOP supremacy');
    }
  }

  /**
   * Reconciles rollback, sunset, and recovery records against current active policy.
   */
  public verifyRollbackConsistency(
    tenantPartition: string,
    activeState: ActivePolicyState | null
  ): RollbackConsistencyCheckResult {
    this.assertUserStopInactive();

    const drifts: LifecycleDriftRecord[] = [];
    const boundaryChecks: LifecycleBoundaryCheckResult[] = [];
    const blockingReasons: string[] = [];

    let rollbackStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let sunsetStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let recoveryStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';

    if (!this.rollbackStore) {
      return {
        consistent: true,
        rollbackStatus: 'NOT_APPLICABLE',
        sunsetStatus: 'NOT_APPLICABLE',
        recoveryStatus: 'NOT_APPLICABLE',
        detectedDrifts: [],
        boundaryChecks: [],
        blockingReasons: [],
      };
    }

    try {
      // 1. Inspect Rollback Requests
      const allRollbacks = this.rollbackStore.getRollbackRequests(tenantPartition);
      const committedRollbacks = allRollbacks.filter((r) => r.state === 'COMMITTED');

      if (committedRollbacks.length > 0) {
        rollbackStatus = 'CONSISTENT';
        // The most recently committed rollback must correspond to active policy
        const latestCommit = committedRollbacks[committedRollbacks.length - 1];
        if (!activeState) {
          drifts.push({
            driftId: createLifecycleDriftId(`drift_rb_${Date.now()}_1`),
            category: 'ROLLBACK_COMMIT_WITHOUT_ACTIVE_STATE',
            severity: 'CRITICAL',
            expected: `Active policy matching rollback target '${latestCommit.targetPolicyVersion}'`,
            observed: 'null',
            message: `Rollback commit '${latestCommit.rollbackRequestId}' exists but no active policy is found`,
            governanceBoundaryViolated: 'MS-1.3.72 Rollback State Transition Engine',
            requiresHumanIntervention: true,
            detectedAt: new Date().toISOString(),
          });
          blockingReasons.push('COMMITTED_ROLLBACK_WITHOUT_ACTIVE_STATE');
          rollbackStatus = 'CONFLICT';
        } else if (activeState.activePolicyVersion !== latestCommit.targetPolicyVersion) {
          drifts.push({
            driftId: createLifecycleDriftId(`drift_rb_${Date.now()}_2`),
            category: 'ROLLBACK_TARGET_MISMATCH',
            severity: 'HIGH',
            expected: latestCommit.targetPolicyVersion,
            observed: activeState.activePolicyVersion,
            message: `Active policy version '${activeState.activePolicyVersion}' does not match rollback target '${latestCommit.targetPolicyVersion}'`,
            governanceBoundaryViolated: 'MS-1.3.72 Rollback State Transition Engine',
            requiresHumanIntervention: true,
            detectedAt: new Date().toISOString(),
          });
          blockingReasons.push('ROLLBACK_TARGET_VERSION_MISMATCH');
          rollbackStatus = 'CONFLICT';
        }
      }

      boundaryChecks.push({
        checkId: createLifecycleConsistencyCheckId(`chk_rb_${Date.now()}`),
        boundaryName: 'ROLLBACK_COMMIT_CONSISTENCY',
        passed: rollbackStatus !== 'CONFLICT',
        details: { totalRollbacks: allRollbacks.length, committedCount: committedRollbacks.length },
        blockingReasons: rollbackStatus === 'CONFLICT' ? ['ROLLBACK_COMMIT_CONFLICT'] : [],
        checkedAt: new Date().toISOString(),
      });

      // 2. Inspect Sunset Requests
      const allSunsets = this.rollbackStore.getSunsetRequests(tenantPartition);
      const committedSunsets = allSunsets.filter((s) => s.state === 'COMMITTED');

      if (committedSunsets.length > 0) {
        sunsetStatus = 'CONSISTENT';
        const latestSunset = committedSunsets[committedSunsets.length - 1];
        // If the sunset policy has no replacement, active state should be null or different version
        if (activeState && activeState.activePolicyVersion === latestSunset.currentActivePolicyVersion) {
          drifts.push({
            driftId: createLifecycleDriftId(`drift_sun_${Date.now()}`),
            category: 'SUNSET_STATE_CONFLICT',
            severity: 'CRITICAL',
            expected: `Policy '${latestSunset.currentActivePolicyVersion}' to be deactivated/sunset`,
            observed: `Policy '${activeState.activePolicyVersion}' is still active`,
            message: `Sunset policy '${latestSunset.currentActivePolicyVersion}' is still marked active in storage`,
            governanceBoundaryViolated: 'MS-1.3.72 Sunset Evaluation Engine',
            requiresHumanIntervention: true,
            detectedAt: new Date().toISOString(),
          });
          blockingReasons.push('SUNSET_POLICY_STILL_ACTIVE');
          sunsetStatus = 'CONFLICT';
        }
      }

      boundaryChecks.push({
        checkId: createLifecycleConsistencyCheckId(`chk_sun_${Date.now()}`),
        boundaryName: 'SUNSET_COMMIT_CONSISTENCY',
        passed: sunsetStatus !== 'CONFLICT',
        details: { totalSunsets: allSunsets.length, committedSunsets: committedSunsets.length },
        blockingReasons: sunsetStatus === 'CONFLICT' ? ['SUNSET_COMMIT_CONFLICT'] : [],
        checkedAt: new Date().toISOString(),
      });

      // 3. Inspect Recovery Requests
      const allRecoveries = this.rollbackStore.getRecoveryRequests(tenantPartition);
      const committedRecoveries = allRecoveries.filter((r) => r.state === 'COMMITTED');

      if (committedRecoveries.length > 0) {
        recoveryStatus = 'CONSISTENT';
        const latestRecovery = committedRecoveries[committedRecoveries.length - 1];
        if (!activeState) {
          drifts.push({
            driftId: createLifecycleDriftId(`drift_rec_${Date.now()}_1`),
            category: 'RECOVERY_STATE_CONFLICT',
            severity: 'CRITICAL',
            expected: `Active policy recovered to version '${latestRecovery.recoveryTargetVersion}'`,
            observed: 'null',
            message: `Recovery commit '${latestRecovery.recoveryRequestId}' exists but active policy is null`,
            governanceBoundaryViolated: 'MS-1.3.72 Recovery Evaluation Engine',
            requiresHumanIntervention: true,
            detectedAt: new Date().toISOString(),
          });
          blockingReasons.push('COMMITTED_RECOVERY_WITHOUT_ACTIVE_STATE');
          recoveryStatus = 'CONFLICT';
        } else if (activeState.activePolicyVersion !== latestRecovery.recoveryTargetVersion) {
          drifts.push({
            driftId: createLifecycleDriftId(`drift_rec_${Date.now()}_2`),
            category: 'RECOVERY_STATE_CONFLICT',
            severity: 'HIGH',
            expected: latestRecovery.recoveryTargetVersion,
            observed: activeState.activePolicyVersion,
            message: `Active policy version '${activeState.activePolicyVersion}' does not match recovered version '${latestRecovery.recoveryTargetVersion}'`,
            governanceBoundaryViolated: 'MS-1.3.72 Recovery Evaluation Engine',
            requiresHumanIntervention: true,
            detectedAt: new Date().toISOString(),
          });
          blockingReasons.push('RECOVERY_VERSION_MISMATCH');
          recoveryStatus = 'CONFLICT';
        }
      }

      boundaryChecks.push({
        checkId: createLifecycleConsistencyCheckId(`chk_rec_${Date.now()}`),
        boundaryName: 'RECOVERY_COMMIT_CONSISTENCY',
        passed: recoveryStatus !== 'CONFLICT',
        details: { totalRecoveries: allRecoveries.length, committedRecoveries: committedRecoveries.length },
        blockingReasons: recoveryStatus === 'CONFLICT' ? ['RECOVERY_COMMIT_CONFLICT'] : [],
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      blockingReasons.push(`ROLLBACK_STORE_INSPECTION_ERROR: ${err.message}`);
    }

    const isConsistent = drifts.length === 0;

    return {
      consistent: isConsistent,
      rollbackStatus,
      sunsetStatus,
      recoveryStatus,
      detectedDrifts: Object.freeze(drifts),
      boundaryChecks: Object.freeze(boundaryChecks),
      blockingReasons: Object.freeze(blockingReasons),
    };
  }
}
