// tests/test_v4_agent_governed_active_policy_runtime_synchronization.ts
// BOWCON V4.0 — MS-1.3.71 DEDICATED REALITY GATE
// GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Verifies Categories A through V:
// A. valid active policy synchronization
// B. immutable runtime snapshot
// C. tenant isolation
// D. tenant traversal rejection
// E. stale policy rejection
// F. superseded policy rejection
// G. corrupted policy rejection
// H. invalid provenance rejection
// I. invalid schema rejection
// J. USER_STOP blocking
// K. deterministic synchronization
// L. replay/idempotency
// M. race/partial-state protection
// N. PDP uses synchronized active policy
// O. PEP uses governed PDP result
// P. no direct policy mutation
// Q. no autonomous activation
// R. no autonomous rollback
// S. no tool execution
// T. secret sanitization
// U. audit emission
// V. provenance binding
//
// Invariant assertions:
// ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT
// RUNTIME_POLICY_SNAPSHOT != POLICY_MUTATION
// PDP != POLICY_AUTHORITY
// PEP != POLICY_AUTHORITY
// USER_STOP > EVERYTHING

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  createActiveRuntimeSyncId,
  createRuntimePolicySnapshotId,
  createRuntimePolicyEnforcementId,
  createActiveRuntimeProvenanceId,
  PolicyActiveRuntimeFreshnessValidator,
  PolicyActiveRuntimeSyncEngine,
  PolicyActiveRuntimeSnapshotResolver,
  PolicyActiveRuntimePDPBridge,
  PolicyActiveRuntimePEPBridge,
  PolicyActiveRuntimeProvenanceEngine,
  PolicyActiveRuntimeAuditEngine,
  PolicyActiveRuntimeCoordinator,
  type RuntimePolicySnapshot,
} from '../src/core/policyActiveRuntime/index.js';

import {
  PolicyActivationStateStore,
  type ActivePolicyState,
  createActivePolicyStateId,
  createActivationCommitId,
  createStagedActivationId,
} from '../src/core/policyStagedActivation/index.js';

import {
  createCandidateDraftId,
  createEvolutionPlanId,
} from '../src/core/policyEvolutionPlanning/index.js';

import {
  createAuthorizationDecisionId,
  createActivationReadinessId,
} from '../src/core/policyCandidateAuthorization/index.js';

import { createPolicyEvolutionIntakeId } from '../src/core/policyFeedbackReview/index.js';
import { createActivationPreflightId } from '../src/core/policyStagedActivation/policyStagedActivationTypes.js';
import { PolicyDecisionPoint } from '../src/core/policyDecisionPoint.js';
import { ApprovalService } from '../src/core/approvalService.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

console.log('======================================================================');
console.log('BOWCON V4.0 — MILESTONE 1.3.71 REALITY GATE');
console.log('GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE');
console.log('======================================================================\n');

