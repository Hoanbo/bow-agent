// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleConsistencyEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Lifecycle Consistency Engine (Component 826).
// Central comparison coordinator that orchestrates independent consistency checks across:
// Tenant Isolation, Active Policy State, Runtime Snapshots, Versioning, Rollback Lifecycles,
// and Cryptographic Provenance.
//
// Core Authority Invariants:
// - RECONCILIATION != POLICY_AUTHORITY
// - RECONCILIATION != POLICY_MUTATION
// - RECONCILIATION != AUTONOMOUS_REPAIR
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import crypto from 'node:crypto';
import type {
  LifecycleReconciliationId,
  LifecycleReconciliationStatus,
  LifecycleDriftRecord,
  LifecycleBoundaryCheckResult,
  LifecycleReconciliationResult,
  PolicyActiveLifecycleReconciliationOptions,
} from './policyActiveLifecycleReconciliationTypes.js';
import { createLifecycleReconciliationId } from './policyActiveLifecycleReconciliationTypes.js';
import { PolicyActiveLifecycleTenantConsistencyEngine } from './policyActiveLifecycleTenantConsistencyEngine.js';
import { PolicyActiveLifecycleStateResolver } from './policyActiveLifecycleStateResolver.js';
import { PolicyActiveLifecycleRuntimeDriftDetector } from './policyActiveLifecycleRuntimeDriftDetector.js';
import { PolicyActiveLifecycleVersionConsistencyEngine } from './policyActiveLifecycleVersionConsistencyEngine.js';
import { PolicyActiveLifecycleRollbackConsistencyEngine } from './policyActiveLifecycleRollbackConsistencyEngine.js';
import { PolicyActiveLifecycleProvenanceConsistencyEngine } from './policyActiveLifecycleProvenanceConsistencyEngine.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';

