// tests/test_v4_agent_governed_candidate_authorization.ts
// BOWCON V4.0 — MS-1.3.69 DEDICATED REALITY GATE
// GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createCandidateAuthorizationId,
  createAuthorizationDecisionId,
  createActivationReadinessId,
  createAuthorizationProvenanceId,
  createAuthorizationRequestId,
  PolicyCandidateAuthorizationRevalidationEngine,
  PolicyHumanAuthorizationGate,
  PolicyCandidateAuthorizationEngine,
  PolicyActivationReadinessEngine,
  PolicyAuthorizationDecisionStore,
  PolicyAuthorizationProvenanceEngine,
  PolicyCandidateAuthorizationAuditEngine,
  PolicyCandidateAuthorizationRuntime,
  type CandidateAuthorizationRequest,
  type HumanAuthorizationDecision,
  type ActivationReadinessDecision,
} from '../src/core/policyCandidateAuthorization/index.js';
import {
  createCandidateDraftId,
  createEvolutionPlanId,
} from '../src/core/policyEvolutionPlanning/index.js';
import { createPolicyEvolutionIntakeId } from '../src/core/policyFeedbackReview/index.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

console.log('======================================================================');
console.log('BOWCON V4.0 — MILESTONE 1.3.69 REALITY GATE');
console.log('GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER');
console.log('======================================================================\n');

let assertionCount = 0;
function pass(category: string, message: string): void {
  assertionCount++;
  console.log(`  [PASS] [CATEGORY ${category}] ${message}`);
}

const testBaseDir = path.resolve(process.cwd(), 'data', 'partitions_candidate_auth_reality');
if (fs.existsSync(testBaseDir)) {
  fs.rmSync(testBaseDir, { recursive: true, force: true });
}
fs.mkdirSync(testBaseDir, { recursive: true });

