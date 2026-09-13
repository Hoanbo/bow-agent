// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleRuntimeDriftDetector.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Active Runtime Drift Detector (Component 822).
// Independently inspects runtime synchronization, snapshot freshness, PDP evaluation integrity,
// and PEP enforcement disposition against the durable ActivePolicyState.
// Strictly READ-ONLY; zero autonomous resync, zero mutation, zero tool execution.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT
// - DRIFT_DETECTOR_GRANTS_ZERO_AUTHORITY: Produces drift diagnostics only
// - ZERO AUTONOMOUS RESYNC (REPORT ONLY)
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type {
  RuntimePolicySnapshot,
  PolicyActiveRuntimeOptions,
} from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimeFreshnessValidator } from '../policyActiveRuntime/policyActiveRuntimeFreshnessValidator.js';
import { PolicyActiveRuntimeSyncEngine } from '../policyActiveRuntime/policyActiveRuntimeSyncEngine.js';
import { PolicyActiveRuntimePDPBridge } from '../policyActiveRuntime/policyActiveRuntimePDPBridge.js';
import { PolicyActiveRuntimePEPBridge } from '../policyActiveRuntime/policyActiveRuntimePEPBridge.js';
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import type {
  LifecycleDriftRecord,
  LifecycleBoundaryCheckResult,
} from './policyActiveLifecycleReconciliationTypes.js';
import {
  createLifecycleDriftId,
  createLifecycleConsistencyCheckId,
} from './policyActiveLifecycleReconciliationTypes.js';

export interface RuntimeDriftDetectionResult {
  readonly consistent: boolean;
  readonly runtimeSnapshot: RuntimePolicySnapshot | null;
  readonly detectedDrifts: readonly LifecycleDriftRecord[];
  readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
  readonly blockingReasons: readonly string[];
}