export class PolicyActiveLifecycleConsistencyEngine {
  private readonly tenantEngine: PolicyActiveLifecycleTenantConsistencyEngine;
  private readonly stateResolver: PolicyActiveLifecycleStateResolver;
  private readonly driftDetector: PolicyActiveLifecycleRuntimeDriftDetector;
  private readonly versionEngine: PolicyActiveLifecycleVersionConsistencyEngine;
  private readonly rollbackEngine: PolicyActiveLifecycleRollbackConsistencyEngine;
  private readonly provenanceEngine: PolicyActiveLifecycleProvenanceConsistencyEngine;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveLifecycleReconciliationOptions,
    tenantEngine?: PolicyActiveLifecycleTenantConsistencyEngine,
    stateResolver?: PolicyActiveLifecycleStateResolver,
    driftDetector?: PolicyActiveLifecycleRuntimeDriftDetector,
    versionEngine?: PolicyActiveLifecycleVersionConsistencyEngine,
    rollbackEngine?: PolicyActiveLifecycleRollbackConsistencyEngine,
    provenanceEngine?: PolicyActiveLifecycleProvenanceConsistencyEngine
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.tenantEngine = tenantEngine ?? new PolicyActiveLifecycleTenantConsistencyEngine(options);
    this.stateResolver = stateResolver ?? new PolicyActiveLifecycleStateResolver(options);
    this.driftDetector = driftDetector ?? new PolicyActiveLifecycleRuntimeDriftDetector(options);
    this.versionEngine = versionEngine ?? new PolicyActiveLifecycleVersionConsistencyEngine(options);
    this.rollbackEngine = rollbackEngine ?? new PolicyActiveLifecycleRollbackConsistencyEngine(options);
    this.provenanceEngine = provenanceEngine ?? new PolicyActiveLifecycleProvenanceConsistencyEngine(options);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Lifecycle consistency evaluation suspended by USER_STOP supremacy');
    }
  }

  /**
   * Performs an end-to-end deterministic reconciliation of active policy lifecycle.
   */
  public evaluateLifecycleConsistency(
    tenantPartition: string,
    explicitSnapshot?: RuntimePolicySnapshot | null
  ): LifecycleReconciliationResult {
    this.assertUserStopInactive();

    const reconciliationId: LifecycleReconciliationId = createLifecycleReconciliationId(
      `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    const allDrifts: LifecycleDriftRecord[] = [];
    const allBoundaryChecks: LifecycleBoundaryCheckResult[] = [];
    const allBlockingReasons: string[] = [];
    const verifiedBoundaries: string[] = [];

    // Stage 1: Tenant Partition Check
    const tenantRes = this.tenantEngine.verifyTenantPartition(tenantPartition);
    allDrifts.push(...tenantRes.detectedDrifts);
    allBoundaryChecks.push(...tenantRes.boundaryChecks);
    allBlockingReasons.push(...tenantRes.blockingReasons);

    if (!tenantRes.valid) {
      return Object.freeze({
        reconciliationId,
        tenantPartition,
        activePolicyStateId: null,
        runtimeSnapshotId: null,
        expectedPolicyVersion: null,
        observedPolicyVersion: null,
        status: 'TENANT_MISMATCH',
        isConsistent: false,
        detectedDrifts: Object.freeze(allDrifts),
        blockingReasons: Object.freeze(allBlockingReasons),
        verifiedBoundaries: Object.freeze(verifiedBoundaries),
        boundaryCheckResults: Object.freeze(allBoundaryChecks),
        provenanceStatus: 'MISSING',
        rollbackStatus: 'NOT_APPLICABLE',
        sunsetStatus: 'NOT_APPLICABLE',
        recoveryStatus: 'NOT_APPLICABLE',
        checkedAt: new Date().toISOString(),
        provenanceHash: '0000000000000000000000000000000000000000000000000000000000000000',
        isActivePolicy: false,
        isPolicyMutation: false,
        isAutonomousMutation: false,
        requiresHumanIntervention: true,
      });
    }
    verifiedBoundaries.push('TENANT_PARTITION_ISOLATION');

    const cleanPartition = tenantRes.sanitizedPartitionKey;

    // Stage 2: Resolve Durable Active Policy State
    const activeRes = this.stateResolver.resolveActiveState(cleanPartition);
    if (!activeRes.valid || !activeRes.activePolicyState) {
      allBlockingReasons.push(...activeRes.failureReasons);
    } else {
      verifiedBoundaries.push('ACTIVE_POLICY_STATE_RESOLVED');
    }

    const activeState = activeRes.activePolicyState;

    // Stage 3: Runtime Drift Detection (PDP, PEP, Freshness, Snapshot)
    const driftRes = this.driftDetector.detectDrift(cleanPartition, activeState, explicitSnapshot);
    allDrifts.push(...driftRes.detectedDrifts);
    allBoundaryChecks.push(...driftRes.boundaryChecks);
    allBlockingReasons.push(...driftRes.blockingReasons);
    if (driftRes.consistent) {
      verifiedBoundaries.push('ACTIVE_RUNTIME_SNAPSHOT_CONSISTENCY');
    }

    const snapshot = driftRes.runtimeSnapshot;

    // Stage 4: Version Consistency
    const verRes = this.versionEngine.verifyVersionConsistency(activeState, snapshot);
    allDrifts.push(...verRes.detectedDrifts);
    allBlockingReasons.push(...verRes.blockingReasons);
    if (verRes.consistent) {
      verifiedBoundaries.push('VERSION_RELATIONSHIP_CONSISTENCY');
    }

    // Stage 5: Rollback, Sunset & Recovery Consistency
    const rbRes = this.rollbackEngine.verifyRollbackConsistency(cleanPartition, activeState);
    allDrifts.push(...rbRes.detectedDrifts);
    allBoundaryChecks.push(...rbRes.boundaryChecks);
    allBlockingReasons.push(...rbRes.blockingReasons);
    if (rbRes.consistent) {
      verifiedBoundaries.push('ROLLBACK_SUNSET_RECOVERY_CONSISTENCY');
    }

    // Stage 6: Provenance Cryptographic Integrity
    const prvRes = this.provenanceEngine.verifyProvenance(cleanPartition, activeState?.candidateDraftId);
    allDrifts.push(...prvRes.detectedDrifts);
    allBoundaryChecks.push(...prvRes.boundaryChecks);
    allBlockingReasons.push(...prvRes.blockingReasons);
    if (prvRes.valid) {
      verifiedBoundaries.push('CRYPTOGRAPHIC_PROVENANCE_INTEGRITY');
    }

    // Determine aggregate status
    let status: LifecycleReconciliationStatus = 'CONSISTENT';
    if (prvRes.status === 'TAMPER_DETECTED') {
      status = 'PROVENANCE_INVALID';
    } else if (allDrifts.some((d) => d.category === 'TENANT_ISOLATION_BREACH')) {
      status = 'TENANT_MISMATCH';
    } else if (allDrifts.some((d) => d.category === 'PDP_FORBIDDEN_FLOOR_VIOLATION' || d.category === 'PEP_RUNTIME_MISMATCH')) {
      status = 'INCONSISTENT';
    } else if (allDrifts.some((d) => d.category === 'STALE_RUNTIME_SNAPSHOT')) {
      status = 'STALE_RUNTIME';
    } else if (allDrifts.some((d) => d.category === 'WRONG_POLICY_VERSION')) {
      status = 'VERSION_CONFLICT';
    } else if (allDrifts.some((d) => d.category === 'ROLLBACK_TARGET_MISMATCH' || d.category === 'ROLLBACK_COMMIT_WITHOUT_ACTIVE_STATE')) {
      status = 'ROLLBACK_STATE_CONFLICT';
    } else if (allDrifts.some((d) => d.category === 'SUNSET_STATE_CONFLICT')) {
      status = 'SUNSET_STATE_CONFLICT';
    } else if (allDrifts.some((d) => d.category === 'RECOVERY_STATE_CONFLICT')) {
      status = 'RECOVERY_STATE_CONFLICT';
    } else if (allDrifts.length > 0) {
      status = 'DRIFT_DETECTED';
    }

    const isConsistent = status === 'CONSISTENT' && allDrifts.length === 0;
    const requiresHuman = !isConsistent;

    const provenanceHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          reconciliationId,
          cleanPartition,
          status,
          activePolicyStateId: activeState?.activePolicyStateId ?? null,
          snapshotId: snapshot?.snapshotId ?? null,
          provenanceHeadHash: prvRes.provenanceHeadHash,
        })
      )
      .digest('hex');

    return Object.freeze({
      reconciliationId,
      tenantPartition: cleanPartition,
      activePolicyStateId: activeState?.activePolicyStateId ?? null,
      runtimeSnapshotId: snapshot?.snapshotId ?? null,
      expectedPolicyVersion: activeState?.activePolicyVersion ?? null,
      observedPolicyVersion: snapshot?.policyVersion ?? null,
      status,
      isConsistent,
      detectedDrifts: Object.freeze(allDrifts),
      blockingReasons: Object.freeze(allBlockingReasons),
      verifiedBoundaries: Object.freeze(verifiedBoundaries),
      boundaryCheckResults: Object.freeze(allBoundaryChecks),
      provenanceStatus: prvRes.status,
      rollbackStatus: rbRes.rollbackStatus,
      sunsetStatus: rbRes.sunsetStatus,
      recoveryStatus: rbRes.recoveryStatus,
      checkedAt: new Date().toISOString(),
      provenanceHash,
      isActivePolicy: false,
      isPolicyMutation: false,
      isAutonomousMutation: false,
      requiresHumanIntervention: requiresHuman,
    });
  }
}
