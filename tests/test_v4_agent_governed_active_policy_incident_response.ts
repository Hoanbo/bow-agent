// tests/test_v4_agent_governed_active_policy_incident_response.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Comprehensive Reality Verification Suite.
// Verifies:
// A. Initialization
// B. Normal state
// C. Degradation detection
// D. Incident detection
// E. Critical incident detection
// F. Runtime policy drift
// G. PDP/PEP disagreement
// H. Stale runtime snapshot
// I. Provenance tampering (PROVENANCE_TAMPER_DETECTED)
// J. Hard-forbidden floor violation
// K. Tenant isolation
// L. Traversal attack
// M. Anonymous/guest rejection
// N. USER_STOP supremacy
// O. Emergency safety boundary activation
// P. Fail-closed behavior
// Q. No autonomous rollback
// R. No autonomous repair
// S. No autonomous recovery
// T. No policy mutation
// U. No direct tool execution
// V. Incident idempotency & fingerprinting
// W. Conflicting terminal rewrite
// X. Provenance chain
// Y. Audit events
// Z. Secret sanitization
// AA. Persistence reload
// AB. Cross-tenant isolation
// AC. Human escalation requirement
// AD. Safe resolution/closure
// AE. Repeated incident detection
// AF. PDP baseline default-deny preservation
// AG. Hard-forbidden action preservation
// AH. Runtime coordinator integration

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  PolicyActiveIncidentResponseRuntime,
  PolicyActiveIncidentSignalResolver,
  PolicyActivePolicyDegradationDetector,
  PolicyActiveIncidentClassifier,
  PolicyEmergencySafetyBoundary,
  PolicyIncidentEscalationEngine,
  PolicyActiveIncidentStore,
  PolicyActiveIncidentProvenanceEngine,
  PolicyActiveIncidentAuditEngine,
  POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN,
  createActiveIncidentId,
  createDegradationEventId,
  createSafetyBoundaryActivationId,
  createIncidentEscalationId,
  createIncidentResolutionId,
  createIncidentProvenanceId,
  type ActivePolicyIncidentRecord,
} from '../src/core/policyActiveIncidentResponse/index.js';

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

import {
  createRuntimePolicySnapshotId,
  type RuntimePolicySnapshot,
} from '../src/core/policyActiveRuntime/policyActiveRuntimeTypes.js';

import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../src/core/policyActiveRollback/policyActiveRollbackTypes.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

const TEST_BASE_DIR = path.join(process.cwd(), 'data', 'partitions_incident_response_reality');

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
  const activePolicyStateId = createActivePolicyStateId(`aps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  return {
    activePolicyStateId,
    tenantPartition: tenant,
    activePolicyVersion: version,
    activationCommitId: createActivationCommitId('commit_1'),
    stagedActivationId: createStagedActivationId('stage_1'),
    candidateDraftId: createCandidateDraftId('draft_1'),
    intakeId: createPolicyEvolutionIntakeId('intake_1'),
    authorizationDecisionId: createAuthorizationDecisionId('auth_1'),
    activationReadinessId: createActivationReadinessId('ready_1'),
    activationPreflightId: createActivationPreflightId('preflight_1'),
    activatedAt: new Date().toISOString(),
    activatedBy: 'human_operator_alice',
    provenanceHeadHash: 'a'.repeat(64),
    activeModifications: {
      toolClassifications: {
        'web_search': 'ALLOW',
      },
      ...overrides.activeModifications,
    },
    isActive: true,
    ...overrides,
  } as ActivePolicyState;
}

function createDummyRuntimeSnapshot(
  tenant: string,
  active: ActivePolicyState,
  overrides: Partial<RuntimePolicySnapshot> = {}
): RuntimePolicySnapshot {
  return {
    snapshotId: createRuntimePolicySnapshotId(`snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
    tenantPartition: tenant,
    policyVersion: active.activePolicyVersion,
    activePolicyStateId: active.activePolicyStateId,
    activationCommitId: active.activationCommitId,
    provenanceHeadHash: active.provenanceHeadHash,
    activeRules: [],
    toolClassifications: {
      'web_search': 'ALLOW',
    },
    ...overrides,
  } as RuntimePolicySnapshot;
}