function createMockDraft(tenant: string = 'tenant_authorizer_alpha', customChanges: Record<string, any> = {}) {
  const intakeId = createPolicyEvolutionIntakeId(`peintake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const planId = createEvolutionPlanId(`evplan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const draftId = createCandidateDraftId(`cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  const draft = Object.freeze({
    candidateDraftId: draftId,
    evolutionPlanId: planId,
    intakeId,
    tenantPartition: tenant,
    sourcePolicyVersion: 'v4.0.0-rc1',
    proposedChanges: Object.freeze({
      rateLimitPerMinute: 120,
      circuitBreakerThreshold: 5,
      ...customChanges,
    }),
    rationale: 'Governed rate limit update for operational stability',
    expectedEffects: Object.freeze(['Improves burst tolerance']),
    constraintsSummary: Object.freeze(['SAFETY_FLOOR_VERIFIED']),
    requiredHumanReview: true,
    provenanceHeadHash: crypto.createHash('sha256').update(draftId).digest('hex'),
    createdAt: new Date().toISOString(),
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
    validatedAt: new Date().toISOString(),
  });

  return { draft, validation };
}

async function runRealityGate(): Promise<void> {
  // --- CATEGORY A: Branded identifiers ---
  console.log('--- CATEGORY A: Branded identifiers ---');
  const authId = createCandidateAuthorizationId('auth_001');
  assert.strictEqual(authId, 'auth_001');
  pass('A', 'createCandidateAuthorizationId returns branded identifier');

  const decId = createAuthorizationDecisionId('dec_001');
  assert.strictEqual(decId, 'dec_001');
  pass('A', 'createAuthorizationDecisionId returns branded identifier');

  const readyId = createActivationReadinessId('ready_001');
  assert.strictEqual(readyId, 'ready_001');
  pass('A', 'createActivationReadinessId returns branded identifier');

  const provId = createAuthorizationProvenanceId('prov_001');
  assert.strictEqual(provId, 'prov_001');
  pass('A', 'createAuthorizationProvenanceId returns branded identifier');

  const reqId = createAuthorizationRequestId('req_001');
  assert.strictEqual(reqId, 'req_001');
  pass('A', 'createAuthorizationRequestId returns branded identifier');

  assert.throws(() => createCandidateAuthorizationId(''), /INVALID_CANDIDATE_AUTHORIZATION_ID/);
  pass('A', 'createCandidateAuthorizationId rejects empty string fail-closed');

  assert.throws(() => createAuthorizationDecisionId('  '), /INVALID_AUTHORIZATION_DECISION_ID/);
  pass('A', 'createAuthorizationDecisionId rejects whitespace fail-closed');

  // --- CATEGORY B: Candidate linkage ---
  console.log('--- CATEGORY B: Candidate linkage ---');
  const runtime = new PolicyCandidateAuthorizationRuntime({ baseDir: testBaseDir });
  const { draft, validation } = createMockDraft('tenant_linkage_test');
  const req = runtime.requestAuthorization({
    candidateDraft: draft,
    candidateValidation: validation,
    requestedBy: 'operator_dan',
  });
  assert.strictEqual(req.candidateDraftId, draft.candidateDraftId);
  assert.strictEqual(req.evolutionPlanId, draft.evolutionPlanId);
  assert.strictEqual(req.intakeId, draft.intakeId);
  assert.strictEqual(req.tenantPartition, draft.tenantPartition);
  assert.strictEqual(req.sourcePolicyVersion, 'v4.0.0-rc1');
  assert.strictEqual(req.targetPolicyDomain, 'OPERATIONAL_GOVERNANCE');
  pass('B', 'CandidateAuthorizationRequest preserves strict linkage to draft, plan, intake, and domain');

  // --- CATEGORY C: Valid authorization request ---
  console.log('--- CATEGORY C: Valid authorization request ---');
  assert.strictEqual(req.requestedAction, 'AUTHORIZE_FOR_ACTIVATION');
  assert.strictEqual(req.requiredRole, 'MASTER_HUMAN_OPERATOR');
  assert.strictEqual(typeof req.expiresAt, 'string');
  assert.ok(/^[a-f0-9]{64}$/i.test(req.provenanceHeadHash));
  pass('C', 'Valid candidate draft produces complete authorization request with cryptographic head hash');

  // --- CATEGORY D: Invalid candidate ---
  console.log('--- CATEGORY D: Invalid candidate ---');
  const revalEngine = new PolicyCandidateAuthorizationRevalidationEngine({ baseDir: testBaseDir });
  const invalidReq = {
    ...req,
    candidateValidation: {
      ...validation,
      valid: false,
      status: 'INVALID' as const,
      issues: ['SCHEMA_ERROR: invalid rate limit'],
    },
  };
  const revalInvalid = revalEngine.revalidateCandidateForAuthorization(invalidReq);
  assert.strictEqual(revalInvalid.valid, false);
  assert.strictEqual(revalInvalid.status, 'INVALID');
  pass('D', 'Invalid candidate validation fails revalidation fail-closed');

  // --- CATEGORY E: Blocked candidate ---
  console.log('--- CATEGORY E: Blocked candidate ---');
  const { draft: blockedDraft, validation: blockedVal } = createMockDraft('tenant_blocked_test', {
    deleteDatabase: true,
  });
  const blockedReq = runtime.requestAuthorization({
    candidateDraft: {
      ...blockedDraft,
      proposedChanges: { action: 'delete_database' },
    },
    candidateValidation: blockedVal,
    requestedBy: 'operator_dan',
  });
  const revalBlocked = revalEngine.revalidateCandidateForAuthorization(blockedReq);
  assert.strictEqual(revalBlocked.valid, false);
  assert.strictEqual(revalBlocked.status, 'BLOCKED');
  pass('E', 'Candidate invoking hard-forbidden action is BLOCKED fail-closed');

  // --- CATEGORY F: Expired candidate ---
  console.log('--- CATEGORY F: Expired candidate ---');
  const expiredReq: CandidateAuthorizationRequest = {
    ...req,
    expiresAt: new Date(Date.now() - 10000).toISOString(), // 10s in past
  };
  const revalExpired = revalEngine.revalidateCandidateForAuthorization(expiredReq);
  assert.strictEqual(revalExpired.valid, false);
  assert.strictEqual(revalExpired.status, 'EXPIRED');
  pass('F', 'Expired candidate draft fails revalidation with status EXPIRED');

  // --- CATEGORY G: Superseded candidate ---
  console.log('--- CATEGORY G: Superseded candidate ---');
  const supersededReq: CandidateAuthorizationRequest = {
    ...req,
    supersededBy: 'cand_newer_candidate_002',
  };
  const revalSuperseded = revalEngine.revalidateCandidateForAuthorization(supersededReq);
  assert.strictEqual(revalSuperseded.valid, false);
  assert.strictEqual(revalSuperseded.status, 'SUPERSEDED');
  pass('G', 'Superseded candidate draft fails revalidation with status SUPERSEDED');

  // --- CATEGORY H: Tenant isolation ---
  console.log('--- CATEGORY H: Tenant isolation ---');
  // Tenant B cannot retrieve Tenant A decision
  const crossTenantDecision = runtime.getAuthorizationDecision('tenant_b_isolated', draft.candidateDraftId);
  assert.strictEqual(crossTenantDecision, null);

  // Path traversal is strictly rejected
  assert.throws(() => {
    runtime.getAuthorizationDecision('../../traversal', draft.candidateDraftId);
  }, /Path traversal|PATH_TRAVERSAL_DETECTED|RESOLVER_SECURITY_VIOLATION/);

  // Mismatched tenant partition between request and draft fails closed in revalidation
  const mismatchedTenantReq: CandidateAuthorizationRequest = {
    ...req,
    tenantPartition: 'tenant_mismatch_adversary',
  };
  const revalMismatch = revalEngine.revalidateCandidateForAuthorization(mismatchedTenantReq);
  assert.strictEqual(revalMismatch.valid, false);
  assert.strictEqual(revalMismatch.status, 'INVALID');
  assert.ok(revalMismatch.issues.some(i => i.includes('LINKAGE_MISMATCH')));
  pass('H', 'Tenant isolation strictly blocks path traversal and cross-tenant access');

  // --- CATEGORY I: Unauthorized reviewer ---
  console.log('--- CATEGORY I: Unauthorized reviewer ---');
  const humanGate = new PolicyHumanAuthorizationGate({ baseDir: testBaseDir });
  assert.throws(() => {
    humanGate.validateReviewer(req, 'regular_dev', 'DEVELOPER');
  }, /UNAUTHORIZED_GOVERNANCE_ROLE/);
  pass('I', 'Reviewer with unauthorized role rejected fail-closed');

  // --- CATEGORY J: Autonomous reviewer ---
  console.log('--- CATEGORY J: Autonomous reviewer ---');
  const autonomousPersonas = [
    'auto_promoter',
    'bot_verifier',
    'ai_agent_42',
    'autonomous_evaluator',
    'synthetic_decision_maker',
    'system_daemon_worker',
    'agent_supervisor',
    'daemon_proc',
    'cron_nightly_job',
    'scheduler_tick',
    'runtime_worker',
  ];
  for (const persona of autonomousPersonas) {
    assert.throws(() => {
      humanGate.assertHumanIdentity(persona);
    }, /AUTONOMOUS_REVIEWER_BLOCKED/);
  }
  pass('J', 'All autonomous reviewer identities rejected with AUTONOMOUS_REVIEWER_BLOCKED');

  // --- CATEGORY K: Anti-self-approval ---
  console.log('--- CATEGORY K: Anti-self-approval ---');
  assert.throws(() => {
    // requestedBy was 'operator_dan'
    humanGate.validateReviewer(req, 'operator_dan', 'MASTER_HUMAN_OPERATOR');
  }, /ANTI_SELF_APPROVAL_VIOLATION/);
  pass('K', 'Candidate request author cannot approve own candidate (ANTI_SELF_APPROVAL_VIOLATION)');

  // --- CATEGORY L: Human authorization ---
  console.log('--- CATEGORY L: Human authorization ---');
  const authResult = runtime.submitHumanDecision({
    request: req,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'AUTHORIZE',
    reason: 'Approved after independent verification and safety checks',
  });
  assert.strictEqual(authResult.decision.decision, 'AUTHORIZE');
  assert.strictEqual(authResult.decision.reviewerId, 'operator_alice');
  assert.ok(!Number.isNaN(Date.parse(authResult.decision.decidedAt)));
  pass('L', 'Valid human authorization succeeds with AUTHORIZE and valid ISO decidedAt');

  // --- CATEGORY M: Rejection ---
  console.log('--- CATEGORY M: Rejection ---');
  const { draft: rejDraft, validation: rejVal } = createMockDraft('tenant_rej_test');
  const rejReq = runtime.requestAuthorization({
    candidateDraft: rejDraft,
    candidateValidation: rejVal,
    requestedBy: 'operator_dan',
  });
  const rejResult = runtime.submitHumanDecision({
    request: rejReq,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'REJECT',
    reason: 'Safety margins inadequate',
  });
  assert.strictEqual(rejResult.decision.decision, 'REJECT');
  assert.strictEqual(rejResult.readiness.state, 'REJECTED');
  pass('M', 'Human decision REJECT records rejection and marks readiness REJECTED');

  // --- CATEGORY N: Deferral ---
  console.log('--- CATEGORY N: Deferral ---');
  const { draft: defDraft, validation: defVal } = createMockDraft('tenant_def_test');
  const defReq = runtime.requestAuthorization({
    candidateDraft: defDraft,
    candidateValidation: defVal,
    requestedBy: 'operator_dan',
  });
  const defResult = runtime.submitHumanDecision({
    request: defReq,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'DEFER',
    reason: 'Deferred until maintenance window',
  });
  assert.strictEqual(defResult.decision.decision, 'DEFER');
  assert.strictEqual(defResult.readiness.state, 'PENDING_HUMAN_AUTHORIZATION');
  pass('N', 'Human decision DEFER marks readiness PENDING_HUMAN_AUTHORIZATION');

  // --- CATEGORY O: More evidence ---
  console.log('--- CATEGORY O: More evidence ---');
  const { draft: evDraft, validation: evVal } = createMockDraft('tenant_ev_test');
  const evReq = runtime.requestAuthorization({
    candidateDraft: evDraft,
    candidateValidation: evVal,
    requestedBy: 'operator_dan',
  });
  const evResult = runtime.submitHumanDecision({
    request: evReq,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'REQUEST_MORE_EVIDENCE',
    reason: 'Need synthetic load simulation receipts',
  });
  assert.strictEqual(evResult.decision.decision, 'REQUEST_MORE_EVIDENCE');
  pass('O', 'Human decision REQUEST_MORE_EVIDENCE records correctly');

  // --- CATEGORY P: Cancellation ---
  console.log('--- CATEGORY P: Cancellation ---');
  const { draft: canDraft, validation: canVal } = createMockDraft('tenant_can_test');
  const canReq = runtime.requestAuthorization({
    candidateDraft: canDraft,
    candidateValidation: canVal,
    requestedBy: 'operator_dan',
  });
  const canResult = runtime.submitHumanDecision({
    request: canReq,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'CANCEL',
    reason: 'Superseded by operational directive',
  });
  assert.strictEqual(canResult.decision.decision, 'CANCEL');
  pass('P', 'Human decision CANCEL records correctly');

  // --- CATEGORY Q: Idempotency ---
  console.log('--- CATEGORY Q: Idempotency ---');
  const replayResult = runtime.submitHumanDecision({
    request: req,
    reviewerId: 'operator_alice',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    decision: 'AUTHORIZE',
    reason: 'Approved after independent verification and safety checks',
  });
  assert.strictEqual(replayResult.decision.decisionId, authResult.decision.decisionId);
  pass('Q', 'Repeated identical decision submission is idempotent and returns existing record');

  // --- CATEGORY R: Conflicting replay ---
  console.log('--- CATEGORY R: Conflicting replay ---');
  assert.throws(() => {
    runtime.submitHumanDecision({
      request: req,
      reviewerId: 'operator_charlie',
      reviewerRole: 'MASTER_HUMAN_OPERATOR',
      decision: 'REJECT',
      reason: 'Attempting conflicting decision rewrite',
    });
  }, /CONFLICTING_AUTHORIZATION_DECISION/);
  pass('R', 'Conflicting authorization decision rewrite fails closed');

  // --- CATEGORY S: Activation readiness ---
  console.log('--- CATEGORY S: Activation readiness ---');
  assert.strictEqual(authResult.readiness.state, 'READY_FOR_ACTIVATION');
  assert.ok(authResult.readiness.prerequisitesSatisfied.includes('HUMAN_AUTHORIZATION_GRANTED'));
  assert.ok(authResult.readiness.prerequisitesSatisfied.includes('CANDIDATE_SCHEMA_AND_CONSTRAINTS_VALID'));
  assert.strictEqual(authResult.readiness.blockingReasons.length, 0);
  pass('S', 'Authorized and clean candidate achieves state READY_FOR_ACTIVATION with 0 blocking reasons');

  // --- CATEGORY T: Authorization does NOT activate ---
  console.log('--- CATEGORY T: Authorization does NOT activate ---');
  assert.strictEqual(authResult.decision.isActivePolicy, false);
  assert.strictEqual(authResult.decision.isPolicyMutation, false);
  assert.strictEqual(authResult.decision.isAutonomousMutation, false);
  assert.ok(/^[a-f0-9]{64}$/i.test(authResult.decision.provenanceHash));
  pass('T', 'Human authorization decision is explicitly non-active and non-mutating with cryptographic SHA-256 provenance hash');

  // --- CATEGORY U: Readiness does NOT activate ---
  console.log('--- CATEGORY U: Readiness does NOT activate ---');
  assert.strictEqual(authResult.readiness.isActivePolicy, false);
  assert.strictEqual(authResult.readiness.isActivated, false);
  assert.ok(/^actready_[a-f0-9]{16}$/.test(authResult.readiness.readinessId));
  pass('U', 'Activation readiness evaluation is explicitly non-active with canonical branded readinessId');

  // --- CATEGORY V: Zero policy mutation ---
  console.log('--- CATEGORY V: Zero policy mutation ---');
  assert.strictEqual((runtime as any).mutatePolicy, undefined);
  assert.strictEqual((runtime as any).updatePolicyRegistry, undefined);
  pass('V', 'PolicyCandidateAuthorizationRuntime contains zero policy mutation methods');

  // --- CATEGORY W: Zero candidate activation ---
  console.log('--- CATEGORY W: Zero candidate activation ---');
  assert.strictEqual((runtime as any).activateCandidate, undefined);
  assert.strictEqual((runtime as any).activatePolicy, undefined);
  pass('W', 'PolicyCandidateAuthorizationRuntime contains zero candidate activation methods');

  // --- CATEGORY X: Zero promotion ---
  console.log('--- CATEGORY X: Zero promotion ---');
  assert.strictEqual((runtime as any).promoteCandidate, undefined);
  assert.strictEqual((runtime as any).autonomousPromote, undefined);
  pass('X', 'PolicyCandidateAuthorizationRuntime contains zero promotion methods');

  // --- CATEGORY Y: Zero rollback ---
  console.log('--- CATEGORY Y: Zero rollback ---');
  assert.strictEqual((runtime as any).rollbackPolicy, undefined);
  assert.strictEqual((runtime as any).autonomousRollback, undefined);
  pass('Y', 'PolicyCandidateAuthorizationRuntime contains zero rollback methods');

  // --- CATEGORY Z: Zero autonomous authorization ---
  console.log('--- CATEGORY Z: Zero autonomous authorization ---');
  assert.strictEqual((runtime as any).autonomousApprove, undefined);
  assert.strictEqual((runtime as any).autonomousAuthorize, undefined);
  pass('Z', 'PolicyCandidateAuthorizationRuntime contains zero autonomous authorization methods');

  // --- CATEGORY AA: USER_STOP ---
  console.log('--- CATEGORY AA: USER_STOP ---');
  let userStopActive = false;
  const userStopRuntime = new PolicyCandidateAuthorizationRuntime({
    baseDir: testBaseDir,
    isUserStopActive: () => userStopActive,
  });

  const { draft: usDraft, validation: usVal } = createMockDraft('tenant_us_test');
  userStopActive = true;

  assert.throws(() => {
    userStopRuntime.requestAuthorization({
      candidateDraft: usDraft,
      candidateValidation: usVal,
      requestedBy: 'operator_dan',
    });
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('AA', 'requestAuthorization suspended immediately by USER_STOP');

  assert.throws(() => {
    userStopRuntime.submitHumanDecision({
      request: req,
      reviewerId: 'operator_alice',
      reviewerRole: 'MASTER_HUMAN_OPERATOR',
      decision: 'AUTHORIZE',
      reason: 'Should fail',
    });
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('AA', 'submitHumanDecision suspended immediately by USER_STOP');

  assert.throws(() => {
    userStopRuntime.getAuthorizationDecision(req.tenantPartition, req.candidateDraftId);
  }, /OPERATION_SUSPENDED_BY_USER_STOP/);
  pass('AA', 'getAuthorizationDecision suspended immediately by USER_STOP');

  // --- CATEGORY AB: Provenance integrity ---
  console.log('--- CATEGORY AB: Provenance integrity ---');
  const chainValid = runtime.verifyAuthorizationProvenance(req.tenantPartition, req.candidateDraftId);
  assert.strictEqual(chainValid, true);
  pass('AB', 'Cryptographic SHA-256 provenance chain verifies successfully');

  // --- CATEGORY AC: Provenance tampering ---
  console.log('--- CATEGORY AC: Provenance tampering ---');
  const provEngine = new PolicyAuthorizationProvenanceEngine({ baseDir: testBaseDir });
  provEngine.appendEvent(
    'tenant_tamper_test',
    draft.candidateDraftId,
    draft.evolutionPlanId,
    'EVENT_1',
    { details: { step: 1 } }
  );
  provEngine.appendEvent(
    'tenant_tamper_test',
    draft.candidateDraftId,
    draft.evolutionPlanId,
    'EVENT_2',
    { details: { step: 2 } }
  );

  // Directly tamper with private chain record
  const chainsMap = (provEngine as any).chains.get('tenant_tamper_test');
  const records = chainsMap.get(draft.candidateDraftId);
  records[1] = {
    ...records[1],
    recordHash: 'bad_hash_tampered_0000000000000000000000000000000000000000000000000',
  };

  assert.throws(() => {
    provEngine.verifyChain('tenant_tamper_test', draft.candidateDraftId);
  }, /PROVENANCE_TAMPER_DETECTED/);
  pass('AC', 'Tampered provenance hash detected and rejected fail-closed (PROVENANCE_TAMPER_DETECTED)');

  // --- CATEGORY AD: Audit integrity ---
  console.log('--- CATEGORY AD: Audit integrity ---');
  const auditEntries = globalAuditLedger.getTrail({ domain: PolicyCandidateAuthorizationAuditEngine.CANONICAL_DOMAIN });
  assert.ok(auditEntries.length >= 2, 'Audit ledger must contain recorded candidate authorization events');
  assert.strictEqual(auditEntries[0].domain, 'POLICY_CANDIDATE_AUTHORIZATION');
  pass('AD', 'Audit records canonical events under domain POLICY_CANDIDATE_AUTHORIZATION');

  // --- CATEGORY AE: Secret sanitization ---
  console.log('--- CATEGORY AE: Secret sanitization ---');
  const auditEngine = new PolicyCandidateAuthorizationAuditEngine();
  auditEngine.recordEvent({
    eventType: 'CANDIDATE_AUTHORIZED',
    tenantPartition: 'tenant_leak_test',
    candidateDraftId: 'cand_leak_001',
    reviewerId: 'operator_alice',
    reason: 'Authorization reason',
    details: {
      bearerToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----',
    },
  });
  const leakEvents = globalAuditLedger.getTrail({ domain: PolicyCandidateAuthorizationAuditEngine.CANONICAL_DOMAIN });
  const lastEvent = leakEvents[leakEvents.length - 1];
  const stringified = JSON.stringify(lastEvent);
  assert.ok(!stringified.includes('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive'));
  assert.ok(!stringified.includes('-----BEGIN PRIVATE KEY-----'));
  pass('AE', 'Sensitive tokens and private keys scrubbed via DiagnosisSanitizer before audit ledger commit');

  // --- CATEGORY AF: Contradictory evidence ---
  console.log('--- CATEGORY AF: Contradictory evidence ---');
  const contradictoryReq: CandidateAuthorizationRequest = {
    ...req,
    candidateValidation: {
      ...validation,
      valid: true, // Claims valid
      issues: ['CRITICAL_FAILURE: contradiction'], // But contains issues!
    },
  };
  const revalContradictory = revalEngine.revalidateCandidateForAuthorization(contradictoryReq);
  assert.strictEqual(revalContradictory.status, 'CONTRADICTORY');
  assert.strictEqual(revalContradictory.valid, false);
  pass('AF', 'Contradictory evidence detected and rejected fail-closed');

  // --- CATEGORY AG: Determinism ---
  console.log('--- CATEGORY AG: Determinism ---');
  const readinessEngine = new PolicyActivationReadinessEngine({ baseDir: testBaseDir });
  const r1 = readinessEngine.evaluateReadiness(req, authResult.decision);
  const r2 = readinessEngine.evaluateReadiness(req, authResult.decision);
  assert.strictEqual(r1.state, r2.state);
  assert.strictEqual(r1.prerequisitesSatisfied.length, r2.prerequisitesSatisfied.length);
  pass('AG', 'Deterministic evaluation produces identical readiness state');

  const rejReadiness = readinessEngine.evaluateReadiness(rejReq, rejResult.decision);
  assert.strictEqual(rejReadiness.state, 'REJECTED');
  assert.ok(rejReadiness.blockingReasons.some(r => r.includes('HUMAN_DECISION_REJECTED')));
  pass('AG', 'Rejected candidate readiness evaluation deterministically reflects REJECTED state');

  // --- CATEGORY AH: Corrupted storage ---
  console.log('--- CATEGORY AH: Corrupted storage ---');
  const corruptDir = path.join(testBaseDir, 'tenant_corrupt', 'candidate_authorizations');
  fs.mkdirSync(corruptDir, { recursive: true });
  fs.writeFileSync(path.join(corruptDir, 'authorizations.json'), '{ invalid json @@#$', 'utf8');

  const corruptStore = new PolicyAuthorizationDecisionStore({ baseDir: testBaseDir });
  assert.throws(() => {
    corruptStore.getDecisionByCandidate('tenant_corrupt', 'cand_001');
  }, /AUTHORIZATION_STORE_CORRUPTION/);
  pass('AH', 'Corrupted store JSON fails closed with AUTHORIZATION_STORE_CORRUPTION');

  // --- CATEGORY AI: Forbidden primitive scan ---
  console.log('--- CATEGORY AI: Forbidden primitive scan ---');
  const authDomainDir = path.resolve(process.cwd(), 'src', 'core', 'policyCandidateAuthorization');
  const authFiles = fs.readdirSync(authDomainDir).filter(f => f.endsWith('.ts'));
  const forbiddenRegex = /child_process|execSync|exec\(|spawn\(|fork\(|eval\(|Function\(/;
  for (const file of authFiles) {
    const content = fs.readFileSync(path.join(authDomainDir, file), 'utf8');
    assert.ok(!forbiddenRegex.test(content), `File ${file} contains forbidden primitive`);
  }
  pass('AI', 'Static scan confirms zero forbidden primitives across policyCandidateAuthorization domain');

  // --- CATEGORY AJ: Authority leakage scan ---
  console.log('--- CATEGORY AJ: Authority leakage scan ---');
  const authorityRegex = /autonomousPromote|autonomousApprove|issueToken|autonomousRollback|resetCircuitBreaker|executeTool|executeShell|executeUntrustedCode|mutatePolicy|activateCandidate|promoteCandidate|rollbackPolicy/;
  for (const file of authFiles) {
    const content = fs.readFileSync(path.join(authDomainDir, file), 'utf8');
    // Ensure no authority methods defined
    assert.ok(!authorityRegex.test(content), `File ${file} contains authority leakage`);
  }
  pass('AJ', 'Static scan confirms zero authority leakage across policyCandidateAuthorization domain');

  // --- CATEGORY AK: Direct mutation / PEP bypass ---
  console.log('--- CATEGORY AK: Direct mutation / PEP bypass ---');
  const mutationRegex = /GovernedPolicyEnforcementPoint\.execute|PolicyRegistry|activePolicy/;
  for (const file of authFiles) {
    const content = fs.readFileSync(path.join(authDomainDir, file), 'utf8');
    assert.ok(!mutationRegex.test(content), `File ${file} contains direct PEP bypass or PolicyRegistry reference`);
  }
  pass('AK', 'Static scan confirms zero direct PEP bypass or policy mutation paths');

  // --- CATEGORY AL: Final Reality Gate ---
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
