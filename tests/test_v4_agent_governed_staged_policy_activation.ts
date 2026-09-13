// tests/test_v4_agent_governed_staged_policy_activation.ts
// BOWCON V4.0 — MS-1.3.70 DEDICATED REALITY GATE
// GOVERNED STAGED POLICY ACTIVATION LAYER

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createStagedActivationId,
  createActivationPreflightId,
  createActivationCommitId,
  createActivePolicyStateId,
  createStagedActivationProvenanceId,
  PolicyActivationRevalidationEngine,
  PolicyStagingEngine,
  PolicyActivationPreflightEngine,
  PolicyGovernedActivationBoundary,
  PolicyActiveStateTransitionEngine,
  PolicyActivationStateStore,
  PolicyStagedActivationProvenanceEngine,
  PolicyStagedActivationAuditEngine,
  PolicyStagedActivationRuntime,
  type StagedPolicy,
  type ActivePolicyState,
} from '../src/core/policyStagedActivation/index.js';
import {
  createCandidateDraftId,
  createEvolutionPlanId,
} from '../src/core/policyEvolutionPlanning/index.js';
import { createPolicyEvolutionIntakeId } from '../src/core/policyFeedbackReview/index.js';
import {
  createAuthorizationRequestId,
  createAuthorizationDecisionId,
  createActivationReadinessId,
  type CandidateAuthorizationRequest,
  type HumanAuthorizationDecision,
  type ActivationReadinessDecision,
} from '../src/core/policyCandidateAuthorization/index.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

console.log('======================================================================');
console.log('BOWCON V4.0 — MILESTONE 1.3.70 REALITY GATE');
console.log('GOVERNED STAGED POLICY ACTIVATION LAYER');
console.log('======================================================================\n');

let assertionCount = 0;
function pass(category: string, message: string): void {
  assertionCount++;
  console.log(`  [PASS] [CATEGORY ${category}] ${message}`);
}

const testBaseDir = path.resolve(process.cwd(), 'data', 'partitions_staged_activation_reality');
if (fs.existsSync(testBaseDir)) {
  fs.rmSync(testBaseDir, { recursive: true, force: true });
}
fs.mkdirSync(testBaseDir, { recursive: true });