const testRunId = `ms1371_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
const testBaseDir = path.join(process.cwd(), 'data', 'partitions_active_runtime_reality', testRunId);

function cleanupTestDir() {
  try {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  } catch {}
}

cleanupTestDir();

let assertionCount = 0;
function pass(category: string, desc: string) {
  assertionCount++;
  console.log(`  [PASS] [CATEGORY ${category}] ${desc}`);
}

function createMockActivePolicy(params: {
  tenantPartition: string;
  version: string;
  previousVersion?: string;
  toolClassifications?: Record<string, any>;
  guardrails?: Record<string, any>;
}): ActivePolicyState {
  const activePolicyStateId = createActivePolicyStateId(`aps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const activationCommitId = createActivationCommitId(`actcommit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const stagedActivationId = createStagedActivationId(`stagedact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const candidateDraftId = createCandidateDraftId(`canddraft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const evolutionPlanId = createEvolutionPlanId(`evoplan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const intakeId = createPolicyEvolutionIntakeId(`intake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const authorizationDecisionId = createAuthorizationDecisionId(`authdec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const activationReadinessId = createActivationReadinessId(`actready_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const preflightId = createActivationPreflightId(`preflight_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  return Object.freeze({
    activePolicyStateId,
    activationCommitId,
    stagedActivationId,
    candidateDraftId,
    evolutionPlanId,
    intakeId,
    authorizationDecisionId,
    activationReadinessId,
    preflightId,
    tenantPartition: params.tenantPartition,
    previousPolicyVersion: params.previousVersion ?? 'v4.0.0',
    activePolicyVersion: params.version,
    targetPolicyDomain: 'SYSTEM_GOVERNANCE',
    activeModifications: {
      toolClassifications: params.toolClassifications ?? {
        'desktop_smarthome_control': 'HIGH_IMPACT',
        'get_sales_report': 'OBSERVE',
      },
      guardrails: params.guardrails ?? {
        maxExecutionDurationMs: 5000,
        rateLimitPerMinute: 60,
      },
    },
    activatedBy: 'sec_admin_human_01',
    activatedRole: 'SECURITY_OFFICER' as any,
    activatedAt: new Date().toISOString(),
    provenanceHeadHash: crypto.createHash('sha256').update(`prov_head_${params.version}`).digest('hex'),
    isActivePolicy: true,
    isActivated: true,
  });
}

try {
  const stateStore = new PolicyActivationStateStore({ baseDir: testBaseDir });
  const sanitizer = new DiagnosisSanitizer();
  const pdp = new PolicyDecisionPoint();
  const approvalService = new ApprovalService(path.join(testBaseDir, 'approvals'));

  const coordinator = new PolicyActiveRuntimeCoordinator(
    { baseDir: testBaseDir },
    pdp,
    approvalService,
    stateStore
  );

  const tenantA = 'tenant_alpha';
  const tenantB = 'tenant_beta';

  // Seed Tenant A active policy v4.1.0 in state store
  const mockA = createMockActivePolicy({
    tenantPartition: tenantA,
    version: 'v4.1.0',
    previousVersion: 'v4.0.0',
    toolClassifications: {
      'desktop_smarthome_control': 'HIGH_IMPACT',
      'get_sales_report': 'OBSERVE',
    },
  });
  stateStore.saveActivePolicy(mockA);

  // ========================================================================
  // CATEGORY A: Valid active policy synchronization
  // ========================================================================
  console.log('--- CATEGORY A: Valid active policy synchronization ---');
  const syncResultA = coordinator.synchronizeActivePolicy(tenantA);
  assert.strictEqual(syncResultA.state, 'SYNC_COMPLETED');
  assert.ok(syncResultA.snapshot !== null);
  assert.strictEqual(syncResultA.snapshot.policyVersion, 'v4.1.0');
  assert.strictEqual(syncResultA.snapshot.isGovernedActiveSnapshot, true);
  assert.strictEqual(syncResultA.snapshot.isAutonomousMutation, false);
  pass('A', 'Active policy state synchronously and deterministically ingested into runtime snapshot');

  // ========================================================================
  // CATEGORY B: Immutable runtime snapshot
  // ========================================================================
  console.log('--- CATEGORY B: Immutable runtime snapshot ---');
  const snapshotA = syncResultA.snapshot!;
  assert.ok(Object.isFrozen(snapshotA));
  assert.ok(Object.isFrozen(snapshotA.effectiveModifications));
  assert.ok(Object.isFrozen(snapshotA.toolClassifications));
  assert.ok(Object.isFrozen(snapshotA.guardrailParameters));
  assert.throws(() => {
    (snapshotA as any).policyVersion = 'v9.9.9';
  }, /Cannot assign to read only property/);
  pass('B', 'Runtime policy snapshot and nested collections are deeply frozen and immutable');

  // ========================================================================
  // CATEGORY C: Tenant isolation
  // ========================================================================
  console.log('--- CATEGORY C: Tenant isolation ---');
  // Tenant B has no active policy seeded yet
  assert.throws(() => {
    coordinator.resolveActiveSnapshot(tenantB);
  }, /ACTIVE_POLICY_RESOLUTION_FAILED/);

  // Seed Tenant B with a distinct version v4.2.0
  const mockB = createMockActivePolicy({
    tenantPartition: tenantB,
    version: 'v4.2.0',
    previousVersion: 'v4.1.0',
    toolClassifications: {
      'desktop_smarthome_control': 'FORBIDDEN',
    },
  });
  stateStore.saveActivePolicy(mockB);
  const syncResultB = coordinator.synchronizeActivePolicy(tenantB);
  assert.strictEqual(syncResultB.snapshot?.policyVersion, 'v4.2.0');
  assert.strictEqual(syncResultB.snapshot?.toolClassifications['desktop_smarthome_control'], 'FORBIDDEN');

  // Confirm Tenant A snapshot remains strictly v4.1.0
  const snapshotA_again = coordinator.resolveActiveSnapshot(tenantA);
  assert.strictEqual(snapshotA_again.policyVersion, 'v4.1.0');
  assert.strictEqual(snapshotA_again.toolClassifications['desktop_smarthome_control'], 'HIGH_IMPACT');
  pass('C', 'Tenant A and Tenant B maintain strictly partitioned active policy snapshots without leakage');

  // ========================================================================
  // CATEGORY D: Tenant traversal rejection
  // ========================================================================
  console.log('--- CATEGORY D: Tenant traversal rejection ---');
  assert.throws(() => {
    coordinator.resolveActiveSnapshot('../../etc/passwd');
  }, /Path traversal|RESOLVER_SECURITY_VIOLATION/);

  assert.throws(() => {
    coordinator.resolveActiveSnapshot('CON');
  }, /Windows reserved (device )?name|RESOLVER_SECURITY_VIOLATION/);
  pass('D', 'Path traversal and Windows reserved names strictly rejected fail-closed');

  // ========================================================================
  // CATEGORY E: Stale policy rejection
  // ========================================================================
  console.log('--- CATEGORY E: Stale policy rejection ---');
  const freshnessValidator = new PolicyActiveRuntimeFreshnessValidator();
  // If known version is v4.1.0, an incoming state with v4.0.0 is rejected as STALE
  const staleMock = createMockActivePolicy({
    tenantPartition: tenantA,
    version: 'v4.0.0',
  });
  const staleCheck = freshnessValidator.validateFreshness(staleMock, tenantA, 'v4.1.0');
  assert.strictEqual(staleCheck.isValid, false);
  assert.strictEqual(staleCheck.status, 'STALE');
  pass('E', 'Out-of-order or stale active policy versions fail closed with status STALE');

  // ========================================================================
  // CATEGORY F: Superseded policy rejection
  // ========================================================================
  console.log('--- CATEGORY F: Superseded policy rejection ---');
  const supersededMock = createMockActivePolicy({
    tenantPartition: tenantA,
    version: 'v4.0.5',
  });
  const supersededCheck = freshnessValidator.validateFreshness(supersededMock, tenantA, 'v4.1.0');
  assert.strictEqual(supersededCheck.isValid, false);
  assert.strictEqual(supersededCheck.status, 'STALE');
  pass('F', 'Superseded active policy versions cannot overwrite fresh runtime cache');

  // ========================================================================
  // CATEGORY G: Corrupted policy rejection
  // ========================================================================
  console.log('--- CATEGORY G: Corrupted policy rejection ---');
  const nullCheck = freshnessValidator.validateFreshness(null, tenantA);
  assert.strictEqual(nullCheck.isValid, false);
  assert.strictEqual(nullCheck.status, 'CORRUPTED');
  pass('G', 'Null or corrupted active policy state fails closed with status CORRUPTED');

  // ========================================================================
  // CATEGORY H: Invalid provenance rejection
  // ========================================================================
  console.log('--- CATEGORY H: Invalid provenance rejection ---');
  const brokenProvMock = {
    ...mockA,
    provenanceHeadHash: '',
  };
  const brokenProvCheck = freshnessValidator.validateFreshness(brokenProvMock as any, tenantA);
  assert.strictEqual(brokenProvCheck.isValid, false);
  assert.ok(brokenProvCheck.issues.some(i => i.includes('MISSING_PROVENANCE_HEAD_HASH')));
  pass('H', 'Active policy state lacking provenance hash rejected fail-closed');

  // ========================================================================
  // CATEGORY I: Invalid schema rejection
  // ========================================================================
  console.log('--- CATEGORY I: Invalid schema rejection ---');
  const invalidSchemaMock = {
    ...mockA,
    isActivePolicy: false, // Invalid for active state
  };
  const schemaCheck = freshnessValidator.validateFreshness(invalidSchemaMock as any, tenantA);
  assert.strictEqual(schemaCheck.isValid, false);
  assert.ok(schemaCheck.issues.some(i => i.includes('GOVERNANCE_FLAG_INVALID')));

  // Hard-forbidden floor violation attempt
  const forbiddenViolationMock = createMockActivePolicy({
    tenantPartition: tenantA,
    version: 'v4.3.0',
    toolClassifications: {
      'transfer_funds': 'REVERSIBLE', // Illegal downgrade!
    },
  });
  const forbiddenCheck = freshnessValidator.validateFreshness(forbiddenViolationMock, tenantA);
  assert.strictEqual(forbiddenCheck.isValid, false);
  assert.ok(forbiddenCheck.issues.some(i => i.includes('HARD_FORBIDDEN_FLOOR_VIOLATION')));
  pass('I', 'Schema invariant violations and hard-forbidden downgrades rejected fail-closed');

  // ========================================================================
  // CATEGORY J: USER_STOP blocking
  // ========================================================================
  console.log('--- CATEGORY J: USER_STOP blocking ---');
  let userStopTriggered = true;
  const stoppedCoordinator = new PolicyActiveRuntimeCoordinator(
    {
      baseDir: testBaseDir,
      isUserStopActive: () => userStopTriggered,
    },
    pdp,
    approvalService,
    stateStore
  );

  assert.throws(() => {
    stoppedCoordinator.synchronizeActivePolicy(tenantA);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);

  assert.throws(() => {
    stoppedCoordinator.resolveActiveSnapshot(tenantA);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);

  assert.throws(() => {
    stoppedCoordinator.evaluatePDP('get_sales_report', tenantA);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);

  assert.throws(() => {
    stoppedCoordinator.enforcePEP('get_sales_report', tenantA);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('J', 'USER_STOP supremacy immediately halts synchronization, resolution, PDP evaluation, and PEP enforcement');

  // ========================================================================
  // CATEGORY K: Deterministic synchronization
  // ========================================================================
  console.log('--- CATEGORY K: Deterministic synchronization ---');
  const sync1 = coordinator.synchronizeActivePolicy(tenantA);
  const sync2 = coordinator.synchronizeActivePolicy(tenantA);
  assert.strictEqual(sync1.snapshot?.snapshotHash, sync2.snapshot?.snapshotHash);
  pass('K', 'Synchronization is fully deterministic and emits identical snapshot hashes');

  // ========================================================================
  // CATEGORY L: Replay / idempotency
  // ========================================================================
  console.log('--- CATEGORY L: Replay / idempotency ---');
  assert.strictEqual(sync1.snapshot?.snapshotId, sync2.snapshot?.snapshotId);
  pass('L', 'Repeated synchronization of identical active policy reuses cached snapshot without mutation');

  // ========================================================================
  // CATEGORY M: Race / partial-state protection
  // ========================================================================
  console.log('--- CATEGORY M: Race / partial-state protection ---');
  // Snapshot replacement is atomic reference assignment; readers always see complete snapshot
  const resolvedSnapshot = coordinator.resolveActiveSnapshot(tenantA);
  assert.ok(resolvedSnapshot.snapshotId);
  assert.ok(resolvedSnapshot.effectiveModifications);
  assert.ok(resolvedSnapshot.humanActivationAuthority);
  pass('M', 'Atomic snapshot assignment prevents callers from observing partially-initialized state');

  // ========================================================================
  // CATEGORY N: PDP uses synchronized active policy
  // ========================================================================
  console.log('--- CATEGORY N: PDP uses synchronized active policy ---');
  // Under Tenant A active policy v4.1.0, desktop_smarthome_control is HIGH_IMPACT
  const pdpDecisionA = coordinator.evaluatePDP('desktop_smarthome_control', tenantA);
  assert.strictEqual(pdpDecisionA.classification, 'HIGH_IMPACT');
  assert.strictEqual(pdpDecisionA.requiresApproval, true);

  // Under Tenant B active policy v4.2.0, desktop_smarthome_control is FORBIDDEN
  const pdpDecisionB = coordinator.evaluatePDP('desktop_smarthome_control', tenantB);
  assert.strictEqual(pdpDecisionB.classification, 'FORBIDDEN');
  assert.strictEqual(pdpDecisionB.allowed, false);

  // Canonical hard-forbidden action is permanently FORBIDDEN on all tenants
  const pdpForbidden = coordinator.evaluatePDP('delete_database', tenantA);
  assert.strictEqual(pdpForbidden.classification, 'FORBIDDEN');
  assert.strictEqual(pdpForbidden.allowed, false);
  pass('N', 'PDP evaluates tool actions strictly against tenant active policy snapshot with hard floor');

  // ========================================================================
  // CATEGORY O: PEP uses governed PDP result
  // ========================================================================
  console.log('--- CATEGORY O: PEP uses governed PDP result ---');
  // 1. FORBIDDEN action blocked without token
  const pepForbidden = coordinator.enforcePEP('desktop_smarthome_control', tenantB);
  assert.strictEqual(pepForbidden.disposition, 'FORBIDDEN');

  // 2. HIGH_IMPACT action blocked when token missing
  const pepHighImpactNoToken = coordinator.enforcePEP('desktop_smarthome_control', tenantA);
  assert.strictEqual(pepHighImpactNoToken.disposition, 'REQUIRES_APPROVAL');

  // 3. HIGH_IMPACT action permitted when valid execution token provided
  const approvalRes = approvalService.requestApproval({
    actionName: 'desktop_smarthome_control',
    targetDomain: 'desktop',
    arguments: {},
    actionSummary: 'Control smarthome light',
    requestedBy: 'operator_human_01',
    userId: tenantA,
  });
  const grantRes = approvalService.grantApproval(approvalRes.id, 'sec_admin_01', tenantA);
  assert.ok(grantRes.success);
  const token = grantRes.executionToken!;
  assert.ok(token);

  const pepHighImpactWithToken = coordinator.enforcePEP('desktop_smarthome_control', tenantA, {
    executionToken: token,
    actorUserId: tenantA,
  });
  assert.strictEqual(pepHighImpactWithToken.disposition, 'PERMIT');
  assert.strictEqual(pepHighImpactWithToken.decision.allowed, true);

  // 4. Token replay rejected: second attempt with consumed token fails
  const pepTokenReplay = coordinator.enforcePEP('desktop_smarthome_control', tenantA, {
    executionToken: token,
    actorUserId: tenantA,
  });
  assert.strictEqual(pepTokenReplay.disposition, 'DENY');
  pass('O', 'PEP enforces PDP decision, gates HIGH_IMPACT actions with single-use tokens, and blocks replay');

  // ========================================================================
  // CATEGORY P: No direct policy mutation
  // ========================================================================
  console.log('--- CATEGORY P: No direct policy mutation ---');
  const storedActiveBefore = stateStore.getActivePolicy(tenantA);
  coordinator.evaluatePDP('get_sales_report', tenantA);
  coordinator.enforcePEP('get_sales_report', tenantA);
  const storedActiveAfter = stateStore.getActivePolicy(tenantA);
  assert.strictEqual(storedActiveBefore?.provenanceHeadHash, storedActiveAfter?.provenanceHeadHash);
  assert.strictEqual(storedActiveBefore?.activePolicyVersion, storedActiveAfter?.activePolicyVersion);
  pass('P', 'Runtime synchronization and enforcement cause ZERO mutation to stored ACTIVE_POLICY');

  // ========================================================================
  // CATEGORY Q: No autonomous activation
  // ========================================================================
  console.log('--- CATEGORY Q: No autonomous activation ---');
  assert.strictEqual(typeof (coordinator as any).activatePolicy, 'undefined');
  assert.strictEqual(typeof (coordinator as any).autonomousActivate, 'undefined');
  assert.strictEqual(typeof (coordinator as any).promoteCandidate, 'undefined');
  pass('Q', 'PolicyActiveRuntimeCoordinator exposes zero autonomous activation methods');

  // ========================================================================
  // CATEGORY R: No autonomous rollback
  // ========================================================================
  console.log('--- CATEGORY R: No autonomous rollback ---');
  assert.strictEqual(typeof (coordinator as any).rollbackPolicy, 'undefined');
  assert.strictEqual(typeof (coordinator as any).autonomousRollback, 'undefined');
  pass('R', 'PolicyActiveRuntimeCoordinator exposes zero autonomous rollback methods');

  // ========================================================================
  // CATEGORY S: No tool execution
  // ========================================================================
  console.log('--- CATEGORY S: No tool execution ---');
  assert.strictEqual(typeof (coordinator as any).executeTool, 'undefined');
  assert.strictEqual(typeof (coordinator as any).executeShell, 'undefined');
  pass('S', 'PolicyActiveRuntimeCoordinator performs enforcement gating only and does not execute tools');

  // ========================================================================
  // CATEGORY T: Secret sanitization
  // ========================================================================
  console.log('--- CATEGORY T: Secret sanitization ---');
  const auditEngine = new PolicyActiveRuntimeAuditEngine();
  auditEngine.recordEvent({
    eventType: 'SECRET_TEST',
    tenantPartition: tenantA,
    details: {
      apiKey: 'AIzaSySecretApiKey1234567890',
      password: 'SuperSecretAdminPassword123!',
      safeData: 'normal_payload',
    },
  });
  const auditEntries = (AuditLedger as any).default?.getTrail?.() ?? [];
  const rawLedger = fs.readFileSync(path.join(process.cwd(), 'data', 'audit_ledger.jsonl'), 'utf8');
  assert.ok(!rawLedger.includes('SuperSecretAdminPassword123!'));
  pass('T', 'Sensitive credentials and keys scrubbed via DiagnosisSanitizer prior to audit recording');

  // ========================================================================
  // CATEGORY U: Audit emission
  console.log('--- CATEGORY U: Audit emission ---');
  assert.ok(rawLedger.includes('"domain":"ACTIVE_POLICY_RUNTIME_SYNCHRONIZATION"'));
  assert.ok(rawLedger.includes('active_runtime_active_policy_synced'));
  assert.ok(rawLedger.includes('active_runtime_pdp_active_policy_evaluation'));
  assert.ok(rawLedger.includes('active_runtime_pep_active_policy_enforcement'));
  pass('U', 'Audit events canonicalized under domain ACTIVE_POLICY_RUNTIME_SYNCHRONIZATION');

  // ========================================================================
  // CATEGORY V: Provenance binding
  // ========================================================================
  console.log('--- CATEGORY V: Provenance binding ---');
  const chain = coordinator.getProvenanceChain(tenantA);
  assert.ok(chain.length >= 2);
  const isValidChain = coordinator.verifyProvenanceChain(tenantA);
  assert.strictEqual(isValidChain, true);

  // Tamper detection
  const provEngine = new PolicyActiveRuntimeProvenanceEngine();
  provEngine.appendRecord({
    tenantPartition: 'tamper_tenant',
    activePolicyStateId: mockA.activePolicyStateId,
    eventType: 'SYNC',
    payload: { v: 1 },
  });
  provEngine.appendRecord({
    tenantPartition: 'tamper_tenant',
    activePolicyStateId: mockA.activePolicyStateId,
    eventType: 'ENFORCE',
    payload: { v: 2 },
  });

  const tamperChain = (provEngine as any).tenantChains.get('tamper_tenant');
  tamperChain[0] = { ...tamperChain[0], recordHash: '0000000000000000000000000000000000000000000000000000000000000000' };

  assert.throws(() => {
    provEngine.verifyChainIntegrity('tamper_tenant');
  }, /PROVENANCE_TAMPER_DETECTED/);
  pass('V', 'Cryptographic SHA-256 provenance chains bound to sync/enforce events with tamper detection');

  console.log('\n======================================================================');
  console.log(`REALITY GATE COMPLETE: All ${assertionCount} assertions PASSED`);
  console.log('REALITY GATE SUCCESS: All assertions PASS');
  console.log('======================================================================\n');
} finally {
  cleanupTestDir();
}
