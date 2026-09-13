// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleVersionConsistencyEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Version Consistency Engine (Component 821).
// Reconciles and deterministically validates version relationships across active state,
// runtime snapshots, staged candidates, historical policies, rollback targets, and recovery targets.
//
// Core Authority Invariants:
// - VERSION_ENGINE_GRANTS_ZERO_AUTHORITY: Verification only; zero silent version mutation
// - HARD_FORBIDDEN_FLOORS_ARE_IMMUTABLE
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import { createLifecycleDriftId } from './policyActiveLifecycleReconciliationTypes.js';
export class PolicyActiveLifecycleVersionConsistencyEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Version consistency evaluation suspended by USER_STOP supremacy');
        }
    }
    /**
     * Compares active policy state version with runtime snapshot version and safety constraints.
     */
    verifyVersionConsistency(activeState, runtimeSnapshot, rollbackTargetVersion, recoveryTargetVersion) {
        this.assertUserStopInactive();
        const drifts = [];
        const blockingReasons = [];
        const activeVer = activeState?.activePolicyVersion ?? null;
        const runtimeVer = runtimeSnapshot?.policyVersion ?? null;
        // 1. Check if active policy version exists
        if (!activeVer) {
            drifts.push({
                driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                category: 'ACTIVE_POLICY_MISSING',
                severity: 'CRITICAL',
                expected: 'Valid active policy version string',
                observed: 'null',
                message: 'Active policy state has no version or is missing entirely',
                governanceBoundaryViolated: 'MS-1.3.70 ActivePolicyState',
                requiresHumanIntervention: true,
                detectedAt: new Date().toISOString(),
            });
            blockingReasons.push('ACTIVE_POLICY_VERSION_MISSING');
        }
        // 2. Compare active version with runtime snapshot version
        if (activeVer && runtimeVer) {
            if (activeVer !== runtimeVer) {
                drifts.push({
                    driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                    category: 'WRONG_POLICY_VERSION',
                    severity: 'HIGH',
                    expected: activeVer,
                    observed: runtimeVer,
                    message: `Durable active policy version '${activeVer}' diverges from runtime snapshot version '${runtimeVer}'`,
                    governanceBoundaryViolated: 'MS-1.3.71 RuntimePolicySnapshot',
                    requiresHumanIntervention: true,
                    detectedAt: new Date().toISOString(),
                });
                blockingReasons.push(`VERSION_DIVERGENCE: durable=${activeVer} vs runtime=${runtimeVer}`);
            }
        }
        else if (activeVer && !runtimeVer) {
            drifts.push({
                driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                category: 'ACTIVE_POLICY_WITHOUT_RUNTIME_SNAPSHOT',
                severity: 'HIGH',
                expected: activeVer,
                observed: 'null',
                message: `Durable active policy version '${activeVer}' exists but runtime snapshot is missing`,
                governanceBoundaryViolated: 'MS-1.3.71 RuntimePolicySnapshot',
                requiresHumanIntervention: true,
                detectedAt: new Date().toISOString(),
            });
            blockingReasons.push('RUNTIME_SNAPSHOT_MISSING_FOR_ACTIVE_POLICY');
        }
        else if (!activeVer && runtimeVer) {
            drifts.push({
                driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                category: 'RUNTIME_SNAPSHOT_WITHOUT_ACTIVE_POLICY',
                severity: 'CRITICAL',
                expected: 'null',
                observed: runtimeVer,
                message: `Runtime snapshot version '${runtimeVer}' is loaded but no durable active policy exists`,
                governanceBoundaryViolated: 'MS-1.3.70 ActivePolicyState',
                requiresHumanIntervention: true,
                detectedAt: new Date().toISOString(),
            });
            blockingReasons.push('ORPHANED_RUNTIME_SNAPSHOT_WITHOUT_ACTIVE_POLICY');
        }
        // 3. Check hard-forbidden action floor preservation
        if (activeState) {
            const activeMods = activeState.activeModifications ?? {};
            const toolClassifications = activeMods.toolClassifications ?? {};
            for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
                if (toolClassifications[forbidden] && toolClassifications[forbidden] !== 'FORBIDDEN') {
                    drifts.push({
                        driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                        category: 'PDP_FORBIDDEN_FLOOR_VIOLATION',
                        severity: 'CRITICAL',
                        expected: `'${forbidden}' classified as FORBIDDEN`,
                        observed: String(toolClassifications[forbidden]),
                        message: `Hard-forbidden floor breach: '${forbidden}' downgraded to '${toolClassifications[forbidden]}'`,
                        governanceBoundaryViolated: 'Hard-Forbidden Baseline Floor',
                        requiresHumanIntervention: true,
                        detectedAt: new Date().toISOString(),
                    });
                    blockingReasons.push(`HARD_FORBIDDEN_FLOOR_BREACH: ${forbidden}`);
                }
            }
        }
        // 4. Check rollback target version sanity if present
        if (rollbackTargetVersion && activeVer) {
            if (rollbackTargetVersion === activeVer) {
                drifts.push({
                    driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                    category: 'ROLLBACK_TARGET_MISMATCH',
                    severity: 'HIGH',
                    expected: `Different target version than active '${activeVer}'`,
                    observed: rollbackTargetVersion,
                    message: `Rollback target version '${rollbackTargetVersion}' equals current active version`,
                    governanceBoundaryViolated: 'MS-1.3.72 Rollback Target Resolver',
                    requiresHumanIntervention: true,
                    detectedAt: new Date().toISOString(),
                });
                blockingReasons.push('ROLLBACK_TARGET_EQUALS_ACTIVE_POLICY');
            }
        }
        // 5. Check recovery target version sanity if present
        if (recoveryTargetVersion && activeVer) {
            if (recoveryTargetVersion === activeVer) {
                drifts.push({
                    driftId: createLifecycleDriftId(`drift_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                    category: 'RECOVERY_STATE_CONFLICT',
                    severity: 'HIGH',
                    expected: `Different recovery target than active '${activeVer}'`,
                    observed: recoveryTargetVersion,
                    message: `Recovery target version '${recoveryTargetVersion}' matches active policy version`,
                    governanceBoundaryViolated: 'MS-1.3.72 Recovery Evaluation Engine',
                    requiresHumanIntervention: true,
                    detectedAt: new Date().toISOString(),
                });
                blockingReasons.push('RECOVERY_TARGET_EQUALS_ACTIVE_POLICY');
            }
        }
        const isConsistent = drifts.length === 0;
        return {
            consistent: isConsistent,
            activeVersion: activeVer,
            runtimeVersion: runtimeVer,
            detectedDrifts: Object.freeze(drifts),
            blockingReasons: Object.freeze(blockingReasons),
        };
    }
}
