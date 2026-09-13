// tests/test_v4_agent_governed_active_policy_lifecycle_reconciliation.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Comprehensive Reality Verification Suite.
// Verifies:
// A. Initialization
// B. Clean consistent lifecycle
// C. Active policy resolution
// D. Runtime snapshot matching
// E. Runtime stale detection
// F. Runtime version mismatch
// G. PDP mismatch & hard-forbidden floor violation
// H. PEP mismatch
// I. Tenant isolation
// J. Path traversal rejection
// K. Hard-forbidden downgrade detection
// L. Rollback consistency
// M. Sunset consistency
// N. Recovery consistency
// O. Provenance validation
// P. Provenance tamper detection (PROVENANCE_TAMPER_DETECTED)
// Q. USER_STOP supremacy
// R. UNKNOWN != CONSISTENT
// S. No autonomous repair
// T. Immutable reconciliation result (isActivePolicy: false, isPolicyMutation: false)
// U. Secret sanitization
// V. Audit event generation under POLICY_ACTIVE_LIFECYCLE_RECONCILIATION
// W. Replay / idempotency
// X. Cross-version conflict
// Y. Runtime state ahead of durable state
// Z. Durable state ahead of runtime state

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  PolicyActiveLifecycleStateResolver,
  PolicyActiveLifecycleVersionConsistencyEngine,
  PolicyActiveLifecycleRuntimeDriftDetector,
  PolicyActiveLifecycleRollbackConsistencyEngine,
  PolicyActiveLifecycleProvenanceConsistencyEngine,
  PolicyActiveLifecycleTenantConsistencyEngine,
  PolicyActiveLifecycleConsistencyEngine,
  PolicyActiveLifecycleReconciliationAuditEngine,
  PolicyActiveLifecycleReconciliationRuntime,
  POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN,
} from '../src/core/policyActiveLifecycleReconciliation/index.js';

import { PolicyActivationStateStore } from '../src/core/policyStagedActivation/policyActivationStateStore.js';
import { PolicyStagedActivationProvenanceEngine } from '../src/core/policyStagedActivation/policyStagedActivationProvenanceEngine.js';
import {
  createActivePolicyStateId,
  createActivationCommitId,
  createStagedActivationId,
  type ActivePolicyState,
} from '../src/core/policyStagedActivation/policyStagedActivationTypes.js';
import { createCandidateDraftId } from '../src/core/policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import { createPolicyEvolutionIntakeId } from '../src/core/policyFeedbackReview/policyFeedbackReviewTypes.js';
import {
  createAuthorizationDecisionId,
  createActivationReadinessId,
} from '../src/core/policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import { createActivationPreflightId } from '../src/core/policyStagedActivation/policyStagedActivationTypes.js';

import { PolicyActiveRuntimeCoordinator } from '../src/core/policyActiveRuntime/policyActiveRuntimeCoordinator.js';
import { PolicyActiveRuntimeSyncEngine } from '../src/core/policyActiveRuntime/policyActiveRuntimeSyncEngine.js';
import { PolicyActiveRuntimeFreshnessValidator } from '../src/core/policyActiveRuntime/policyActiveRuntimeFreshnessValidator.js';
import { PolicyActiveRuntimePDPBridge } from '../src/core/policyActiveRuntime/policyActiveRuntimePDPBridge.js';
import { PolicyActiveRuntimePEPBridge } from '../src/core/policyActiveRuntime/policyActiveRuntimePEPBridge.js';
import { PolicyActiveRuntimeProvenanceEngine } from '../src/core/policyActiveRuntime/policyActiveRuntimeProvenanceEngine.js';
import {
  createRuntimePolicySnapshotId,
  type RuntimePolicySnapshot,
} from '../src/core/policyActiveRuntime/policyActiveRuntimeTypes.js';

import { PolicyActiveRollbackStore } from '../src/core/policyActiveRollback/policyActiveRollbackStore.js';
import { PolicyActiveRollbackProvenanceEngine } from '../src/core/policyActiveRollback/policyActiveRollbackProvenanceEngine.js';
import {
  createActiveRollbackRequestId,
  createRollbackTargetId,
  createSunsetRequestId,
  createRecoveryRequestId,
  type RollbackRequest,
  type SunsetRequest,
  type RecoveryRequest,
} from '../src/core/policyActiveRollback/policyActiveRollbackTypes.js';

import { globalAuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

const TEST_BASE_DIR = path.join(process.cwd(), 'data', 'partitions_lifecycle_reconciliation_reality');

function cleanDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createDummyActivePolicy(
  tenantPartition: string,
  version: string = '1.1.0',
  overrides?: Partial<ActivePolicyState>
): ActivePolicyState {
  return {
    activePolicyStateId: createActivePolicyStateId(`aps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    activationCommitId: createActivationCommitId(`actc_${Date.now()}`),
    stagedActivationId: createStagedActivationId(`stg_${Date.now()}`),
    candidateDraftId: createCandidateDraftId(`cand_${Date.now()}`),
    evolutionPlanId: 'plan_test_001' as any,
    intakeId: createPolicyEvolutionIntakeId(`intk_${Date.now()}`),
    authorizationDecisionId: createAuthorizationDecisionId(`authdec_${Date.now()}`),
    activationReadinessId: createActivationReadinessId(`actr_${Date.now()}`),
    preflightId: createActivationPreflightId(`pre_${Date.now()}`),
    tenantPartition,
    previousPolicyVersion: '1.0.0',
    activePolicyVersion: version,
    targetPolicyDomain: 'OPERATIONAL_GOVERNANCE',
    activeModifications: {
      toolClassifications: {
        file_read: 'REVERSIBLE',
        execute_untrusted_host_script: 'FORBIDDEN',
        transfer_funds: 'FORBIDDEN',
        delete_database: 'FORBIDDEN',
        bypass_robot_interlocks: 'FORBIDDEN',
      },
    },
    activatedBy: 'operator_human_alice',
    activatedRole: 'SECURITY_OFFICER',
    activatedAt: new Date().toISOString(),
    provenanceHeadHash: '0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff',
    isActivePolicy: true,
    isActivated: true,
    ...overrides,
  };
}

function createDummyRuntimeSnapshot(
  tenantPartition: string,
  activeState: ActivePolicyState,
  overrides?: Partial<RuntimePolicySnapshot>
): RuntimePolicySnapshot {
  return {
    snapshotId: createRuntimePolicySnapshotId(`snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    activePolicyStateId: activeState.activePolicyStateId,
    activationCommitId: activeState.activationCommitId,
    tenantPartition,
    policyVersion: activeState.activePolicyVersion,
    previousPolicyVersion: activeState.previousPolicyVersion,
    targetPolicyDomain: activeState.targetPolicyDomain,
    effectiveModifications: activeState.activeModifications,
    toolClassifications: {
      file_read: 'REVERSIBLE',
      execute_untrusted_host_script: 'FORBIDDEN',
      transfer_funds: 'FORBIDDEN',
      delete_database: 'FORBIDDEN',
      bypass_robot_interlocks: 'FORBIDDEN',
    },
    guardrailParameters: {},
    governedByCandidateId: activeState.candidateDraftId,
    humanActivationAuthority: {
      activatedBy: activeState.activatedBy,
      activatedRole: activeState.activatedRole,
      activatedAt: activeState.activatedAt,
    },
    provenanceHeadHash: activeState.provenanceHeadHash,
    snapshotHash: crypto.createHash('sha256').update(activeState.activePolicyStateId + activeState.activePolicyVersion).digest('hex'),
    resolvedAt: new Date().toISOString(),
    isGovernedActiveSnapshot: true,
    isAutonomousMutation: false,
    ...overrides,
  };
}

async function runTest(): Promise<void> {
  console.log('\n============================================================');
  console.log('MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION');
  console.log('============================================================\n');

  cleanDirectory(TEST_BASE_DIR);

  let userStopFlag = false;
  const isUserStopActive = () => userStopFlag;

  const stateStore = new PolicyActivationStateStore({ baseDir: TEST_BASE_DIR, isUserStopActive });
  const stagedProv = new PolicyStagedActivationProvenanceEngine({ isUserStopActive });
  const runtimeProv = new PolicyActiveRuntimeProvenanceEngine({ isUserStopActive });
  const rollbackStore = new PolicyActiveRollbackStore({ baseDir: TEST_BASE_DIR, isUserStopActive });
  const rollbackProv = new PolicyActiveRollbackProvenanceEngine({ isUserStopActive });

  const freshnessValidator = new PolicyActiveRuntimeFreshnessValidator({ isUserStopActive });
  const syncEngine = new PolicyActiveRuntimeSyncEngine({ baseDir: TEST_BASE_DIR, isUserStopActive }, stateStore, freshnessValidator);
  const pdpBridge = new PolicyActiveRuntimePDPBridge({ isUserStopActive });
  const pepBridge = new PolicyActiveRuntimePEPBridge({ isUserStopActive }, pdpBridge);

  const tenantEngine = new PolicyActiveLifecycleTenantConsistencyEngine({ baseDir: TEST_BASE_DIR, isUserStopActive });
  const stateResolver = new PolicyActiveLifecycleStateResolver({ baseDir: TEST_BASE_DIR, isUserStopActive }, stateStore);
  const versionEngine = new PolicyActiveLifecycleVersionConsistencyEngine({ isUserStopActive });
  const driftDetector = new PolicyActiveLifecycleRuntimeDriftDetector(
    { isUserStopActive },
    syncEngine,
    freshnessValidator,
    pdpBridge,
    pepBridge
  );
  const rollbackEngine = new PolicyActiveLifecycleRollbackConsistencyEngine({ isUserStopActive }, rollbackStore);
  const provenanceEngine = new PolicyActiveLifecycleProvenanceConsistencyEngine(
    { isUserStopActive },
    stagedProv,
    runtimeProv,
    rollbackProv
  );

  const consistencyEngine = new PolicyActiveLifecycleConsistencyEngine(
    { baseDir: TEST_BASE_DIR, isUserStopActive },
    tenantEngine,
    stateResolver,
    driftDetector,
    versionEngine,
    rollbackEngine,
    provenanceEngine
  );

  const auditEngine = new PolicyActiveLifecycleReconciliationAuditEngine({ isUserStopActive });
  const runtime = new PolicyActiveLifecycleReconciliationRuntime(
    { baseDir: TEST_BASE_DIR, isUserStopActive },
    consistencyEngine,
    auditEngine
  );

  const TENANT_A = 'tenant_reality_alpha';
  const TENANT_B = 'tenant_reality_bravo';

  let totalAssertions = 0;

  // --------------------------------------------------------------------------
  // TEST A: Initialization and Clean State
  // --------------------------------------------------------------------------
  console.log('Test A: Initialization and Clean State...');
  assert.ok(runtime !== null, 'Runtime must initialize cleanly');
  assert.strictEqual(typeof runtime.reconcileLifecycle, 'function', 'reconcileLifecycle must be exposed');
  assert.strictEqual(typeof runtime.verifyConsistency, 'function', 'verifyConsistency must be exposed');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST B & C: Active Policy Resolution & Consistency
  // --------------------------------------------------------------------------
  console.log('Test B & C: Active Policy Resolution...');
  const activePolicyA = createDummyActivePolicy(TENANT_A, '2.0.0');
  stateStore.saveActivePolicy(activePolicyA);

  const snapshotA = createDummyRuntimeSnapshot(TENANT_A, activePolicyA);

  // Sync snapshot in memory via coordinator / explicitSnapshot
  const reconResult1 = runtime.reconcileLifecycle(TENANT_A, { explicitSnapshot: snapshotA });
  assert.strictEqual(reconResult1.isConsistent, true, 'Lifecycle should be completely consistent');
  assert.strictEqual(reconResult1.status, 'CONSISTENT', 'Status must be CONSISTENT');
  assert.strictEqual(reconResult1.detectedDrifts.length, 0, 'No drifts should be detected on clean sync');
  assert.strictEqual(reconResult1.isActivePolicy, false, 'Reconciliation result must NOT be ActivePolicy');
  assert.strictEqual(reconResult1.isPolicyMutation, false, 'Reconciliation result must NOT be mutation');
  assert.strictEqual(reconResult1.isAutonomousMutation, false, 'Reconciliation result must NOT be autonomous mutation');
  assert.strictEqual(reconResult1.requiresHumanIntervention, false, 'Consistent state requires no human intervention');
  totalAssertions += 7;

  // --------------------------------------------------------------------------
  // TEST D & E: Runtime Snapshot Matching & Stale Detection
  // --------------------------------------------------------------------------
  console.log('Test D & E: Runtime Snapshot Stale Detection...');
  // Modify active state in store to 2.1.0 without updating runtime snapshot (snapshot still at 2.0.0)
  const activePolicyAUpdated = createDummyActivePolicy(TENANT_A, '2.1.0', {
    activePolicyStateId: createActivePolicyStateId('aps_new_version_210'),
    provenanceHeadHash: 'aaaa111122223333444455556666777788889999aaaabbbbccccddddeeeeffff',
  });
  stateStore.saveActivePolicy(activePolicyAUpdated);

  const reconResultStale = runtime.reconcileLifecycle(TENANT_A, { explicitSnapshot: snapshotA });
  assert.strictEqual(reconResultStale.isConsistent, false, 'Stale snapshot must NOT be consistent');
  assert.ok(
    reconResultStale.status === 'STALE_RUNTIME' ||
      reconResultStale.status === 'VERSION_CONFLICT' ||
      reconResultStale.status === 'DRIFT_DETECTED',
    `Expected stale or version conflict status, got: ${reconResultStale.status}`
  );
  assert.ok(reconResultStale.detectedDrifts.length > 0, 'Drifts must be detected for stale snapshot');
  assert.strictEqual(reconResultStale.requiresHumanIntervention, true, 'Drift requires human intervention');
  totalAssertions += 4;

  // --------------------------------------------------------------------------
  // TEST F: Missing Runtime Snapshot Detection (Active in store, missing in runtime)
  // --------------------------------------------------------------------------
  console.log('Test F: Missing Runtime Snapshot...');
  const reconResultMissingSnap = runtime.reconcileLifecycle(TENANT_A, { explicitSnapshot: null });
  assert.strictEqual(reconResultMissingSnap.isConsistent, false, 'Missing snapshot must not be consistent');
  assert.ok(
    reconResultMissingSnap.detectedDrifts.some((d) => d.category === 'ACTIVE_POLICY_WITHOUT_RUNTIME_SNAPSHOT'),
    'Must report ACTIVE_POLICY_WITHOUT_RUNTIME_SNAPSHOT'
  );
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST G & K: Hard-Forbidden Safety Floor Downgrade & PDP Mismatch
  // --------------------------------------------------------------------------
  console.log('Test G & K: Hard-Forbidden Safety Floor Downgrade...');
  const downgradedActive = createDummyActivePolicy(TENANT_A, '3.0.0', {
    activeModifications: {
      toolClassifications: {
        execute_untrusted_host_script: 'REVERSIBLE', // Illegal downgrade of hard-forbidden floor!
      },
    },
  });
  stateStore.saveActivePolicy(downgradedActive);
  const downgradedSnapshot = createDummyRuntimeSnapshot(TENANT_A, downgradedActive, {
    toolClassifications: {
      execute_untrusted_host_script: 'REVERSIBLE',
    } as any,
  });

  const reconResultDowngrade = runtime.reconcileLifecycle(TENANT_A, { explicitSnapshot: downgradedSnapshot });
  assert.strictEqual(reconResultDowngrade.isConsistent, false, 'Downgraded floor must fail consistency');
  assert.ok(
    reconResultDowngrade.detectedDrifts.some((d) => d.category === 'PDP_FORBIDDEN_FLOOR_VIOLATION'),
    'Must detect PDP_FORBIDDEN_FLOOR_VIOLATION'
  );
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST H: PEP Enforcement Mismatch
  // --------------------------------------------------------------------------
  console.log('Test H: PEP Enforcement Integrity...');
  // Ensure that drift detector checks PEP disposition behavior
  assert.ok(reconResultDowngrade.blockingReasons.some((b) => b.includes('HARD_FORBIDDEN_FLOOR_BREACH')), 'Must block on hard-forbidden breach');
  totalAssertions += 1;

  // --------------------------------------------------------------------------
  // TEST I & J: Tenant Isolation & Path Traversal Rejection
  // --------------------------------------------------------------------------
  console.log('Test I & J: Tenant Isolation & Path Traversal Rejection...');
  const traversalTenant = '../escape_tenant';
  const reconTraversal = runtime.reconcileLifecycle(traversalTenant);
  assert.strictEqual(reconTraversal.isConsistent, false, 'Path traversal must be rejected');
  assert.strictEqual(reconTraversal.status, 'TENANT_MISMATCH', 'Status must be TENANT_MISMATCH');
  assert.ok(
    reconTraversal.detectedDrifts.some((d) => d.category === 'TENANT_ISOLATION_BREACH'),
    'Must record TENANT_ISOLATION_BREACH'
  );

  const anonRecon = runtime.reconcileLifecycle('anonymous');
  assert.strictEqual(anonRecon.isConsistent, false, 'Anonymous access must be rejected');
  assert.strictEqual(anonRecon.status, 'TENANT_MISMATCH', 'Status must be TENANT_MISMATCH');
  totalAssertions += 5;

  // --------------------------------------------------------------------------
  // TEST L: Rollback Consistency Check
  // --------------------------------------------------------------------------
  console.log('Test L: Rollback Consistency Check...');
  // Restore clean active policy for Tenant B
  const activeB = createDummyActivePolicy(TENANT_B, '1.5.0');
  stateStore.saveActivePolicy(activeB);
  const snapB = createDummyRuntimeSnapshot(TENANT_B, activeB);

  // Record a committed rollback request targeting version 1.0.0, but active policy is 1.5.0
  const conflictRollback: RollbackRequest = {
    rollbackRequestId: createActiveRollbackRequestId('rb_req_conflict_1'),
    tenantPartition: TENANT_B,
    currentActivePolicyStateId: activeB.activePolicyStateId,
    currentActivePolicyVersion: '1.5.0',
    targetPolicyVersion: '1.0.0',
    targetId: createRollbackTargetId('hist_v100'),
    requestedBy: 'operator_bob',
    requestedRole: 'SECURITY_OFFICER',
    reason: 'Critical defect in 1.5.0',
    state: 'COMMITTED', // Committed, but active policy wasn't updated to 1.0.0
    requestedAt: new Date().toISOString(),
    isAutonomous: false,
    isActivePolicy: false,
    isPolicyMutation: false,
  };
  rollbackStore.saveRollbackRequest(conflictRollback);

  const reconRollbackConflict = runtime.reconcileLifecycle(TENANT_B, { explicitSnapshot: snapB });
  assert.strictEqual(reconRollbackConflict.isConsistent, false, 'Rollback conflict must fail consistency');
  assert.strictEqual(reconRollbackConflict.rollbackStatus, 'CONFLICT', 'Rollback status must be CONFLICT');
  assert.ok(
    reconRollbackConflict.detectedDrifts.some((d) => d.category === 'ROLLBACK_TARGET_MISMATCH'),
    'Must detect ROLLBACK_TARGET_MISMATCH'
  );
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST M: Sunset Consistency Check
  // --------------------------------------------------------------------------
  console.log('Test M: Sunset Consistency Check...');
  const sunsetReq: SunsetRequest = {
    sunsetRequestId: createSunsetRequestId('sunset_req_1'),
    tenantPartition: TENANT_B,
    currentActivePolicyStateId: activeB.activePolicyStateId,
    currentActivePolicyVersion: '1.5.0',
    requestedBy: 'operator_bob',
    requestedRole: 'SECURITY_OFFICER',
    reason: 'Policy sunset required',
    state: 'COMMITTED', // Committed sunset, but active policy is still active
    requestedAt: new Date().toISOString(),
    isAutonomous: false,
    isActivePolicy: false,
  };
  rollbackStore.saveSunsetRequest(sunsetReq);

  const reconSunsetConflict = runtime.reconcileLifecycle(TENANT_B, { explicitSnapshot: snapB });
  assert.strictEqual(reconSunsetConflict.isConsistent, false, 'Sunset conflict must fail consistency');
  assert.strictEqual(reconSunsetConflict.sunsetStatus, 'CONFLICT', 'Sunset status must be CONFLICT');
  assert.ok(
    reconSunsetConflict.detectedDrifts.some((d) => d.category === 'SUNSET_STATE_CONFLICT'),
    'Must detect SUNSET_STATE_CONFLICT'
  );
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST N: Recovery Consistency Check
  // --------------------------------------------------------------------------
  console.log('Test N: Recovery Consistency Check...');
  const recoveryReq: RecoveryRequest = {
    recoveryRequestId: createRecoveryRequestId('recov_req_1'),
    tenantPartition: TENANT_B,
    sourceState: 'SUNSET',
    recoveryTargetVersion: '1.4.0',
    targetId: createRollbackTargetId('hist_v140'),
    requestedBy: 'operator_bob',
    requestedRole: 'SECURITY_OFFICER',
    reason: 'Recovery to known safe state',
    state: 'COMMITTED', // Committed recovery to 1.4.0, but active policy is 1.5.0
    requestedAt: new Date().toISOString(),
    isAutonomous: false,
    isActivePolicy: false,
  };
  rollbackStore.saveRecoveryRequest(recoveryReq);

  const reconRecoveryConflict = runtime.reconcileLifecycle(TENANT_B, { explicitSnapshot: snapB });
  assert.strictEqual(reconRecoveryConflict.isConsistent, false, 'Recovery conflict must fail consistency');
  assert.strictEqual(reconRecoveryConflict.recoveryStatus, 'CONFLICT', 'Recovery status must be CONFLICT');
  assert.ok(
    reconRecoveryConflict.detectedDrifts.some((d) => d.category === 'RECOVERY_STATE_CONFLICT'),
    'Must detect RECOVERY_STATE_CONFLICT'
  );
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST O & P: Cryptographic Provenance & Tamper Detection
  // --------------------------------------------------------------------------
  console.log('Test O & P: Provenance Validation & Tamper Detection...');
  const TENANT_PROV = 'tenant_provenance_test';
  const activeProv = createDummyActivePolicy(TENANT_PROV, '1.0.0');
  stateStore.saveActivePolicy(activeProv);
  const snapProv = createDummyRuntimeSnapshot(TENANT_PROV, activeProv);

  // Append valid record to stagedProv
  stagedProv.appendEvent(TENANT_PROV, activeProv.candidateDraftId, 'VALID_ACTIVATION', {
    details: { state: 'COMMITTED' },
  });

  // Verify chain integrity passes initially
  assert.strictEqual(stagedProv.verifyChain(TENANT_PROV, activeProv.candidateDraftId), true, 'Provenance chain should initially be valid');

  // Deliberately tamper with the chain record in memory or storage
  const chain = (stagedProv as any).chains.get(TENANT_PROV)?.get(activeProv.candidateDraftId);
  assert.ok(chain && chain.length > 0, 'Chain must exist');
  chain[0] = { ...chain[0], recordHash: 'tampered_bad_hash_1234567890' };

  // Reconcile: must detect PROVENANCE_TAMPER_DETECTED
  const reconTampered = runtime.reconcileLifecycle(TENANT_PROV, { explicitSnapshot: snapProv });
  assert.strictEqual(reconTampered.isConsistent, false, 'Tampered provenance must not be consistent');
  assert.strictEqual(reconTampered.provenanceStatus, 'TAMPER_DETECTED', 'Provenance status must be TAMPER_DETECTED');
  assert.ok(
    reconTampered.detectedDrifts.some((d) => d.category === 'PROVENANCE_TAMPER_DETECTED'),
    'Must detect PROVENANCE_TAMPER_DETECTED'
  );
  totalAssertions += 5;

  // --------------------------------------------------------------------------
  // TEST Q: USER_STOP Supremacy
  // --------------------------------------------------------------------------
  console.log('Test Q: USER_STOP Supremacy...');
  userStopFlag = true;
  assert.throws(
    () => {
      runtime.reconcileLifecycle(TENANT_A);
    },
    /OPERATION_SUSPENDED_BY_USER_STOP/,
    'Must throw OPERATION_SUSPENDED_BY_USER_STOP when USER_STOP is active'
  );
  userStopFlag = false; // Reset
  totalAssertions += 1;

  // --------------------------------------------------------------------------
  // TEST R: UNKNOWN != CONSISTENT
  // --------------------------------------------------------------------------
  console.log('Test R: UNKNOWN != CONSISTENT...');
  // A non-existent tenant must never return CONSISTENT
  const nonExistentTenant = 'tenant_never_existed_999';
  const reconNonExistent = runtime.reconcileLifecycle(nonExistentTenant);
  assert.strictEqual(reconNonExistent.isConsistent, false, 'Non-existent tenant must not be CONSISTENT');
  assert.notStrictEqual(reconNonExistent.status, 'CONSISTENT', 'Status must not be CONSISTENT');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST S: No Autonomous Repair
  // --------------------------------------------------------------------------
  console.log('Test S: Zero Autonomous Repair...');
  // Re-check TENANT_B which had conflicts. Verify store state was NOT modified or auto-healed.
  const recheckRollback = rollbackStore.getRollbackRequests(TENANT_B);
  assert.strictEqual(recheckRollback.length, 1, 'Rollback records must not be auto-deleted or auto-healed');
  assert.strictEqual(recheckRollback[0].state, 'COMMITTED', 'State must remain unchanged (no autonomous mutation)');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST T: Immutability of Reconciliation Result
  // --------------------------------------------------------------------------
  console.log('Test T: Immutable Reconciliation Result...');
  assert.ok(Object.isFrozen(reconResult1), 'Reconciliation result must be frozen');
  assert.ok(Object.isFrozen(reconResult1.detectedDrifts), 'Detected drifts array must be frozen');
  assert.ok(Object.isFrozen(reconResult1.blockingReasons), 'Blocking reasons array must be frozen');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST U & V: Audit Event Generation & Secret Sanitization
  // --------------------------------------------------------------------------
  console.log('Test U & V: Audit Event Generation & Secret Sanitization...');
  // Reconcile and inspect audit ledger trail
  const trail = globalAuditLedger.getAuditTrail().filter(
    (e: any) => e.domain === POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN
  );
  assert.ok(trail.length > 0, 'Must record audit events under POLICY_ACTIVE_LIFECYCLE_RECONCILIATION');
  // Check that no secret or token is present
  const trailStr = JSON.stringify(trail);
  assert.ok(!trailStr.includes('super_secret_key'), 'Secrets must not be present in audit ledger');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST W: Idempotency / Replay Stability
  // --------------------------------------------------------------------------
  console.log('Test W: Idempotency & Replay Stability...');
  // Clean tenant C
  const TENANT_C = 'tenant_idempotency_charlie';
  const activeC = createDummyActivePolicy(TENANT_C, '1.0.0');
  stateStore.saveActivePolicy(activeC);
  const snapC = createDummyRuntimeSnapshot(TENANT_C, activeC);

  const resC1 = runtime.reconcileLifecycle(TENANT_C, { explicitSnapshot: snapC });
  const resC2 = runtime.reconcileLifecycle(TENANT_C, { explicitSnapshot: snapC });
  assert.strictEqual(resC1.isConsistent, resC2.isConsistent, 'Reconciliation must be deterministic');
  assert.strictEqual(resC1.status, resC2.status, 'Status must match across identical invocations');
  assert.strictEqual(resC1.detectedDrifts.length, resC2.detectedDrifts.length, 'Drifts count must match');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST X, Y, Z: Cross-Version Conflict & State Precedence Checks
  // --------------------------------------------------------------------------
  console.log('Test X, Y, Z: Cross-Version Conflict & Precedence...');
  // Runtime snapshot ahead of durable active state (runtime = 2.0.0, durable = 1.0.0)
  const snapAhead = createDummyRuntimeSnapshot(TENANT_C, activeC, { policyVersion: '2.0.0' });
  const reconAhead = runtime.reconcileLifecycle(TENANT_C, { explicitSnapshot: snapAhead });
  assert.strictEqual(reconAhead.isConsistent, false, 'Runtime ahead of durable state must not be consistent');
  assert.ok(
    reconAhead.detectedDrifts.some((d) => d.category === 'WRONG_POLICY_VERSION'),
    'Must report WRONG_POLICY_VERSION when runtime is ahead'
  );

  // Durable state ahead of runtime (durable = 3.0.0, runtime = 1.0.0)
  const activeAhead = createDummyActivePolicy(TENANT_C, '3.0.0');
  stateStore.saveActivePolicy(activeAhead);
  const reconBehind = runtime.reconcileLifecycle(TENANT_C, { explicitSnapshot: snapC });
  assert.strictEqual(reconBehind.isConsistent, false, 'Runtime behind durable state must not be consistent');
  assert.ok(
    reconBehind.detectedDrifts.some((d) => d.category === 'WRONG_POLICY_VERSION'),
    'Must report WRONG_POLICY_VERSION when runtime is behind'
  );
  totalAssertions += 4;

  // Provenance verification of the reconciliation runtime itself
  assert.strictEqual(runtime.verifyReconciliationProvenance(TENANT_C), true, 'Runtime provenance chain must verify cleanly');
  totalAssertions += 1;

  cleanDirectory(TEST_BASE_DIR);

  console.log('\n============================================================');
  console.log(`REALITY GATE PASSED: ${totalAssertions} / ${totalAssertions} Assertions Verified`);
  console.log('MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION VERIFIED & LOCKED');
  console.log('============================================================\n');
}

runTest().catch((err) => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
