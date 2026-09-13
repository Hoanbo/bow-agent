// tests/test_v4_agent_governed_active_policy_incident_resolution.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Comprehensive Reality Verification Suite.
// Verifies:
// A. Initialization & Branded Identifiers
// B. Incident Ingestion & Acknowledgement
// C. Incident Revalidation
// D. Tenant Isolation & Traversal Rejection
// E. USER_STOP Supremacy
// F. Containment Assessment (Read-Only)
// G. Containment Clearance Requirement
// H. Autonomous Clearance Rejection
// I. Human Clearance with Anti-Self-Approval
// J. Anti-Self-Approval Enforcement
// K. Invalid Operator Rejection
// L. Recovery Authorization Preparation
// M. Autonomous Recovery Authorization Rejection
// N. Invalid Recovery Target Rejection
// O. Cross-Tenant Recovery Target Rejection
// P. Hard-Forbidden Floor Preservation
// Q. Recovery Handoff to MS-1.3.72
// R. Zero Direct Recovery Implementation
// S. Recovery Verification
// T. Runtime Synchronization Verification
// U. PDP Verification
// V. PEP Verification
// W. Reconciliation Verification
// X. Provenance Integrity
// Y. Provenance Tamper Detection
// Z. Audit Ledger Verification
// AA. Incident Resolution Confirmation
// AB. Premature Closure Rejection
// AC. Human Closure Boundary
// AD. Incident History Immutability
// AE. Idempotency & Replay Safety
// AF. Conflicting Terminal Rewrite Rejection
// AG. FAIL_CLOSED Preservation
// AH. RESTRICTED_FALLBACK Support
// AI. Secret Sanitization
// AJ. Forbidden Primitive Scan
// AK. Authority Leakage Scan

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  createIncidentResolutionRequestId,
  createContainmentAssessmentId,
  createContainmentClearanceId,
  createRecoveryAuthorizationId,
  createRecoveryHandoffId,
  createRecoveryVerificationId,
  createResolutionConfirmationId,
  createIncidentClosureId,
  createResolutionProvenanceId,
  PolicyIncidentResolutionRevalidationEngine,
  PolicyContainmentAssessmentEngine,
  PolicyContainmentClearanceBoundary,
  PolicyRecoveryAuthorizationEngine,
  PolicyIncidentRecoveryHandoffEngine,
  PolicyIncidentRecoveryVerificationEngine,
  PolicyIncidentResolutionEngine,
  PolicyIncidentClosureBoundary,
  PolicyActiveIncidentResolutionStore,
  PolicyActiveIncidentResolutionProvenanceEngine,
  PolicyActiveIncidentResolutionAuditEngine,
  PolicyActiveIncidentResolutionRuntime,
  POLICY_ACTIVE_INCIDENT_RESOLUTION_AUDIT_DOMAIN,
} from '../src/core/policyActiveIncidentResolution/index.js';

import {
  PolicyActiveIncidentStore,
  PolicyEmergencySafetyBoundary,
  createActiveIncidentId,
  type ActivePolicyIncidentRecord,
} from '../src/core/policyActiveIncidentResponse/index.js';

import {
  PolicyActiveRollbackRuntime,
  PolicyActiveRollbackStore,
  createRollbackTargetId,
  ROLLBACK_HARD_FORBIDDEN_ACTIONS,
  type HistoricalPolicyVersion,
} from '../src/core/policyActiveRollback/index.js';

import {
  PolicyActivationStateStore,
  createActivePolicyStateId,
  createActivationCommitId,
  createStagedActivationId,
  type ActivePolicyState,
} from '../src/core/policyStagedActivation/index.js';

import {
  createRuntimePolicySnapshotId,
  type RuntimePolicySnapshot,
} from '../src/core/policyActiveRuntime/index.js';

import { globalAuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

const TEST_BASE_DIR = path.join(process.cwd(), 'data', 'partitions_incident_resolution_reality');

function cleanDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createDummyActivePolicy(
  tenant: string,
  version: string = '1.0.0',
  overrides: Partial<ActivePolicyState> = {}
): ActivePolicyState {
  return Object.freeze({
    activePolicyStateId: createActivePolicyStateId(`aps_${tenant}_${version}`),
    activationCommitId: createActivationCommitId(`act_commit_${Date.now()}`),
    stagedActivationId: createStagedActivationId(`stg_${Date.now()}`),
    candidateDraftId: `cand_${Date.now()}` as any,
    evolutionPlanId: `plan_${Date.now()}` as any,
    intakeId: `intk_${Date.now()}` as any,
    authorizationDecisionId: `auth_dec_${Date.now()}` as any,
    activationReadinessId: `act_ready_${Date.now()}` as any,
    preflightId: `prefl_${Date.now()}` as any,
    tenantPartition: tenant,
    previousPolicyVersion: '0.9.0',
    activePolicyVersion: version,
    targetPolicyDomain: 'FINANCIAL',
    activeModifications: { max_transaction_limit: 5000 },
    activatedBy: 'sec_admin_carol',
    activatedRole: 'SECURITY_ADMIN' as const,
    activatedAt: new Date().toISOString(),
    provenanceHeadHash: '0000000000000000000000000000000000000000000000000000000000000000',
    isActivePolicy: true as const,
    isActivated: true as const,
    ...overrides,
  });
}

function createDummyHistoricalVersion(
  tenant: string,
  version: string = '1.0.0',
  overrides: Partial<HistoricalPolicyVersion> = {}
): HistoricalPolicyVersion {
  return Object.freeze({
    targetId: createRollbackTargetId(`target_${tenant}_${version}`),
    tenantPartition: tenant,
    policyVersion: version,
    activePolicyStateId: `aps_${tenant}_${version}`,
    activationCommitId: `commit_${tenant}_${version}`,
    targetPolicyDomain: 'FINANCIAL',
    policyModifications: { max_transaction_limit: 5000 },
    activatedBy: 'sec_admin_carol',
    activatedRole: 'SECURITY_ADMIN',
    activatedAt: new Date().toISOString(),
    provenanceHeadHash: '1111111111111111111111111111111111111111111111111111111111111111',
    verified: true,
    isHardForbiddenProtected: true,
    isActivePolicy: false as const,
    ...overrides,
  });
}

function createDummyIncident(
  tenant: string,
  incidentIdStr: string,
  overrides: Partial<ActivePolicyIncidentRecord> = {}
): ActivePolicyIncidentRecord {
  return Object.freeze({
    incidentId: createActiveIncidentId(incidentIdStr),
    tenantPartition: tenant,
    fingerprint: `fp_${incidentIdStr}`,
    activePolicyStateId: createActivePolicyStateId(`aps_${tenant}_1.0.0`),
    runtimeSnapshotId: createRuntimePolicySnapshotId(`snap_${tenant}_1.0.0`),
    severity: 'CRITICAL' as const,
    state: 'SAFETY_BOUNDARY_ACTIVE' as const,
    primaryCategory: 'HARD_FORBIDDEN_FLOOR_BREACH' as const,
    signals: [],
    safetyBoundaryStatus: 'ACTIVE' as const,
    escalationId: null,
    detectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    resolutionRationale: null,
    isActivePolicy: false as const,
    isPolicyMutation: false as const,
    isAutonomousMutation: false as const,
    isAutonomousRollback: false as const,
    ...overrides,
  });
}

async function runTest(): Promise<void> {
  console.log('\n============================================================');
  console.log('BOWCON V4 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION');
  console.log('REALITY VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  cleanDirectory(TEST_BASE_DIR);
  let totalAssertions = 0;

  const TENANT_A = 'tenant_corp_alpha';
  const TENANT_B = 'tenant_corp_beta';

  // --------------------------------------------------------------------------
  console.log('Test A: Initialization & Branded Identifiers...');
  // --------------------------------------------------------------------------
  const resReqId = createIncidentResolutionRequestId('resreq_1');
  const assId = createContainmentAssessmentId('ass_1');
  const clrId = createContainmentClearanceId('clr_1');
  const authId = createRecoveryAuthorizationId('auth_1');
  const hndId = createRecoveryHandoffId('hnd_1');
  const verId = createRecoveryVerificationId('ver_1');
  const confId = createResolutionConfirmationId('conf_1');
  const clsId = createIncidentClosureId('cls_1');
  const prvId = createResolutionProvenanceId('prv_1');

  assert.strictEqual(resReqId, 'resreq_1');
  assert.strictEqual(assId, 'ass_1');
  assert.strictEqual(clrId, 'clr_1');
  assert.strictEqual(authId, 'auth_1');
  assert.strictEqual(hndId, 'hnd_1');
  assert.strictEqual(verId, 'ver_1');
  assert.strictEqual(confId, 'conf_1');
  assert.strictEqual(clsId, 'cls_1');
  assert.strictEqual(prvId, 'prv_1');

  assert.throws(() => createContainmentClearanceId(''), /INVALID_CONTAINMENT_CLEARANCE_ID/);
  assert.throws(() => createRecoveryAuthorizationId('   '), /INVALID_RECOVERY_AUTHORIZATION_ID/);
  assert.throws(() => createIncidentClosureId(''), /INVALID_INCIDENT_CLOSURE_ID/);
  totalAssertions += 12;

  // --------------------------------------------------------------------------
  console.log('Test B: Incident Ingestion & Acknowledgement...');
  // --------------------------------------------------------------------------
  const incidentStore = new PolicyActiveIncidentStore({ baseDir: TEST_BASE_DIR });
  const safetyBoundary = new PolicyEmergencySafetyBoundary();
  const stateStore = new PolicyActivationStateStore({ baseDir: TEST_BASE_DIR });
  const resolutionStore = new PolicyActiveIncidentResolutionStore({ baseDir: TEST_BASE_DIR });

  const activeAInit = createDummyActivePolicy(TENANT_A, '1.1.0');
  stateStore.saveActivePolicy(activeAInit);


  const incA1 = createDummyIncident(TENANT_A, 'inc_001', {
    state: 'DETECTED',
    safetyBoundaryStatus: 'ACTIVE',
    activePolicyStateId: activeAInit.activePolicyStateId,
  });
  incidentStore.saveIncident(incA1);
  safetyBoundary.activateSafetyBoundary(TENANT_A, incA1.incidentId, 'ACTIVE', 'Hard forbidden breach');


  const runtime = new PolicyActiveIncidentResolutionRuntime(
    { baseDir: TEST_BASE_DIR },
    {
      incidentStore,
      safetyBoundary,
      stateStore,
      resolutionStore,
    }
  );

  const ackResult = runtime.acknowledgeIncident({
    tenantPartition: TENANT_A,
    incidentId: incA1.incidentId,
    operatorId: 'sec_admin_alice',
    operatorRole: 'SECURITY_ADMIN',
    acknowledgementNote: 'Investigating anomalous containment breach',
  });

  assert.strictEqual(ackResult.acknowledged, true);
  const reloadedInc = incidentStore.getIncident(TENANT_A, incA1.incidentId);
  assert.strictEqual(reloadedInc?.state, 'AWAITING_HUMAN_REVIEW');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  console.log('Test C: Incident Revalidation...');
  // --------------------------------------------------------------------------
  const reval = runtime.revalidateIncident(TENANT_A, incA1.incidentId);
  assert.strictEqual(reval.valid, true);
  assert.ok(reval.checksPassed.some(c => c.includes('TENANT_PARTITION_VALIDATED')));
  assert.ok(reval.checksPassed.some(c => c.includes('INCIDENT_TENANT_MATCH_VERIFIED')));
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  console.log('Test D: Tenant Isolation & Path Traversal Rejection...');
  // --------------------------------------------------------------------------
  assert.throws(() => {
    runtime.revalidateIncident(TENANT_B, incA1.incidentId);
  }, /INCIDENT_NOT_FOUND/);

  assert.throws(() => {
    resolutionStore.getAssessment('../../bad_dir', 'ass_1');
  }, /Path traversal|STORE_SECURITY_VIOLATION|DurablePersistenceSecurityError/i);

  assert.throws(() => {
    resolutionStore.getClearance('tenant_a\0bad', 'clr_1');
  }, /Null byte|STORE_SECURITY_VIOLATION|DurablePersistenceSecurityError/i);
  totalAssertions += 3;


  // --------------------------------------------------------------------------
  console.log('Test E: USER_STOP Supremacy Across All Operations...');
  // --------------------------------------------------------------------------
  let userStopActive = false;
  const runtimeWithStop = new PolicyActiveIncidentResolutionRuntime(
    {
      baseDir: TEST_BASE_DIR,
      isUserStopActive: () => userStopActive,
    },
    {
      incidentStore,
      safetyBoundary,
      stateStore,
      resolutionStore,
    }
  );

  userStopActive = true;
  assert.throws(() => {
    runtimeWithStop.acknowledgeIncident({
      tenantPartition: TENANT_A,
      incidentId: incA1.incidentId,
      operatorId: 'sec_admin_alice',
    });
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);

  assert.throws(() => {
    runtimeWithStop.assessContainment(TENANT_A, incA1.incidentId);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);

  assert.throws(() => {
    runtimeWithStop.clearContainment({
      tenantPartition: TENANT_A,
      assessmentId: 'ass_any',
      operatorId: 'sec_admin_alice',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Valid rationale here',
    });
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  userStopActive = false;
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  console.log('Test F: Containment Assessment (Read-Only)...');
  // --------------------------------------------------------------------------
  const assessment = runtime.assessContainment(TENANT_A, incA1.incidentId);
  assert.strictEqual(assessment.status, 'CONTAINED');
  assert.strictEqual(assessment.safetyBoundaryStatus, 'ACTIVE');
  assert.strictEqual(assessment.isPolicyMutation, false);
  assert.strictEqual(assessment.isAutonomousClearance, false);
  assert.strictEqual(assessment.isDirectToolExecution, false);
  totalAssertions += 5;

  // --------------------------------------------------------------------------
  console.log('Test G & H: Containment Clearance Requirement & Autonomous Rejection...');
  // --------------------------------------------------------------------------
  // Autonomous persona rejection
  assert.throws(() => {
    runtime.clearContainment({
      tenantPartition: TENANT_A,
      assessmentId: assessment.assessmentId,
      operatorId: 'bot_auto_resolver',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Autonomous routine clearance executed',
    });
  }, /CONTAINMENT_CLEARANCE_REJECTED.*Autonomous persona/);

  assert.throws(() => {
    runtime.clearContainment({
      tenantPartition: TENANT_A,
      assessmentId: assessment.assessmentId,
      operatorId: 'ai_agent_copilot',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'AI automated review clearance',
    });
  }, /CONTAINMENT_CLEARANCE_REJECTED.*Autonomous persona/);

  assert.throws(() => {
    runtime.clearContainment({
      tenantPartition: TENANT_A,
      assessmentId: assessment.assessmentId,
      operatorId: 'anonymous',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Anonymous operator review',
    });
  }, /CONTAINMENT_CLEARANCE_REJECTED.*Autonomous persona/);
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  console.log('Test I, J, K: Human Clearance, Anti-Self-Approval & Operator Validation...');
  // --------------------------------------------------------------------------
  // Anti-self-approval
  assert.throws(() => {
    runtime.clearContainment({
      tenantPartition: TENANT_A,
      assessmentId: assessment.assessmentId,
      operatorId: 'reporter_dave',
      operatorRole: 'INCIDENT_RESPONDER',
      governanceRationale: 'Self clearance by original incident reporter',
      originalReporterId: 'reporter_dave',
    });
  }, /ANTI_SELF_APPROVAL_VIOLATION/);

  // Inadequate rationale (< 10 chars)
  assert.throws(() => {
    runtime.clearContainment({
      tenantPartition: TENANT_A,
      assessmentId: assessment.assessmentId,
      operatorId: 'sec_admin_alice',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Too short',
    });
  }, /CONTAINMENT_CLEARANCE_REJECTED.*governance rationale/);

  // Valid human clearance
  const clearance = runtime.clearContainment({
    tenantPartition: TENANT_A,
    assessmentId: assessment.assessmentId,
    operatorId: 'sec_admin_alice',
    operatorRole: 'SECURITY_ADMIN',
    governanceRationale: 'Containment confirmed and emergency boundary active; cleared for recovery.',
    originalReporterId: 'reporter_dave',
  });

  assert.strictEqual(clearance.isAutonomous, false);
  assert.strictEqual(clearance.operatorId, 'sec_admin_alice');
  assert.strictEqual(clearance.incidentId, incA1.incidentId);
  totalAssertions += 5;

  // --------------------------------------------------------------------------
  console.log('Test L, M, N, O, P: Recovery Authorization & Invariant Protections...');
  // --------------------------------------------------------------------------
  const rollbackStore = new PolicyActiveRollbackStore({ baseDir: TEST_BASE_DIR });
  const rollbackRuntime = new PolicyActiveRollbackRuntime(
    { baseDir: TEST_BASE_DIR },
    undefined,
    stateStore,
    rollbackStore
  );

  // Register historical verified policy for Tenant A
  const histV1 = createDummyHistoricalVersion(TENANT_A, '1.0.0');
  rollbackStore.saveHistoricalPolicy(histV1);

  const runtimeWithRollback = new PolicyActiveIncidentResolutionRuntime(
    { baseDir: TEST_BASE_DIR },
    {
      incidentStore,
      safetyBoundary,
      stateStore,
      resolutionStore,
      rollbackRuntime,
    }
  );

  // Autonomous recovery authorization rejection
  assert.throws(() => {
    runtimeWithRollback.authorizeRecovery({
      tenantPartition: TENANT_A,
      clearanceId: clearance.clearanceId,
      recoveryTargetVersion: '1.0.0',
      operatorId: 'auto_healer_bot',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Autonomous self-healing triggered',
    });
  }, /RECOVERY_AUTHORIZATION_REJECTED.*Autonomous persona/);

  // Invalid recovery target
  assert.throws(() => {
    runtimeWithRollback.authorizeRecovery({
      tenantPartition: TENANT_A,
      clearanceId: clearance.clearanceId,
      recoveryTargetVersion: '9.9.9',
      operatorId: 'lead_eng_bob',
      operatorRole: 'LEAD_ENGINEER',
      governanceRationale: 'Authorizing non-existent version',
    });
  }, /RECOVERY_TARGET_NOT_FOUND/);


  // Cross-tenant recovery target rejection
  const histTenantB = createDummyHistoricalVersion(TENANT_B, '1.0.0');
  rollbackStore.saveHistoricalPolicy(histTenantB);

  assert.throws(() => {
    const authEngine = new PolicyRecoveryAuthorizationEngine();
    authEngine.authorizeRecovery({
      tenantPartition: TENANT_A,
      clearance,
      recoveryTarget: histTenantB,
      operatorId: 'sec_admin_alice',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Authorizing Tenant B version for Tenant A',
      previousProvenanceHash: 'test_hash_123',
    });
  }, /CROSS_TENANT_RECOVERY_BLOCKED/);

  // Hard-forbidden floor preservation
  const badHistTarget = createDummyHistoricalVersion(TENANT_A, '0.8.0', {
    policyModifications: {
      transfer_funds: true, // Hard forbidden action!
    },
  });
  rollbackStore.saveHistoricalPolicy(badHistTarget);

  assert.throws(() => {
    const authEngine = new PolicyRecoveryAuthorizationEngine();
    authEngine.authorizeRecovery({
      tenantPartition: TENANT_A,
      clearance,
      recoveryTarget: badHistTarget,
      operatorId: 'sec_admin_alice',
      operatorRole: 'SECURITY_ADMIN',
      governanceRationale: 'Authorizing version that mutates transfer_funds',
      previousProvenanceHash: 'test_hash_123',
    });
  }, /HARD_FORBIDDEN_FLOOR_BREACH/);

  // Anti-self-approval on recovery authorization
  assert.throws(() => {
    const authEngine = new PolicyRecoveryAuthorizationEngine();
    authEngine.authorizeRecovery({
      tenantPartition: TENANT_A,
      clearance,
      recoveryTarget: histV1,
      operatorId: 'requester_dan',
      operatorRole: 'OPERATOR',
      governanceRationale: 'Self-authorizing recovery proposal',
      originalRequesterId: 'requester_dan',
      previousProvenanceHash: 'test_hash_123',
    });
  }, /ANTI_SELF_APPROVAL_VIOLATION/);

  // Valid recovery authorization


  const recoveryAuth = runtimeWithRollback.authorizeRecovery({
    tenantPartition: TENANT_A,
    clearanceId: clearance.clearanceId,
    recoveryTargetVersion: '1.0.0',
    operatorId: 'sec_admin_alice',
    operatorRole: 'HUMAN_SECURITY_ADMIN' as any,
    governanceRationale: 'Recovery to known verified baseline 1.0.0 authorized after containment.',
    originalRequesterId: 'reporter_dave',
  });


  assert.strictEqual(recoveryAuth.isAutonomous, false);
  assert.strictEqual(recoveryAuth.isRecoveryExecution, false);
  assert.strictEqual(recoveryAuth.recoveryTargetVersion, '1.0.0');
  totalAssertions += 8;

  // --------------------------------------------------------------------------
  console.log('Test Q & R: Recovery Handoff to MS-1.3.72 (Delegated Execution)...');
  // --------------------------------------------------------------------------
  const handoffResult = runtimeWithRollback.handoffRecovery({
    tenantPartition: TENANT_A,
    authorizationId: recoveryAuth.authorizationId,
  });

  assert.strictEqual(handoffResult.handoffRecord.handoffStatus, 'HANDED_OFF');
  assert.strictEqual(handoffResult.handoffRecord.targetPolicyVersion, '1.0.0');
  assert.ok(handoffResult.commitResult.commitId !== undefined, 'Handoff must receive commit result from MS-1.3.72');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  console.log('Test S, T, U, V, W: Multi-Layer Recovery Verification...');
  // --------------------------------------------------------------------------
  // Update state store with active policy version 1.0.0 committed by MS-1.3.72
  const activeRecovered = createDummyActivePolicy(TENANT_A, '1.0.0');
  stateStore.saveActivePolicy(activeRecovered);

  const snapA: RuntimePolicySnapshot = Object.freeze({
    snapshotId: createRuntimePolicySnapshotId('snap_recovered_1'),
    activePolicyStateId: activeRecovered.activePolicyStateId,
    activationCommitId: activeRecovered.activationCommitId,
    tenantPartition: TENANT_A,
    policyVersion: '1.0.0',
    previousPolicyVersion: '0.9.0',
    targetPolicyDomain: 'FINANCIAL',
    effectiveModifications: { max_transaction_limit: 5000 },
    toolClassifications: {},
    guardrailParameters: {},
    governedByCandidateId: 'cand_test' as any,
    humanActivationAuthority: {
      activatedBy: 'sec_admin_carol',
      activatedRole: 'SECURITY_ADMIN',
      activatedAt: new Date().toISOString(),
    },
    provenanceHeadHash: '1111111111111111111111111111111111111111111111111111111111111111',
    snapshotHash: '2222222222222222222222222222222222222222222222222222222222222222',
    resolvedAt: new Date().toISOString(),
    isGovernedActiveSnapshot: true as const,
    isAutonomousMutation: false as const,
  });

  // Verify recovery using verification engine directly with inputs
  const verEngine = new PolicyIncidentRecoveryVerificationEngine();
  const verResult = verEngine.verifyRecovery({
    tenantPartition: TENANT_A,
    handoffRecord: handoffResult.handoffRecord,
    activePolicyState: activeRecovered,
    runtimeSnapshot: snapA,
    safetyBoundary: safetyBoundary.getBoundaryState(TENANT_A),
  });

  assert.strictEqual(verResult.status, 'VERIFIED');
  assert.strictEqual(verResult.activePolicyVerified, true);
  assert.strictEqual(verResult.runtimeSnapshotSynchronized, true);
  assert.strictEqual(verResult.pdpSafetyFloorVerified, true);
  assert.strictEqual(verResult.pepEnforcementConsistent, true);
  assert.strictEqual(verResult.isAutoRepairAttempted, false);
  assert.strictEqual(verResult.isAutoResyncAttempted, false);
  resolutionStore.saveRecoveryVerification(verResult);
  totalAssertions += 7;

  // Discrepancy test: snapshot version mismatch
  const mismatchedSnap = { ...snapA, policyVersion: '0.5.0' };
  const verMismatch = verEngine.verifyRecovery({
    tenantPartition: TENANT_A,
    handoffRecord: handoffResult.handoffRecord,
    activePolicyState: activeRecovered,
    runtimeSnapshot: mismatchedSnap as any,
    safetyBoundary: safetyBoundary.getBoundaryState(TENANT_A),
  });
  assert.strictEqual(verMismatch.status, 'FAILED');
  assert.ok(verMismatch.discrepancyDetails.some(d => d.includes('POLICY_VERSION_MISMATCH') || d.includes('RUNTIME_SNAPSHOT_VERSION_MISMATCH')));
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  console.log('Test X & Y: Provenance Integrity & Tamper Detection...');
  // --------------------------------------------------------------------------
  const prvEngine = runtimeWithRollback.getProvenanceEngine();
  const chainRecords = prvEngine.getRecords(TENANT_A);
  assert.ok(chainRecords.length >= 4, 'Chain must have recorded all preceding events');
  assert.strictEqual(prvEngine.verifyChainIntegrity(TENANT_A), true);

  // Tamper test: modify provenance file
  const chainPath = path.join(TEST_BASE_DIR, TENANT_A, 'policy_incident_resolution', 'resolution_provenance.jsonl');
  const rawContent = fs.readFileSync(chainPath, 'utf8');
  const tamperedContent = rawContent.replace('"recordHash":"', '"recordHash":"TAMPERED_');
  fs.writeFileSync(chainPath, tamperedContent, 'utf8');

  // New engine reading tampered file must throw PROVENANCE_TAMPER_DETECTED
  const freshPrvEngine = new PolicyActiveIncidentResolutionProvenanceEngine({ baseDir: TEST_BASE_DIR });
  assert.throws(() => {
    freshPrvEngine.getHeadHash(TENANT_A);
  }, /PROVENANCE_TAMPER_DETECTED/);

  // Restore clean content
  fs.writeFileSync(chainPath, rawContent, 'utf8');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  console.log('Test Z: Audit Ledger Verification...');
  // --------------------------------------------------------------------------
  const auditEntries = globalAuditLedger.getTrail({ domain: POLICY_ACTIVE_INCIDENT_RESOLUTION_AUDIT_DOMAIN });
  assert.ok(auditEntries.length >= 4, 'Audit ledger must contain incident resolution domain events');
  assert.ok(auditEntries.some((e: any) => e.toolName === 'incident_resolution_incident_acknowledged'));
  assert.ok(auditEntries.some((e: any) => e.toolName === 'incident_resolution_containment_clearance_granted'));
  assert.ok(auditEntries.some((e: any) => e.toolName === 'incident_resolution_recovery_authorization_granted'));
  totalAssertions += 4;


  // --------------------------------------------------------------------------
  console.log('Test AA & AB: Incident Resolution Confirmation & Premature Closure Rejection...');
  // --------------------------------------------------------------------------
  // Confirm resolution with verified recovery
  const resolution = runtimeWithRollback.confirmResolution({
    tenantPartition: TENANT_A,
    incidentId: incA1.incidentId,
    clearanceId: clearance.clearanceId,
    verificationId: verResult.verificationId,
  });

  assert.strictEqual(resolution.status, 'CONFIRMED');
  assert.strictEqual(resolution.resolutionMode, 'RECOVERY_VERIFIED');
  assert.strictEqual(resolution.isAutonomousClosure, false);

  const resolvedInc = incidentStore.getIncident(TENANT_A, incA1.incidentId);
  assert.strictEqual(resolvedInc?.state, 'RESOLVED');
  totalAssertions += 4;

  // Premature closure rejection: cannot close without confirmed resolution
  const unconfirmedRes = {
    ...resolution,
    resolutionId: createResolutionConfirmationId('res_rejected_1'),
    status: 'REJECTED' as const,
  };
  resolutionStore.saveResolution(unconfirmedRes as any);

  assert.throws(() => {
    runtimeWithRollback.closeIncident({
      tenantPartition: TENANT_A,
      resolutionId: unconfirmedRes.resolutionId,
      operatorId: 'sec_admin_alice',
      operatorRole: 'SECURITY_ADMIN',
      closureRationale: 'Attempting closure on rejected resolution',
    });
  }, /INCIDENT_CLOSURE_REJECTED/);
  totalAssertions += 1;

  // --------------------------------------------------------------------------
  console.log('Test AC, AD, AF: Human Incident Closure Boundary & Immutability...');
  // --------------------------------------------------------------------------
  // Autonomous closure rejection
  assert.throws(() => {
    runtimeWithRollback.closeIncident({
      tenantPartition: TENANT_A,
      resolutionId: resolution.resolutionId,
      operatorId: 'bot_auto_closer',
      operatorRole: 'SECURITY_ADMIN',
      closureRationale: 'Auto closure post verification',
    });
  }, /INCIDENT_CLOSURE_REJECTED.*Autonomous persona/);

  // Valid human closure
  const closure = runtimeWithRollback.closeIncident({
    tenantPartition: TENANT_A,
    resolutionId: resolution.resolutionId,
    operatorId: 'sec_admin_alice',
    operatorRole: 'SECURITY_ADMIN',
    closureRationale: 'All recovery verification criteria met and incident resolved. Final closure.',
    originalReporterId: 'reporter_dave',
  });

  assert.strictEqual(closure.isAutonomous, false);
  assert.strictEqual(closure.isIncidentDeleted, false);
  assert.strictEqual(closure.isHistoryRewritten, false);

  const closedInc = incidentStore.getIncident(TENANT_A, incA1.incidentId);
  assert.strictEqual(closedInc?.state, 'CLOSED');
  totalAssertions += 5;

  // Conflicting terminal rewrite rejection: cannot rewrite closed terminal record
  assert.throws(() => {
    resolutionStore.saveClosure(closure);
  }, /CONFLICTING_TERMINAL_REWRITE/);
  totalAssertions += 1;

  // --------------------------------------------------------------------------
  console.log('Test AE: Idempotency & Replay Safety...');
  // --------------------------------------------------------------------------
  const fetchedAssessment = resolutionStore.getAssessment(TENANT_A, assessment.assessmentId);
  assert.strictEqual(fetchedAssessment?.assessmentId, assessment.assessmentId);

  const fetchedClearance = resolutionStore.getClearance(TENANT_A, clearance.clearanceId);
  assert.strictEqual(fetchedClearance?.clearanceId, clearance.clearanceId);

  const fetchedResolution = resolutionStore.getResolution(TENANT_A, resolution.resolutionId);
  assert.strictEqual(fetchedResolution?.resolutionId, resolution.resolutionId);
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  console.log('Test AG: FAIL_CLOSED Safety Posture Preservation...');
  // --------------------------------------------------------------------------
  const failClosedBoundaryState: any = {
    boundaryActivationId: 'sba_fc_1',
    tenantPartition: TENANT_A,
    incidentId: incA1.incidentId,
    status: 'FAIL_CLOSED',
    reason: 'Active critical containment breach',
    activatedAt: new Date().toISOString(),
    allowsReadOnlyFallback: false,
    enforcesHardForbiddenFloor: true,
    isPolicyAuthority: false,
  };

  const verFailClosed = verEngine.verifyRecovery({
    tenantPartition: TENANT_A,
    handoffRecord: handoffResult.handoffRecord,
    activePolicyState: activeRecovered,
    runtimeSnapshot: snapA,
    safetyBoundary: failClosedBoundaryState,
  });

  assert.strictEqual(verFailClosed.status, 'FAILED');
  assert.ok(verFailClosed.discrepancyDetails.some(d => d.includes('FAIL_CLOSED')));
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  console.log('Test AH: RESTRICTED_FALLBACK Support & Non-Recovery Resolution...');
  // --------------------------------------------------------------------------
  const incA2 = createDummyIncident(TENANT_A, 'inc_002', {
    state: 'DETECTED',
    severity: 'DEGRADED',
    safetyBoundaryStatus: 'RESTRICTED_FALLBACK',
  });
  incidentStore.saveIncident(incA2);

  const assessA2 = runtimeWithRollback.assessContainment(TENANT_A, incA2.incidentId);
  assert.strictEqual(assessA2.status, 'CONTAINED');

  const clearA2 = runtimeWithRollback.clearContainment({
    tenantPartition: TENANT_A,
    assessmentId: assessA2.assessmentId,
    operatorId: 'sec_admin_alice',
    operatorRole: 'SECURITY_ADMIN',
    governanceRationale: 'Degraded anomaly contained under restricted fallback posture.',
    originalReporterId: 'reporter_dave',
  });

  const resA2 = runtimeWithRollback.confirmResolution({
    tenantPartition: TENANT_A,
    incidentId: incA2.incidentId,
    clearanceId: clearA2.clearanceId,
    nonRecoveryResolutionRationale: 'Transient network anomaly cleared; no policy mutation required.',
  });

  assert.strictEqual(resA2.status, 'CONFIRMED');
  assert.strictEqual(resA2.resolutionMode, 'RESOLVED_WITHOUT_RECOVERY');
  totalAssertions += 4;

  // --------------------------------------------------------------------------
  console.log('Test AI: Secret Sanitization via DiagnosisSanitizer...');
  // --------------------------------------------------------------------------
  const sanitizer = new DiagnosisSanitizer();
  const dirtySecret = {
    apiKey: 'sk-ant-api03-secret-key-abcdef1234567890',
    bearerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret',
    password: 'SuperSecretPassword123!',
    regularNote: 'Benign diagnostic report',
  };
  const sanitized = sanitizer.sanitize(dirtySecret) as any;
  assert.strictEqual(sanitized.apiKey, '[REDACTED]');
  assert.strictEqual(sanitized.bearerToken, '[REDACTED]');
  assert.strictEqual(sanitized.password, '[REDACTED]');
  assert.strictEqual(sanitized.regularNote, 'Benign diagnostic report');
  totalAssertions += 4;


  // --------------------------------------------------------------------------
  console.log('Test AJ: Forbidden Process Primitives Scan...');
  // --------------------------------------------------------------------------
  const resolutionDir = path.join(process.cwd(), 'src', 'core', 'policyActiveIncidentResolution');
  const files = fs.readdirSync(resolutionDir);
  const forbiddenPatterns = [
    /\bchild_process\b/,
    /\bexecSync\b/,
    /\bexec\s*\(/,
    /\bspawn\s*\(/,
    /\bfork\s*\(/,
    /\beval\s*\(/,
    /\bFunction\s*\(/,
  ];

  let forbiddenFound = 0;
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const code = fs.readFileSync(path.join(resolutionDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(code)) {
          console.error(`Forbidden primitive match '${pattern}' in ${file}`);
          forbiddenFound++;
        }
      }
    }
  }
  assert.strictEqual(forbiddenFound, 0, 'Zero forbidden process execution primitives allowed');
  totalAssertions += 1;

  // --------------------------------------------------------------------------
  console.log('Test AK: Authority Leakage Scan...');
  // --------------------------------------------------------------------------
  const authorityLeakagePatterns = [
    /\bautonomousRollback\b/,
    /\bautonomousRecover\b/,
    /\bautonomousSunset\b/,
    /\bautonomousApprove\b/,
    /\bmutatePolicy\b/,
    /\bexecuteTool\b/,
    /\bautoRepair\b/,
    /\bselfHealPolicy\b/,
  ];

  let leakageFound = 0;
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const code = fs.readFileSync(path.join(resolutionDir, file), 'utf8');
      for (const pattern of authorityLeakagePatterns) {
        if (pattern.test(code)) {
          console.error(`Authority leakage match '${pattern}' in ${file}`);
          leakageFound++;
        }
      }
    }
  }
  assert.strictEqual(leakageFound, 0, 'Zero authority leakage keywords allowed');
  totalAssertions += 1;

  // Clean test files
  cleanDirectory(TEST_BASE_DIR);

  console.log('\n============================================================');
  console.log(`REALITY GATE PASSED: ${totalAssertions} / ${totalAssertions} Assertions Verified`);
  console.log('MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION VERIFIED & LOCKED');
  console.log('============================================================\n');
}

runTest().catch((err) => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