export class PolicyActiveLifecycleRuntimeDriftDetector {
  private readonly freshnessValidator: PolicyActiveRuntimeFreshnessValidator;
  private readonly syncEngine?: PolicyActiveRuntimeSyncEngine;
  private readonly pdpBridge?: PolicyActiveRuntimePDPBridge;
  private readonly pepBridge?: PolicyActiveRuntimePEPBridge;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveRuntimeOptions,
    syncEngine?: PolicyActiveRuntimeSyncEngine,
    freshnessValidator?: PolicyActiveRuntimeFreshnessValidator,
    pdpBridge?: PolicyActiveRuntimePDPBridge,
    pepBridge?: PolicyActiveRuntimePEPBridge
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.freshnessValidator = freshnessValidator ?? new PolicyActiveRuntimeFreshnessValidator(options);
    this.syncEngine = syncEngine;
    this.pdpBridge = pdpBridge;
    this.pepBridge = pepBridge;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Runtime drift detection suspended by USER_STOP supremacy');
    }
  }

  /**
   * Compares durable ActivePolicyState with runtime snapshot and bridges.
   */
  public detectDrift(
    tenantPartition: string,
    activeState: ActivePolicyState | null,
    providedSnapshot?: RuntimePolicySnapshot | null
  ): RuntimeDriftDetectionResult {
    this.assertUserStopInactive();

    const drifts: LifecycleDriftRecord[] = [];
    const boundaryChecks: LifecycleBoundaryCheckResult[] = [];
    const blockingReasons: string[] = [];

    // 1. Resolve snapshot: either provided or retrieved from syncEngine cache (read-only)
    const snapshot: RuntimePolicySnapshot | null =
      providedSnapshot !== undefined
        ? providedSnapshot
        : (this.syncEngine?.getCachedSnapshot(tenantPartition) ?? null);

    // Check 1: Existence matching
    const snapshotExists = snapshot !== null;
    const activeExists = activeState !== null;

    if (activeExists && !snapshotExists) {
      drifts.push({
        driftId: createLifecycleDriftId(`drift_snap_${Date.now()}_1`),
        category: 'ACTIVE_POLICY_WITHOUT_RUNTIME_SNAPSHOT',
        severity: 'HIGH',
        expected: `Active snapshot for active policy '${activeState.activePolicyStateId}'`,
        observed: 'null',
        message: 'Active policy exists in storage but no runtime snapshot is synchronized in memory',
        governanceBoundaryViolated: 'MS-1.3.71 Active Runtime Synchronization',
        requiresHumanIntervention: true,
        detectedAt: new Date().toISOString(),
      });
      blockingReasons.push('ACTIVE_POLICY_NOT_SYNCHRONIZED_IN_RUNTIME');
    } else if (!activeExists && snapshotExists) {
      drifts.push({
        driftId: createLifecycleDriftId(`drift_snap_${Date.now()}_2`),
        category: 'RUNTIME_SNAPSHOT_WITHOUT_ACTIVE_POLICY',
        severity: 'CRITICAL',
        expected: 'null',
        observed: `Snapshot '${snapshot.snapshotId}' active in memory`,
        message: 'Runtime snapshot is active in memory but durable active policy is absent',
        governanceBoundaryViolated: 'MS-1.3.70 Active Policy State Store',
        requiresHumanIntervention: true,
        detectedAt: new Date().toISOString(),
      });
      blockingReasons.push('ORPHAN_RUNTIME_SNAPSHOT');
    }

    boundaryChecks.push({
      checkId: createLifecycleConsistencyCheckId(`chk_exist_${Date.now()}`),
      boundaryName: 'RUNTIME_SNAPSHOT_EXISTENCE',
      passed: activeExists === snapshotExists,
      details: { activeExists, snapshotExists },
      blockingReasons: activeExists !== snapshotExists ? ['SNAPSHOT_EXISTENCE_MISMATCH'] : [],
      checkedAt: new Date().toISOString(),
    });

    // If both exist, deep-compare metadata
    if (activeState && snapshot) {
      // Check 2: Tenant Partition Binding
      const tenantMatch = snapshot.tenantPartition === tenantPartition && activeState.tenantPartition === tenantPartition;
      if (!tenantMatch) {
        drifts.push({
          driftId: createLifecycleDriftId(`drift_tenant_${Date.now()}`),
          category: 'WRONG_TENANT_RUNTIME',
          severity: 'CRITICAL',
          expected: tenantPartition,
          observed: `active=${activeState.tenantPartition}, snapshot=${snapshot.tenantPartition}`,
          message: 'Tenant partition mismatch between active state and runtime snapshot',
          governanceBoundaryViolated: 'Multi-Tenant Isolation Boundary',
          requiresHumanIntervention: true,
          detectedAt: new Date().toISOString(),
        });
        blockingReasons.push('TENANT_RUNTIME_MISMATCH');
      }

      boundaryChecks.push({
        checkId: createLifecycleConsistencyCheckId(`chk_tenant_${Date.now()}`),
        boundaryName: 'TENANT_SNAPSHOT_BINDING',
        passed: tenantMatch,
        details: { expected: tenantPartition, active: activeState.tenantPartition, snapshot: snapshot.tenantPartition },
        blockingReasons: tenantMatch ? [] : ['TENANT_SNAPSHOT_MISMATCH'],
        checkedAt: new Date().toISOString(),
      });

      // Check 3: ActivePolicyStateId & Version Binding
      const stateIdMatch = snapshot.activePolicyStateId === activeState.activePolicyStateId;
      const versionMatch = snapshot.policyVersion === activeState.activePolicyVersion;
      if (!stateIdMatch || !versionMatch) {
        drifts.push({
          driftId: createLifecycleDriftId(`drift_ver_${Date.now()}`),
          category: 'WRONG_POLICY_VERSION',
          severity: 'HIGH',
          expected: `stateId=${activeState.activePolicyStateId}, version=${activeState.activePolicyVersion}`,
          observed: `stateId=${snapshot.activePolicyStateId}, version=${snapshot.policyVersion}`,
          message: 'Active policy version or stateId mismatch with runtime snapshot',
          governanceBoundaryViolated: 'MS-1.3.71 Runtime Snapshot Resolver',
          requiresHumanIntervention: true,
          detectedAt: new Date().toISOString(),
        });
        blockingReasons.push('SNAPSHOT_VERSION_MISMATCH');
      }

      // Check 4: Freshness validation
      const freshness = this.freshnessValidator.validateFreshness(
        activeState,
        tenantPartition,
        snapshot.policyVersion
      );
      if (freshness.status !== 'FRESH') {
        const cat: any = freshness.status === 'STALE' ? 'STALE_RUNTIME_SNAPSHOT' : 'SUPERSEDED_RUNTIME_SNAPSHOT';
        drifts.push({
          driftId: createLifecycleDriftId(`drift_fresh_${Date.now()}`),
          category: cat,
          severity: 'HIGH',
          expected: 'FRESH',
          observed: freshness.status,
          message: `Runtime snapshot freshness check failed: ${freshness.issues.join('; ') || 'stale snapshot'}`,
          governanceBoundaryViolated: 'MS-1.3.71 Freshness Validator',
          requiresHumanIntervention: true,
          detectedAt: new Date().toISOString(),
        });
        blockingReasons.push(`RUNTIME_SNAPSHOT_${freshness.status}`);
      }

      boundaryChecks.push({
        checkId: createLifecycleConsistencyCheckId(`chk_fresh_${Date.now()}`),
        boundaryName: 'RUNTIME_SNAPSHOT_FRESHNESS',
        passed: freshness.status === 'FRESH',
        details: { status: freshness.status, issues: freshness.issues },
        blockingReasons: freshness.status === 'FRESH' ? [] : [`RUNTIME_SNAPSHOT_${freshness.status}`],
        checkedAt: new Date().toISOString(),
      });

      // Check 5: Provenance Head Hash
      if (snapshot.provenanceHeadHash !== activeState.provenanceHeadHash) {
        drifts.push({
          driftId: createLifecycleDriftId(`drift_prov_${Date.now()}`),
          category: 'PROVENANCE_MISMATCH',
          severity: 'CRITICAL',
          expected: activeState.provenanceHeadHash,
          observed: snapshot.provenanceHeadHash,
          message: 'Provenance head hash on runtime snapshot differs from durable active state',
          governanceBoundaryViolated: 'Cryptographic Provenance Chain',
          requiresHumanIntervention: true,
          detectedAt: new Date().toISOString(),
        });
        blockingReasons.push('SNAPSHOT_PROVENANCE_HEAD_MISMATCH');
      }

      // Check 6: Read-only PDP evaluation check
      if (this.pdpBridge) {
        for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
          const pdpDec = this.pdpBridge.evaluateActionAgainstSnapshot(forbidden, snapshot);
          if (pdpDec.allowed === true || pdpDec.classification !== 'FORBIDDEN') {
            drifts.push({
              driftId: createLifecycleDriftId(`drift_pdp_${Date.now()}_${forbidden}`),
              category: 'PDP_FORBIDDEN_FLOOR_VIOLATION',
              severity: 'CRITICAL',
              expected: `Action '${forbidden}' must evaluate to allowed=false, classification=FORBIDDEN`,
              observed: `allowed=${pdpDec.allowed}, classification=${pdpDec.classification}`,
              message: `PDP failed to enforce hard-forbidden floor for action '${forbidden}'`,
              governanceBoundaryViolated: 'MS-1.3.71 PDP Bridge Safety Floor',
              requiresHumanIntervention: true,
              detectedAt: new Date().toISOString(),
            });
            blockingReasons.push(`PDP_HARD_FORBIDDEN_FLOOR_BREACH: ${forbidden}`);
          }
        }

        boundaryChecks.push({
          checkId: createLifecycleConsistencyCheckId(`chk_pdp_${Date.now()}`),
          boundaryName: 'PDP_EVALUATION_INTEGRITY',
          passed: !drifts.some((d) => d.category === 'PDP_FORBIDDEN_FLOOR_VIOLATION'),
          details: { verifiedHardForbiddenActions: ROLLBACK_HARD_FORBIDDEN_ACTIONS },
          blockingReasons: drifts.filter((d) => d.category === 'PDP_FORBIDDEN_FLOOR_VIOLATION').map((d) => d.message),
          checkedAt: new Date().toISOString(),
        });
      }

      // Check 7: Read-only PEP enforcement check
      if (this.pepBridge) {
        for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
          const pepRes = this.pepBridge.enforceBeforeExecution(forbidden, snapshot);
          if (pepRes.disposition !== 'FORBIDDEN' && pepRes.disposition !== 'DENY') {
            drifts.push({
              driftId: createLifecycleDriftId(`drift_pep_${Date.now()}_${forbidden}`),
              category: 'PEP_RUNTIME_MISMATCH',
              severity: 'CRITICAL',
              expected: `PEP disposition FORBIDDEN or DENY for '${forbidden}'`,
              observed: pepRes.disposition,
              message: `PEP enforcement did not fail-closed on hard-forbidden action '${forbidden}'`,
              governanceBoundaryViolated: 'MS-1.3.71 PEP Bridge Hard Ceiling',
              requiresHumanIntervention: true,
              detectedAt: new Date().toISOString(),
            });
            blockingReasons.push(`PEP_FORBIDDEN_FLOOR_BREACH: ${forbidden}`);
          }
        }

        boundaryChecks.push({
          checkId: createLifecycleConsistencyCheckId(`chk_pep_${Date.now()}`),
          boundaryName: 'PEP_ENFORCEMENT_INTEGRITY',
          passed: !drifts.some((d) => d.category === 'PEP_RUNTIME_MISMATCH'),
          details: { verifiedHardForbiddenActions: ROLLBACK_HARD_FORBIDDEN_ACTIONS },
          blockingReasons: drifts.filter((d) => d.category === 'PEP_RUNTIME_MISMATCH').map((d) => d.message),
          checkedAt: new Date().toISOString(),
        });
      }
    }

    const isConsistent = drifts.length === 0;

    return {
      consistent: isConsistent,
      runtimeSnapshot: snapshot,
      detectedDrifts: Object.freeze(drifts),
      boundaryChecks: Object.freeze(boundaryChecks),
      blockingReasons: Object.freeze(blockingReasons),
    };
  }
}