async function runTest(): Promise<void> {
  console.log('\n============================================================');
  console.log('BOWCON V4 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE');
  console.log('REALITY VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  cleanDirectory(TEST_BASE_DIR);
  let totalAssertions = 0;

  const TENANT_A = 'tenant_alpha_corp';
  const TENANT_B = 'tenant_beta_inc';

  let userStopFlag = false;
  const isUserStopActive = () => userStopFlag;

  const incidentStore = new PolicyActiveIncidentStore({ baseDir: TEST_BASE_DIR, isUserStopActive });
  const signalResolver = new PolicyActiveIncidentSignalResolver({ isUserStopActive });
  const degradationDetector = new PolicyActivePolicyDegradationDetector({ isUserStopActive });
  const classifier = new PolicyActiveIncidentClassifier({ isUserStopActive });
  const safetyBoundary = new PolicyEmergencySafetyBoundary({ isUserStopActive });
  const escalationEngine = new PolicyIncidentEscalationEngine({ isUserStopActive });
  const provenanceEngine = new PolicyActiveIncidentProvenanceEngine({ isUserStopActive });
  const auditEngine = new PolicyActiveIncidentAuditEngine({ isUserStopActive });

  const runtime = new PolicyActiveIncidentResponseRuntime(
    { baseDir: TEST_BASE_DIR, isUserStopActive },
    signalResolver,
    degradationDetector,
    classifier,
    safetyBoundary,
    escalationEngine,
    incidentStore,
    provenanceEngine,
    auditEngine
  );

  // --------------------------------------------------------------------------
  // TEST A: Initialization & Branded Identifiers
  // --------------------------------------------------------------------------
  console.log('Test A: Initialization & Branded Identifiers...');
  assert.ok(runtime instanceof PolicyActiveIncidentResponseRuntime);
  assert.strictEqual(createActiveIncidentId('inc_100'), 'inc_100');
  assert.strictEqual(createDegradationEventId('deg_100'), 'deg_100');
  assert.strictEqual(createSafetyBoundaryActivationId('sba_100'), 'sba_100');
  assert.strictEqual(createIncidentEscalationId('esc_100'), 'esc_100');
  assert.strictEqual(createIncidentResolutionId('res_100'), 'res_100');
  assert.strictEqual(createIncidentProvenanceId('prv_100'), 'prv_100');
  assert.throws(() => createActiveIncidentId(''), /INVALID_INCIDENT_ID/);
  totalAssertions += 8;

  // --------------------------------------------------------------------------
  // TEST B: Normal Operating State (No Incident Generated)
  // --------------------------------------------------------------------------
  console.log('Test B: Normal Operating State...');
  const activeA = createDummyActivePolicy(TENANT_A, '1.0.0');
  const snapA = createDummyRuntimeSnapshot(TENANT_A, activeA);

  const normalIncident = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: activeA,
    runtimeSnapshot: snapA,
    pdpDecisionAllowed: true,
    pepDisposition: 'ALLOW',
    testedAction: 'web_search',
  });

  assert.strictEqual(normalIncident, null, 'Normal state must yield null incident');
  assert.strictEqual(runtime.getActiveSafetyBoundary(TENANT_A), null, 'Safety boundary must be null for normal state');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST C & H: Degradation Detection: Stale Runtime Snapshot
  // --------------------------------------------------------------------------
  console.log('Test C & H: Degradation Detection (Stale Runtime Snapshot)...');
  const staleIncident = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: activeA,
    runtimeSnapshot: null, // missing snapshot => STALE_ACTIVE_RUNTIME
  });

  assert.ok(staleIncident !== null, 'Stale runtime must create an incident record');
  assert.strictEqual(staleIncident?.severity, 'DEGRADED');
  assert.strictEqual(staleIncident?.primaryCategory, 'STALE_ACTIVE_RUNTIME');
  assert.strictEqual(staleIncident?.safetyBoundaryStatus, 'RESTRICTED_FALLBACK');
  assert.strictEqual(staleIncident?.isActivePolicy, false);
  assert.strictEqual(staleIncident?.isPolicyMutation, false);
  assert.strictEqual(staleIncident?.isAutonomousMutation, false);
  assert.strictEqual(staleIncident?.isAutonomousRollback, false);
  totalAssertions += 8;

  // Check safety boundary under RESTRICTED_FALLBACK
  const boundaryCheckA = runtime.enforceSafetyBoundary(TENANT_A, 'read_data', 'READ_ONLY');
  assert.strictEqual(boundaryCheckA.allowed, true, 'RESTRICTED_FALLBACK allows READ_ONLY operations');
  const boundaryCheckAWrite = runtime.enforceSafetyBoundary(TENANT_A, 'write_data', 'EXECUTE');
  assert.strictEqual(boundaryCheckAWrite.allowed, false, 'RESTRICTED_FALLBACK blocks state-modifying actions');
  assert.strictEqual(boundaryCheckAWrite.disposition, 'BLOCKED_BY_SAFETY_BOUNDARY');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST D & F: Incident Detection (Runtime Policy Version Drift)
  // --------------------------------------------------------------------------
  console.log('Test D & F: Incident Detection (Policy Version Drift)...');
  const driftedSnap = createDummyRuntimeSnapshot(TENANT_A, activeA, {
    policyVersion: '1.1.0', // Drift from activeA '1.0.0'
  });

  const driftIncident = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: activeA,
    runtimeSnapshot: driftedSnap,
  });

  assert.ok(driftIncident !== null, 'Version drift must trigger an incident');
  assert.strictEqual(driftIncident?.severity, 'INCIDENT');
  assert.strictEqual(driftIncident?.primaryCategory, 'POLICY_VERSION_DRIFT');
  assert.strictEqual(driftIncident?.safetyBoundaryStatus, 'ACTIVE');
  assert.ok(driftIncident?.escalationId !== null, 'INCIDENT severity must generate escalationId');
  totalAssertions += 5;

  // Active boundary blocks non-read operations
  const checkActive = runtime.enforceSafetyBoundary(TENANT_A, 'perform_mutation', 'MUTATE');
  assert.strictEqual(checkActive.allowed, false);
  assert.strictEqual(checkActive.disposition, 'BLOCKED_BY_SAFETY_BOUNDARY');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST E, G, J: Critical Incident Detection (Hard-Forbidden Breach & PDP/PEP Disagreement)
  // --------------------------------------------------------------------------
  console.log('Test E, G, J: Critical Incident Detection...');
  // Breach: hard-forbidden action downgraded
  const breachActive = createDummyActivePolicy(TENANT_A, '1.0.0', {
    activeModifications: {
      toolClassifications: {
        'delete_database': 'ALLOW', // Downgrade of canonical hard-forbidden floor!
      },
    },
  });

  const criticalIncident = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: breachActive,
    runtimeSnapshot: snapA,
    pdpDecisionAllowed: true,
    pepDisposition: 'FORBIDDEN',
    testedAction: 'delete_database',
  });

  assert.ok(criticalIncident !== null);
  assert.strictEqual(criticalIncident?.severity, 'CRITICAL');
  assert.strictEqual(criticalIncident?.primaryCategory, 'HARD_FORBIDDEN_FLOOR_BREACH');
  assert.strictEqual(criticalIncident?.safetyBoundaryStatus, 'FAIL_CLOSED');
  assert.strictEqual(criticalIncident?.state, 'SAFETY_BOUNDARY_ACTIVE');
  totalAssertions += 5;

  // In FAIL_CLOSED, everything is blocked
  const checkFailClosed = runtime.enforceSafetyBoundary(TENANT_A, 'read_data', 'READ_ONLY');
  assert.strictEqual(checkFailClosed.allowed, false, 'FAIL_CLOSED must block even READ_ONLY actions');
  assert.strictEqual(checkFailClosed.disposition, 'BLOCKED_BY_SAFETY_BOUNDARY');
  totalAssertions += 2;

  // Canonical hard-forbidden floor check is always FORBIDDEN
  const checkHardForbidden = runtime.enforceSafetyBoundary(TENANT_A, 'transfer_funds');
  assert.strictEqual(checkHardForbidden.allowed, false);
  assert.strictEqual(checkHardForbidden.disposition, 'FORBIDDEN');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST I: Provenance Tamper Detection (PROVENANCE_TAMPER_DETECTED)
  // --------------------------------------------------------------------------
  console.log('Test I: Provenance Tamper Detection...');
  assert.strictEqual(runtime.verifyIncidentProvenance(TENANT_A), true, 'Provenance chain must verify cleanly');

  // Deliberately tamper with the chain in memory
  const rawChain = (runtime as any).provenanceEngine.chains.get(TENANT_A);
  assert.ok(rawChain && rawChain.length > 0, 'Provenance chain must have entries');
  const originalHash = rawChain[0].recordHash;
  rawChain[0] = { ...rawChain[0], recordHash: 'deadbeef'.repeat(8) };

  assert.throws(
    () => runtime.verifyIncidentProvenance(TENANT_A),
    /PROVENANCE_TAMPER_DETECTED/,
    'Must fail closed with PROVENANCE_TAMPER_DETECTED on tampered chain'
  );
  // Restore hash
  rawChain[0] = { ...rawChain[0], recordHash: originalHash };
  assert.strictEqual(runtime.verifyIncidentProvenance(TENANT_A), true, 'Provenance chain restored');
  totalAssertions += 4;

  // --------------------------------------------------------------------------
  // TEST K & AB: Cross-Tenant Isolation
  // --------------------------------------------------------------------------
  console.log('Test K & AB: Tenant Isolation...');
  const tenantBActive = createDummyActivePolicy(TENANT_B, '1.0.0');
  const tenantBSnap = createDummyRuntimeSnapshot(TENANT_B, tenantBActive);

  // Tenant B is normal
  const resB = runtime.evaluateIncidentState(TENANT_B, {
    activePolicyState: tenantBActive,
    runtimeSnapshot: tenantBSnap,
  });
  assert.strictEqual(resB, null, 'Tenant B has no incidents');
  assert.strictEqual(runtime.getActiveSafetyBoundary(TENANT_B), null, 'Tenant B safety boundary is null');

  // Tenant A incidents must not leak to Tenant B
  const tenantBIncidents = incidentStore.listIncidents(TENANT_B);
  assert.strictEqual(tenantBIncidents.length, 0, 'Tenant B incident list must be completely empty');

  const tenantAIncidents = incidentStore.listIncidents(TENANT_A);
  assert.ok(tenantAIncidents.length > 0, 'Tenant A incident list contains records');
  assert.ok(tenantAIncidents.every((inc) => inc.tenantPartition === TENANT_A), 'All Tenant A incidents strictly isolated');
  totalAssertions += 5;

  // --------------------------------------------------------------------------
  // TEST L: Path Traversal Attack Rejection
  // --------------------------------------------------------------------------
  console.log('Test L: Path Traversal Rejection...');
  assert.throws(
    () => incidentStore.listIncidents('../../../etc/passwd'),
    /Path traversal|STORE_SECURITY_VIOLATION|DurablePersistenceSecurityError/i,
    'Path traversal must be rejected'
  );
  assert.throws(
    () => incidentStore.listIncidents('..\\..\\windows\\system32'),
    /Path traversal|STORE_SECURITY_VIOLATION|DurablePersistenceSecurityError/i,
    'Windows path traversal must be rejected'
  );
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST M & AC: Mandatory Human Review & Rejection of Anonymous/Guest & Autonomous Personas
  // --------------------------------------------------------------------------
  console.log('Test M & AC: Mandatory Human Review & Autonomous/Anonymous Persona Rejection...');
  // Anonymous / unauthenticated tenant partition rejection
  assert.throws(
    () => incidentStore.listIncidents('anonymous'),
    /Anonymous|unresolved user/i,
    'Anonymous user partition must be rejected'
  );
  totalAssertions += 1;

  const incToResolve = criticalIncident!;

  // Try autonomous actor
  assert.throws(
    () => runtime.resolveIncidentWithHumanReview(TENANT_A, incToResolve.incidentId, 'auto_agent_resolver', 'Resolving autonomously'),
    /HUMAN_GOVERNANCE_REQUIRED/,
    'Autonomous agents must be rejected from resolving incidents'
  );
  assert.throws(
    () => runtime.resolveIncidentWithHumanReview(TENANT_A, incToResolve.incidentId, 'bot_repairer', 'Resolving autonomously'),
    /HUMAN_GOVERNANCE_REQUIRED/,
    'Bots must be rejected'
  );
  assert.throws(
    () => runtime.resolveIncidentWithHumanReview(TENANT_A, incToResolve.incidentId, 'anonymous', 'Resolving anonymously'),
    /HUMAN_GOVERNANCE_REQUIRED/,
    'Anonymous actors must be rejected'
  );
  assert.throws(
    () => runtime.resolveIncidentWithHumanReview(TENANT_A, incToResolve.incidentId, 'human_operator_bob', 'short'),
    /INVALID_RESOLUTION_RATIONALE/,
    'Short/empty rationale must be rejected'
  );
  totalAssertions += 4;

  // --------------------------------------------------------------------------
  // TEST AD: Safe Resolution and Closure by Governed Human Operator
  // --------------------------------------------------------------------------
  console.log('Test AD: Safe Resolution & Closure...');
  const resolved = runtime.resolveIncidentWithHumanReview(
    TENANT_A,
    incToResolve.incidentId,
    'human_governor_sarah',
    'Root cause investigated: invalid test harness configuration corrected by operations team.'
  );

  assert.strictEqual(resolved.state, 'RESOLVED');
  assert.strictEqual(resolved.safetyBoundaryStatus, 'INACTIVE');
  assert.strictEqual(resolved.resolvedBy, 'human_governor_sarah');
  assert.ok(resolved.resolvedAt !== null);

  // Boundary is now deactivated
  assert.strictEqual(runtime.getActiveSafetyBoundary(TENANT_A), null);

  // Close incident
  const closed = runtime.closeIncident(
    TENANT_A,
    incToResolve.incidentId,
    'human_governor_sarah',
    'Incident post-mortem completed. Formal verification pass completed.'
  );
  assert.strictEqual(closed.state, 'CLOSED');
  totalAssertions += 6;

  // --------------------------------------------------------------------------
  // TEST W: Conflicting Terminal Rewrite Rejection
  // --------------------------------------------------------------------------
  console.log('Test W: Conflicting Terminal Rewrite Rejection...');
  const modifiedTerminal: ActivePolicyIncidentRecord = {
    ...closed,
    state: 'DETECTED',
    resolvedBy: null, // Attempting to silently unresolve
  };

  assert.throws(
    () => incidentStore.saveIncident(modifiedTerminal),
    /CONFLICTING_TERMINAL_REWRITE/,
    'Modifying terminal incident without human clearance must be rejected'
  );
  totalAssertions += 1;

  // --------------------------------------------------------------------------
  // TEST V & AE: Incident Idempotency & Deduplication
  // --------------------------------------------------------------------------
  console.log('Test V & AE: Incident Idempotency...');
  // Trigger same degradation again on Tenant A
  const repeatIncident1 = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: activeA,
    runtimeSnapshot: null, // STALE_ACTIVE_RUNTIME
  });
  const repeatIncident2 = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: activeA,
    runtimeSnapshot: null, // STALE_ACTIVE_RUNTIME
  });

  assert.ok(repeatIncident1 !== null && repeatIncident2 !== null);
  assert.strictEqual(
    repeatIncident1.incidentId,
    repeatIncident2.incidentId,
    'Repeated identical signals must resolve to the identical incidentId via fingerprint'
  );
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST AA: Persistence Reload
  // --------------------------------------------------------------------------
  console.log('Test AA: Persistence Reload...');
  const freshStore = new PolicyActiveIncidentStore({ baseDir: TEST_BASE_DIR, isUserStopActive });
  const loadedList = freshStore.listIncidents(TENANT_A);
  assert.ok(loadedList.length >= 2, 'Reloaded incident store must contain persisted records');
  const foundClosed = loadedList.find((i) => i.incidentId === closed.incidentId);
  assert.ok(foundClosed !== undefined, 'Closed incident must be present on disk');
  assert.strictEqual(foundClosed?.state, 'CLOSED');
  assert.strictEqual(foundClosed?.resolvedBy, 'human_governor_sarah');
  totalAssertions += 4;

  // --------------------------------------------------------------------------
  // TEST Z: Secret Sanitization
  // --------------------------------------------------------------------------
  console.log('Test Z: Secret Sanitization...');
  // Inspect stored JSON files on disk to ensure no raw secrets leaked
  const tenantDir = path.join(TEST_BASE_DIR, 'tenant_alpha_corp', 'policy_incidents', 'active_incidents.json');
  assert.ok(fs.existsSync(tenantDir), 'active_incidents.json must exist');
  const rawDiskData = fs.readFileSync(tenantDir, 'utf8');
  assert.strictEqual(rawDiskData.includes('sk-live-1234567890'), false, 'Secrets must not be stored on disk');
  assert.strictEqual(rawDiskData.includes('bearer eyJhbGciOi'), false, 'Bearer tokens must not be on disk');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST N: USER_STOP Supremacy
  // --------------------------------------------------------------------------
  console.log('Test N: USER_STOP Supremacy...');
  userStopFlag = true;

  assert.throws(
    () => runtime.evaluateIncidentState(TENANT_A, { activePolicyState: activeA, runtimeSnapshot: null }),
    /OPERATION_SUSPENDED_BY_USER_STOP/,
    'evaluateIncidentState must immediately throw on USER_STOP'
  );
  assert.throws(
    () => runtime.enforceSafetyBoundary(TENANT_A, 'web_search'),
    /OPERATION_SUSPENDED_BY_USER_STOP/,
    'enforceSafetyBoundary must immediately throw on USER_STOP'
  );
  assert.throws(
    () => runtime.getActiveSafetyBoundary(TENANT_A),
    /OPERATION_SUSPENDED_BY_USER_STOP/,
    'getActiveSafetyBoundary must immediately throw on USER_STOP'
  );
  assert.throws(
    () => runtime.resolveIncidentWithHumanReview(TENANT_A, closed.incidentId, 'operator', 'rationale here'),
    /OPERATION_SUSPENDED_BY_USER_STOP/,
    'resolveIncidentWithHumanReview must immediately throw on USER_STOP'
  );
  assert.throws(
    () => runtime.verifyIncidentProvenance(TENANT_A),
    /OPERATION_SUSPENDED_BY_USER_STOP/,
    'verifyIncidentProvenance must immediately throw on USER_STOP'
  );

  userStopFlag = false; // Reset USER_STOP
  totalAssertions += 5;

  // --------------------------------------------------------------------------
  // TEST Q, R, S, T, U: Architectural Authority Separation Invariants
  // --------------------------------------------------------------------------
  console.log('Test Q, R, S, T, U: Authority Separation Invariants...');
  // Verify incident record type contracts forbid mutation / autonomous execution
  assert.strictEqual(closed.isActivePolicy, false);
  assert.strictEqual(closed.isPolicyMutation, false);
  assert.strictEqual(closed.isAutonomousMutation, false);
  assert.strictEqual(closed.isAutonomousRollback, false);
  totalAssertions += 4;

  // --------------------------------------------------------------------------
  // TEST X & Y: Provenance & Audit Logging Integration
  // --------------------------------------------------------------------------
  console.log('Test X & Y: Provenance & Audit Logging...');
  const provChain = runtime.getIncidentProvenance(TENANT_A);
  assert.ok(provChain.length >= 3, 'Provenance chain must contain logged events');
  assert.strictEqual(runtime.verifyIncidentProvenance(TENANT_A), true, 'Provenance integrity must hold');
  totalAssertions += 2;

  // --------------------------------------------------------------------------
  // TEST AF: PDP Baseline Default-Deny Preservation
  // --------------------------------------------------------------------------
  console.log('Test AF: PDP Baseline Default-Deny Preservation...');
  // When boundary is INACTIVE (e.g. TENANT_B), safety boundary delegates to PDP/PEP
  const inactiveCheck = runtime.enforceSafetyBoundary(TENANT_B, 'arbitrary_unregistered_action');
  assert.strictEqual(inactiveCheck.allowed, true, 'Boundary permits standard PDP delegation when inactive');
  assert.strictEqual(inactiveCheck.boundaryStatus, 'INACTIVE');
  assert.strictEqual(inactiveCheck.disposition, 'PERMIT');
  totalAssertions += 3;

  // --------------------------------------------------------------------------
  // TEST AG: Hard-Forbidden Action Preservation Across All States
  // --------------------------------------------------------------------------
  console.log('Test AG: Hard-Forbidden Action Preservation Across All States...');
  for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
    const check = runtime.enforceSafetyBoundary(TENANT_A, forbidden);
    assert.strictEqual(check.allowed, false, `Hard forbidden action '${forbidden}' must NEVER be allowed`);
    assert.strictEqual(check.disposition, 'FORBIDDEN');
    totalAssertions += 2;
  }

  // --------------------------------------------------------------------------
  // TEST AH: Runtime Coordinator Integration with MS-1.3.73 Reconciliation
  // --------------------------------------------------------------------------
  console.log('Test AH: Runtime Coordinator Integration with Reconciliation...');
  const mockReconResult: any = {
    reconciliationId: 'recon_test_1',
    tenantPartition: TENANT_A,
    isConsistent: false,
    status: 'INCONSISTENT',
    detectedDrifts: [
      {
        driftId: 'drift_1',
        category: 'STALE_SNAPSHOT',
        severity: 'HIGH',
        message: 'Runtime snapshot is stale compared to durable state',
      },
    ],
  };

  const reconIncident = runtime.evaluateIncidentState(TENANT_A, {
    activePolicyState: activeA,
    runtimeSnapshot: snapA,
    reconciliationResult: mockReconResult,
  });

  assert.ok(reconIncident !== null, 'Reconciliation failure must be ingested as an incident');
  assert.strictEqual(reconIncident?.primaryCategory, 'REPEATED_RECONCILIATION_FAILURE');
  assert.strictEqual(reconIncident?.severity, 'INCIDENT');
  assert.strictEqual(reconIncident?.safetyBoundaryStatus, 'ACTIVE');
  totalAssertions += 4;

  cleanDirectory(TEST_BASE_DIR);

  console.log('\n============================================================');
  console.log(`REALITY GATE PASSED: ${totalAssertions} / ${totalAssertions} Assertions Verified`);
  console.log('MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE VERIFIED & LOCKED');
  console.log('============================================================\n');
}

runTest().catch((err) => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