function createMockAuthorizedCandidate(tenant: string = 'tenant_activation_alpha', customChanges: Record<string, any> = {}) {
  const intakeId = createPolicyEvolutionIntakeId(`peintake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const planId = createEvolutionPlanId(`evplan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const draftId = createCandidateDraftId(`cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const reqId = createAuthorizationRequestId(`authreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const decId = createAuthorizationDecisionId(`authdec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const readyId = createActivationReadinessId(`actready_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24h future

  const draft = Object.freeze({
    candidateDraftId: draftId,
    evolutionPlanId: planId,
    intakeId,
    tenantPartition: tenant,
    sourcePolicyVersion: 'v4.0.0',
    proposedChanges: Object.freeze({
      maxConcurrency: 50,
      circuitBreakerErrorThreshold: 10,
      ...customChanges,
    }),
    rationale: 'Governed operational capacity adjustment',
    expectedEffects: Object.freeze(['Increased resilience']),
    constraintsSummary: Object.freeze(['CONSTRAINTS_VERIFIED']),
    requiredHumanReview: true,
    provenanceHeadHash: crypto.createHash('sha256').update(draftId).digest('hex'),
    createdAt: now,
    isActivePolicy: false as const,
    isPolicyMutation: false as const,
    isAutonomousMutation: false as const,
  });

  const validation = Object.freeze({
    valid: true,
    candidateDraftId: draftId,
    status: 'VALID' as const,
    tenantPartition: tenant,
    issues: Object.freeze([]),
    validatedAt: now,
  });

  const request: CandidateAuthorizationRequest = Object.freeze({
    requestId: reqId,
    candidateDraftId: draftId,
    evolutionPlanId: planId,
    intakeId,
    tenantPartition: tenant,
    sourcePolicyVersion: 'v4.0.0',
    targetPolicyDomain: 'OPERATIONAL_GOVERNANCE',
    requestedAction: 'AUTHORIZE_FOR_ACTIVATION',
    requestedBy: 'operator_dan',
    rationale: 'Requesting staging and activation authorization',
    requiredRole: 'MASTER_HUMAN_OPERATOR',
    candidateDraft: draft,
    candidateValidation: validation,
    provenanceHeadHash: draft.provenanceHeadHash,
    createdAt: now,
    expiresAt,
  });

  const decision: HumanAuthorizationDecision = Object.freeze({
    decisionId: decId,
    requestId: reqId,
    candidateDraftId: draftId,
    evolutionPlanId: planId,
    intakeId,
    tenantPartition: tenant,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'AUTHORIZE',
    reason: 'Approved after governance review',
    decidedAt: now,
    isActivePolicy: false as const,
    isPolicyMutation: false as const,
    isAutonomousMutation: false as const,
    provenanceHash: crypto.createHash('sha256').update(decId).digest('hex'),
  });

  const readiness: ActivationReadinessDecision = Object.freeze({
    readinessId: readyId,
    candidateDraftId: draftId,
    authorizationDecisionId: decId,
    evolutionPlanId: planId,
    intakeId,
    tenantPartition: tenant,
    state: 'READY_FOR_ACTIVATION',
    prerequisitesSatisfied: Object.freeze(['ALL_PREREQUISITES_SATISFIED']),
    blockingReasons: Object.freeze([]),
    evaluatedAt: now,
    isActivePolicy: false as const,
    isActivated: false as const,
  });

  return { request, decision, readiness, draft, validation };
}

async function runRealityGate(): Promise<void> {
  // ========================================================================
  // CATEGORY A: Branded identifiers
  // ========================================================================
  console.log('--- CATEGORY A: Branded identifiers ---');
  const stgId = createStagedActivationId('stg_001');
  assert.strictEqual(stgId, 'stg_001');
  pass('A', 'createStagedActivationId returns branded identifier');

  const prefltId = createActivationPreflightId('preflt_001');
  assert.strictEqual(prefltId, 'preflt_001');
  pass('A', 'createActivationPreflightId returns branded identifier');

  const comId = createActivationCommitId('actcom_001');
  assert.strictEqual(comId, 'actcom_001');
  pass('A', 'createActivationCommitId returns branded identifier');

  const stateId = createActivePolicyStateId('polstate_001');
  assert.strictEqual(stateId, 'polstate_001');
  pass('A', 'createActivePolicyStateId returns branded identifier');

  const provId = createStagedActivationProvenanceId('actprov_001');
  assert.strictEqual(provId, 'actprov_001');
  pass('A', 'createStagedActivationProvenanceId returns branded identifier');

  assert.throws(() => createStagedActivationId(''), /INVALID_STAGED_ACTIVATION_ID/);
  pass('A', 'createStagedActivationId rejects empty string fail-closed');

  assert.throws(() => createActivationCommitId('   '), /INVALID_ACTIVATION_COMMIT_ID/);
  pass('A', 'createActivationCommitId rejects whitespace fail-closed');

  // ========================================================================
  // CATEGORY B: Immutable DTOs
  // ========================================================================
  console.log('--- CATEGORY B: Immutable DTOs ---');
  const runtime = new PolicyStagedActivationRuntime({ baseDir: testBaseDir });
  const mock1 = createMockAuthorizedCandidate('tenant_staged_alpha');
  const staged = runtime.stagePolicy({
    request: mock1.request,
    decision: mock1.decision,
    readiness: mock1.readiness,
    proposedVersion: 'v4.1.0',
  });
  assert.strictEqual(Object.isFrozen(staged), true);
  assert.strictEqual(Object.isFrozen(staged.stagedModifications), true);
  assert.strictEqual(Object.isFrozen(staged.preflightRequirements), true);
  pass('B', 'StagedPolicy DTO and nested objects are strictly frozen and immutable');

  // ========================================================================
  // CATEGORY C: Valid candidate consumption
  // ========================================================================
  console.log('--- CATEGORY C: Valid candidate consumption ---');
  assert.strictEqual(staged.candidateDraftId, mock1.draft.candidateDraftId);
  assert.strictEqual(staged.evolutionPlanId, mock1.draft.evolutionPlanId);
  assert.strictEqual(staged.intakeId, mock1.draft.intakeId);
  assert.strictEqual(staged.state, 'STAGED');
  pass('C', 'Valid authorized candidate is successfully consumed and staged');

  // ========================================================================
  // CATEGORY D: Invalid candidate rejection
  // ========================================================================
  console.log('--- CATEGORY D: Invalid candidate rejection ---');
  const revalEngine = new PolicyActivationRevalidationEngine({ baseDir: testBaseDir });
  const invalidMock = createMockAuthorizedCandidate('tenant_invalid_cand');
  const badReq = {
    ...invalidMock.request,
    candidateValidation: {
      ...invalidMock.validation,
      valid: false,
      status: 'INVALID' as const,
    },
  };
  const revalInvalid = revalEngine.revalidateForActivation({
    request: badReq,
    decision: invalidMock.decision,
    readiness: invalidMock.readiness,
  });
  assert.strictEqual(revalInvalid.valid, false);
  assert.strictEqual(revalInvalid.status, 'INVALID');
  pass('D', 'Invalid candidate fails pre-activation revalidation fail-closed');

  // ========================================================================
  // CATEGORY E: Expired candidate rejection
  // ========================================================================
  console.log('--- CATEGORY E: Expired candidate rejection ---');
  const expiredMock = createMockAuthorizedCandidate('tenant_expired_cand');
  const expReq = {
    ...expiredMock.request,
    expiresAt: new Date(Date.now() - 5000).toISOString(),
  };
  const revalExpired = revalEngine.revalidateForActivation({
    request: expReq,
    decision: expiredMock.decision,
    readiness: expiredMock.readiness,
  });
  assert.strictEqual(revalExpired.valid, false);
  assert.strictEqual(revalExpired.status, 'EXPIRED');
  pass('E', 'Expired candidate fails pre-activation revalidation with status EXPIRED');

  // ========================================================================
  // CATEGORY F: Superseded candidate rejection
  // ========================================================================
  console.log('--- CATEGORY F: Superseded candidate rejection ---');
  const supersededMock = createMockAuthorizedCandidate('tenant_superseded_cand');
  const supReq = {
    ...supersededMock.request,
    supersededBy: 'cand_newer_002',
  };
  const revalSuperseded = revalEngine.revalidateForActivation({
    request: supReq,
    decision: supersededMock.decision,
    readiness: supersededMock.readiness,
  });
  assert.strictEqual(revalSuperseded.valid, false);
  assert.strictEqual(revalSuperseded.status, 'SUPERSEDED');
  pass('F', 'Superseded candidate fails pre-activation revalidation with status SUPERSEDED');

  // ========================================================================
  // CATEGORY G: Authorization verification
  // ========================================================================
  console.log('--- CATEGORY G: Authorization verification ---');
  const unauthMock = createMockAuthorizedCandidate('tenant_unauth_cand');
  const rejDec = {
    ...unauthMock.decision,
    decision: 'REJECT' as const,
  };
  const revalUnauth = revalEngine.revalidateForActivation({
    request: unauthMock.request,
    decision: rejDec,
    readiness: unauthMock.readiness,
  });
  assert.strictEqual(revalUnauth.valid, false);
  assert.strictEqual(revalUnauth.status, 'INVALID');
  pass('G', 'Candidate lacking human AUTHORIZE decision rejected fail-closed');

  // ========================================================================
  // CATEGORY H: Expired authorization rejection
  // ========================================================================
  console.log('--- CATEGORY H: Expired authorization rejection ---');
  assert.strictEqual(revalExpired.issues.some(i => i.includes('EXPIRED')), true);
  pass('H', 'Expired authorization request fails closed with EXPIRED issue');

  // ========================================================================
  // CATEGORY I: Activation readiness verification
  // ========================================================================
  console.log('--- CATEGORY I: Activation readiness verification ---');
  const unreadyMock = createMockAuthorizedCandidate('tenant_unready_cand');
  const notReadyDec = {
    ...unreadyMock.readiness,
    state: 'PENDING_HUMAN_AUTHORIZATION' as const,
  };
  const revalNotReady = revalEngine.revalidateForActivation({
    request: unreadyMock.request,
    decision: unreadyMock.decision,
    readiness: notReadyDec,
  });
  assert.strictEqual(revalNotReady.valid, false);
  pass('I', 'Candidate not in READY_FOR_ACTIVATION state rejected fail-closed');

  // ========================================================================
  // CATEGORY J: STAGED creation
  // ========================================================================
  console.log('--- CATEGORY J: STAGED creation ---');
  assert.strictEqual(staged.proposedPolicyVersion, 'v4.1.0');
  assert.ok(staged.preflightRequirements.includes('VERIFY_SOURCE_POLICY_VERSION_CONSISTENCY'));
  assert.ok(/^[a-f0-9]{64}$/i.test(staged.provenanceHeadHash));
  pass('J', 'StagedPolicy created with proposed version, preflight requirements, and cryptographic hash');

  // ========================================================================
  // CATEGORY K: STAGED ≠ ACTIVE_POLICY
  // ========================================================================
  console.log('--- CATEGORY K: STAGED ≠ ACTIVE_POLICY ---');
  assert.strictEqual(staged.isActivePolicy, false);
  assert.strictEqual(staged.isActivated, false);
  assert.strictEqual(staged.isAutonomousMutation, false);
  pass('K', 'Staged policy explicitly declared non-active (STAGED_POLICY != ACTIVE_POLICY)');

  // ========================================================================
  // CATEGORY L: Preflight READY
  // ========================================================================
  console.log('--- CATEGORY L: Preflight READY ---');
  const preflight = runtime.runPreflight(staged);
  assert.strictEqual(preflight.status, 'READY');
  assert.strictEqual(preflight.blockingReasons.length, 0);
  assert.ok(preflight.checksPassed.includes('STAGED_POLICY_STATE_VALID'));
  pass('L', 'Clean staged policy preflight verification evaluates to READY');

  // ========================================================================
  // CATEGORY M: Preflight BLOCKED
  // ========================================================================
  console.log('--- CATEGORY M: Preflight BLOCKED ---');
  const preflightEngine = new PolicyActivationPreflightEngine({ baseDir: testBaseDir });
  const forbiddenStaged: StagedPolicy = {
    ...staged,
    stagedModifications: { executeAction: 'delete_database' },
  };
  const blockedPreflight = preflightEngine.runPreflight(forbiddenStaged);
  assert.strictEqual(blockedPreflight.status, 'BLOCKED');
  assert.ok(blockedPreflight.blockingReasons.some(r => r.includes('delete_database')));
  pass('M', 'Preflight fails BLOCKED when staged modifications contain hard-forbidden actions');

  // ========================================================================
  // CATEGORY N: Preflight UNKNOWN
  // ========================================================================
  console.log('--- CATEGORY N: Preflight UNKNOWN ---');
  // Unknown or corrupted state never becomes READY
  const corruptStaged: StagedPolicy = {
    ...staged,
    state: 'UNKNOWN' as any,
  };
  const corruptPreflight = preflightEngine.runPreflight(corruptStaged);
  assert.notStrictEqual(corruptPreflight.status, 'READY');
  assert.strictEqual(corruptPreflight.status, 'INVALID');
  pass('N', 'Unknown or invalid staged state never produces preflight READY');

  // ========================================================================
  // CATEGORY O: Autonomous activation rejection
  // ========================================================================
  console.log('--- CATEGORY O: Autonomous activation rejection ---');
  const boundary = new PolicyGovernedActivationBoundary({ baseDir: testBaseDir });
  const autonomousPersonas = [
    'auto_promoter',
    'bot_activator',
    'ai_agent_007',
    'autonomous_agent',
    'synthetic_daemon',
    'system_daemon',
    'agent_worker',
    'daemon_proc',
    'cron_job',
    'scheduler_tick',
    'runtime_executor',
  ];
  for (const persona of autonomousPersonas) {
    assert.throws(() => {
      boundary.assertHumanOperator(persona);
    }, /AUTONOMOUS_ACTIVATION_BLOCKED/);
  }
  pass('O', 'All autonomous actor personas rejected with AUTONOMOUS_ACTIVATION_BLOCKED');

  // ========================================================================
  // CATEGORY P: Anonymous activation rejection
  // ========================================================================
  console.log('--- CATEGORY P: Anonymous activation rejection ---');
  assert.throws(() => {
    boundary.assertHumanOperator('anonymous');
  }, /UNAUTHORIZED_OPERATOR_IDENTITY/);
  pass('P', 'Anonymous operator rejected at governed activation boundary');

  // ========================================================================
  // CATEGORY Q: Guest activation rejection
  // ========================================================================
  console.log('--- CATEGORY Q: Guest activation rejection ---');
  assert.throws(() => {
    boundary.assertHumanOperator('guest');
  }, /UNAUTHORIZED_OPERATOR_IDENTITY/);
  pass('Q', 'Guest operator rejected at governed activation boundary');

  // ========================================================================
  // CATEGORY R: Self-approval rejection
  // ========================================================================
  console.log('--- CATEGORY R: Self-approval rejection ---');
  assert.throws(() => {
    // candidateProposer was 'operator_dan'
    runtime.authorizeActivation({
      stagedPolicy: staged,
      preflight,
      operatorId: 'operator_dan',
      operatorRole: 'MASTER_HUMAN_OPERATOR',
      governanceRationale: 'Self-clearance attempt',
      candidateProposer: 'operator_dan',
    });
  }, /ANTI_SELF_APPROVAL_VIOLATION/);
  pass('R', 'Candidate proposer cannot grant activation clearance (ANTI_SELF_APPROVAL_VIOLATION)');

  // ========================================================================
  // CATEGORY S: Hard-forbidden action rejection
  // ========================================================================
  console.log('--- CATEGORY S: Hard-forbidden action rejection ---');
  const hardForbiddenMock = createMockAuthorizedCandidate('tenant_hf_test', {
    action: 'transfer_funds',
  });
  const revalHF = revalEngine.revalidateForActivation({
    request: hardForbiddenMock.request,
    decision: hardForbiddenMock.decision,
    readiness: hardForbiddenMock.readiness,
  });
  assert.strictEqual(revalHF.valid, false);
  assert.strictEqual(revalHF.status, 'BLOCKED');
  pass('S', 'Hard-forbidden action permanently BLOCKED fail-closed');

  // ========================================================================
  // CATEGORY T: USER_STOP supremacy
  // ========================================================================
  console.log('--- CATEGORY T: USER_STOP supremacy ---');
  let userStopActive = false;
  const usRuntime = new PolicyStagedActivationRuntime({
    baseDir: testBaseDir,
    isUserStopActive: () => userStopActive,
  });
  userStopActive = true;

  assert.throws(() => {
    usRuntime.stagePolicy({
      request: mock1.request,
      decision: mock1.decision,
      readiness: mock1.readiness,
    });
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('T', 'stagePolicy suspended immediately by USER_STOP supremacy');

  assert.throws(() => {
    usRuntime.runPreflight(staged);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('T', 'runPreflight suspended immediately by USER_STOP supremacy');

  assert.throws(() => {
    usRuntime.authorizeActivation({
      stagedPolicy: staged,
      preflight,
      operatorId: 'operator_bob',
      operatorRole: 'MASTER_HUMAN_OPERATOR',
      governanceRationale: 'Valid rationale',
      candidateProposer: 'operator_dan',
    });
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('T', 'authorizeActivation suspended immediately by USER_STOP supremacy');

  // ========================================================================
  // CATEGORY U: Tenant isolation
  // ========================================================================
  console.log('--- CATEGORY U: Tenant isolation ---');
  const crossTenantStaged = runtime.getStagedPolicy('tenant_other_beta', staged.candidateDraftId);
  assert.strictEqual(crossTenantStaged, null);
  const crossTenantActive = runtime.getActivePolicy('tenant_other_beta');
  assert.strictEqual(crossTenantActive, null);
  pass('U', 'Tenant B cannot read or inspect Tenant A staged or active policies');

  // ========================================================================
  // CATEGORY V: Traversal protection
  // ========================================================================
  console.log('--- CATEGORY V: Traversal protection ---');
  assert.throws(() => {
    runtime.getStagedPolicy('../../traversal', staged.candidateDraftId);
  }, /Path traversal|RESOLVER_SECURITY_VIOLATION/);
  pass('V', 'Path traversal in tenant partition strictly blocked fail-closed');

  // ========================================================================
  // CATEGORY W: Reserved-name protection
  // ========================================================================
  console.log('--- CATEGORY W: Reserved-name protection ---');
  assert.throws(() => {
    runtime.getStagedPolicy('CON', staged.candidateDraftId);
  }, /Windows reserved (device )?name|RESOLVER_SECURITY_VIOLATION/);
  pass('W', 'Windows reserved device name rejected fail-closed');

  // ========================================================================
  // CATEGORY X: Replay / idempotency
  // ========================================================================
  console.log('--- CATEGORY X: Replay / idempotency ---');
  const repeatedStaged = runtime.stagePolicy({
    request: mock1.request,
    decision: mock1.decision,
    readiness: mock1.readiness,
    proposedVersion: 'v4.1.0',
  });
  assert.strictEqual(repeatedStaged.stagedActivationId, staged.stagedActivationId);
  pass('X', 'Repeated staging of identical candidate returns existing staged record');

  // ========================================================================
  // CATEGORY Y: Conflicting activation rejection
  // ========================================================================
  console.log('--- CATEGORY Y: Conflicting activation rejection ---');
  assert.throws(() => {
    runtime.stagePolicy({
      request: mock1.request,
      decision: {
        ...mock1.decision,
        decisionId: createAuthorizationDecisionId('authdec_conflict_009'),
      },
      readiness: mock1.readiness,
    });
  }, /CONFLICTING_STAGING_REQUEST/);
  pass('Y', 'Staging with conflicting authorization decision rejected fail-closed');

  // Grant legitimate human activation clearance
  const governedAuth = runtime.authorizeActivation({
    stagedPolicy: staged,
    preflight,
    operatorId: 'operator_sam',
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    governanceRationale: 'Production activation authorized by Master Human Operator',
    candidateProposer: 'operator_dan',
  });
  assert.strictEqual(governedAuth.authorizedBy, 'operator_sam');

  // Commit activation to ACTIVE_POLICY
  const activePolicy = runtime.commitActivation({
    stagedPolicy: staged,
    governedAuthorization: governedAuth,
  });
  assert.strictEqual(activePolicy.isActivePolicy, true);
  assert.strictEqual(activePolicy.isActivated, true);
  assert.strictEqual(activePolicy.activePolicyVersion, 'v4.1.0');

  // ========================================================================
  // CATEGORY Z: Existing active-policy conflict
  // ========================================================================
  console.log('--- CATEGORY Z: Existing active-policy conflict ---');
  // Attempting to activate a candidate expecting source version 'v1.0.0' when active is 'v4.1.0'
  const mockConflict = createMockAuthorizedCandidate('tenant_staged_alpha');
  const stagedConflict: StagedPolicy = {
    ...staged,
    stagedActivationId: createStagedActivationId('stg_conflict_001'),
    candidateDraftId: mockConflict.draft.candidateDraftId,
    sourcePolicyVersion: 'v1.0.0', // Out of sync with active v4.1.0!
    proposedPolicyVersion: 'v1.1.0',
  };
  const conflictAuth = {
    ...governedAuth,
    stagedActivationId: stagedConflict.stagedActivationId,
  };
  assert.throws(() => {
    runtime.commitActivation({
      stagedPolicy: stagedConflict,
      governedAuthorization: conflictAuth,
    });
  }, /ACTIVE_POLICY_VERSION_CONFLICT/);
  pass('Z', 'Out-of-sequence source version commit rejected with ACTIVE_POLICY_VERSION_CONFLICT');

  // ========================================================================
  // CATEGORY AA: Provenance chain creation
  // ========================================================================
  console.log('--- CATEGORY AA: Provenance chain creation ---');
  const chainVerified = runtime.verifyProvenance(staged.tenantPartition, staged.candidateDraftId);
  assert.strictEqual(chainVerified, true);
  pass('AA', 'End-to-end cryptographic SHA-256 provenance chain verifies unbroken');

  // ========================================================================
  // CATEGORY AB: Provenance tamper detection
  // ========================================================================
  console.log('--- CATEGORY AB: Provenance tamper detection ---');
  const provEngine = new PolicyStagedActivationProvenanceEngine({ baseDir: testBaseDir });
  provEngine.appendEvent('tenant_tamper_act', mock1.draft.candidateDraftId, 'EVENT_A', { details: { step: 1 } });
  provEngine.appendEvent('tenant_tamper_act', mock1.draft.candidateDraftId, 'EVENT_B', { details: { step: 2 } });

  const chainMap = (provEngine as any).chains.get('tenant_tamper_act').get(mock1.draft.candidateDraftId);
  chainMap[1] = { ...chainMap[1], recordHash: 'tampered_hash_value_000000000000000000000000000000000000000000000' };

  assert.throws(() => {
    provEngine.verifyChain('tenant_tamper_act', mock1.draft.candidateDraftId);
  }, /PROVENANCE_TAMPER_DETECTED/);
  pass('AB', 'Tampered provenance hash detected and rejected fail-closed (PROVENANCE_TAMPER_DETECTED)');

  // ========================================================================
  // CATEGORY AC: Audit emission
  // ========================================================================
  console.log('--- CATEGORY AC: Audit emission ---');
  const auditEntries = globalAuditLedger.getTrail({ domain: PolicyStagedActivationAuditEngine.CANONICAL_DOMAIN });
  assert.ok(auditEntries.length >= 4);
  assert.strictEqual(auditEntries[0].domain, 'POLICY_STAGED_ACTIVATION');
  pass('AC', 'Audit events canonicalized under domain POLICY_STAGED_ACTIVATION');

  // ========================================================================
  // CATEGORY AD: Secret sanitization
  // ========================================================================
  console.log('--- CATEGORY AD: Secret sanitization ---');
  const auditEngine = new PolicyStagedActivationAuditEngine();
  auditEngine.recordEvent({
    eventType: 'ACTIVATION_COMMITTED',
    tenantPartition: 'tenant_leak_test',
    candidateDraftId: 'cand_leak_002',
    operatorId: 'operator_sam',
    details: {
      apiToken: 'Bearer super_secret_access_token_12345',
      privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----',
    },
  });
  const trail = globalAuditLedger.getTrail({ domain: PolicyStagedActivationAuditEngine.CANONICAL_DOMAIN });
  const lastEvent = trail[trail.length - 1];
  const stringified = JSON.stringify(lastEvent);
  assert.ok(!stringified.includes('super_secret_access_token_12345'));
  assert.ok(!stringified.includes('-----BEGIN RSA PRIVATE KEY-----'));
  pass('AD', 'Sensitive API tokens and private keys scrubbed before audit ledger commit');

  // ========================================================================
  // CATEGORY AE: Corrupted state fail-closed
  // ========================================================================
  console.log('--- CATEGORY AE: Corrupted state fail-closed ---');
  const corruptTenantDir = path.join(testBaseDir, 'tenant_corrupt_act', 'active_policy');
  fs.mkdirSync(corruptTenantDir, { recursive: true });
  fs.writeFileSync(path.join(corruptTenantDir, 'active_policy.json'), '{{{ corrupted json @@##', 'utf8');

  const corruptStore = new PolicyActivationStateStore({ baseDir: testBaseDir });
  assert.throws(() => {
    corruptStore.getActivePolicy('tenant_corrupt_act');
  }, /ACTIVATION_STORE_CORRUPTION/);
  pass('AE', 'Corrupted store JSON fails closed with ACTIVATION_STORE_CORRUPTION');

  // ========================================================================
  // CATEGORY AF: Deterministic output
  // ========================================================================
  console.log('--- CATEGORY AF: Deterministic output ---');
  const preflight1 = preflightEngine.runPreflight(staged);
  const preflight2 = preflightEngine.runPreflight(staged);
  assert.strictEqual(preflight1.status, preflight2.status);
  assert.strictEqual(preflight1.checksPassed.length, preflight2.checksPassed.length);
  pass('AF', 'Deterministic preflight execution produces identical results');

  // ========================================================================
  // CATEGORY AG: No autonomous rollback
  // ========================================================================
  console.log('--- CATEGORY AG: No autonomous rollback ---');
  assert.strictEqual((runtime as any).autonomousRollback, undefined);
  assert.strictEqual((runtime as any).rollbackPolicy, undefined);
  pass('AG', 'PolicyStagedActivationRuntime contains zero autonomous rollback methods');

  // ========================================================================
  // CATEGORY AH: No direct tool execution
  // ========================================================================
  console.log('--- CATEGORY AH: No direct tool execution ---');
  assert.strictEqual((runtime as any).executeTool, undefined);
  assert.strictEqual((runtime as any).executeShell, undefined);
  pass('AH', 'PolicyStagedActivationRuntime contains zero tool execution methods');

  // ========================================================================
  // CATEGORY AI: No forbidden primitives
  // ========================================================================
  console.log('--- CATEGORY AI: No forbidden primitives ---');
  const domainDir = path.resolve(process.cwd(), 'src', 'core', 'policyStagedActivation');
  const domainFiles = fs.readdirSync(domainDir).filter(f => f.endsWith('.ts'));
  const forbiddenRegex = /child_process|execSync|exec\(|spawn\(|fork\(|eval\(|Function\(/;
  for (const file of domainFiles) {
    const content = fs.readFileSync(path.join(domainDir, file), 'utf8');
    assert.ok(!forbiddenRegex.test(content), `Forbidden primitive in ${file}`);
  }
  pass('AI', 'Static scan confirms zero forbidden primitives in policyStagedActivation domain');

  // ========================================================================
  // CATEGORY AJ: No authority leakage
  // ========================================================================
  console.log('--- CATEGORY AJ: No authority leakage ---');
  const authorityRegex = /autonomousPromote|autonomousApprove|issueToken|autonomousRollback|resetCircuitBreaker|executeTool|executeShell|executeUntrustedCode|mutatePolicy|createCandidate|activateCandidate|promoteCandidate|rollbackPolicy/;
  for (const file of domainFiles) {
    const content = fs.readFileSync(path.join(domainDir, file), 'utf8');
    assert.ok(!authorityRegex.test(content), `Authority leakage in ${file}`);
  }
  pass('AJ', 'Static scan confirms zero authority leakage across policyStagedActivation domain');

  // ========================================================================
  // CATEGORY AK: Atomic / fail-closed activation behavior
  // ========================================================================
  console.log('--- CATEGORY AK: Atomic / fail-closed activation behavior ---');
  const retrievedActive = runtime.getActivePolicy(staged.tenantPartition);
  assert.notStrictEqual(retrievedActive, null);
  assert.strictEqual(retrievedActive!.activePolicyVersion, 'v4.1.0');
  assert.strictEqual(retrievedActive!.isActivePolicy, true);
  assert.strictEqual(retrievedActive!.isActivated, true);
  pass('AK', 'ActivePolicyState committed atomically and verified in durable storage');

  // ========================================================================
  // CATEGORY AL: Final Reality Gate
  // ========================================================================
  console.log('--- CATEGORY AL: Final Reality Gate ---');
  assert.strictEqual(fs.existsSync('C:\\BOW\\shopofbow'), false, 'Protected workspace must not exist');
  pass('AL', 'Protected workspace C:\\BOW\\shopofbow verified untouched and does not exist');

  console.log('\n======================================================================');
  console.log(`REALITY GATE COMPLETE: All ${assertionCount} assertions PASSED`);
  console.log('REALITY GATE SUCCESS: All assertions PASS');
  console.log('======================================================================\n');
}

runRealityGate().catch((err) => {
  console.error('REALITY GATE FAILED:', err);
  process.exit(1);
});
