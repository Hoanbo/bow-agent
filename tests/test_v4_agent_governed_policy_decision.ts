// tests/test_v4_agent_governed_policy_decision.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Dedicated Reality Gate Test Suite.
// Verifies all 29 categories (A through AC):
// - Branded identifiers
// - Proposal creation & deterministic recommendations
// - Evidence linkage & integrity validation
// - Invalid & stale evidence rejection
// - Strict tenant isolation & anonymous fail-closed
// - Human authorization & autonomous actor rejection
// - Single-use anti-replay token defense
// - Mismatched proposal/tenant/candidate rejection
// - Decision & remediation state machines
// - Rejection & expiration lifecycles
// - USER_STOP supremacy & circuit-breaker interlock
// - Hard-forbidden action immutability
// - Provenance chain integrity & tamper detection
// - Audit correlation & secret sanitization
// - Controlled remediation boundary & zero direct tool execution
// - Zero forbidden primitives & zero autonomous authority leakage

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

import {
  createDecisionId,
  createDecisionProposalId,
  createRemediationRequestId,
  createDecisionProvenanceId,
  PolicyDecisionEngine,
  PolicyRemediationPlanner,
  PolicyDecisionAuthorizationGate,
  PolicyControlledRemediationBoundary,
  PolicyDecisionProvenanceEngine,
  PolicyDecisionAuditEngine,
  PolicyDecisionRuntime,
  globalPolicyDecisionRuntime,
  type PolicyDecisionAuthorizationToken,
} from '../src/core/policyDecision/index.js';

import {
  createPolicyCandidateId,
  PolicyCanaryCircuitBreaker,
} from '../src/core/policyCanary/index.js';

import {
  createPolicyLifecycleTraceId,
  createIntegrityVerificationId,
  type InvestigationSummary,
} from '../src/core/policyEvidence/index.js';

import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

// ============================================================================
// TEST HARNESS
// ============================================================================
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
    failures.push(message);
  }
}

function assertThrows(fn: () => void, expectedSubstring: string, message: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${message} — Expected error containing "${expectedSubstring}" but no error thrown`);
    failed++;
    failures.push(message);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    if (msg.includes(expectedSubstring)) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message} — Expected "${expectedSubstring}", got "${msg}"`);
      failed++;
      failures.push(message);
    }
  }
}

function createMockInvestigationSummary(overrides?: Partial<InvestigationSummary>): InvestigationSummary {
  const tenantPartition = overrides?.tenantPartition ?? 'tenant_decision_test';
  const candidateId = overrides?.candidateId ?? createPolicyCandidateId('cand_test_001');
  const candidatePolicyVersion = overrides?.candidatePolicyVersion ?? 'v2.0.0';

  return {
    candidateId,
    tenantPartition,
    candidatePolicyVersion,
    generatedAt: overrides?.generatedAt ?? new Date().toISOString(),
    advisorySummary: 'Test advisory summary',
    integrityResult: overrides?.integrityResult ?? {
      verificationId: createIntegrityVerificationId('vfy_001'),
      tenantPartition,
      candidateId,
      candidatePolicyVersion,
      status: 'VALID',
      provenanceValid: true,
      provenanceRecordCount: 2,
      provenanceHeadHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      chronologicalOrderValid: true,
      ringTransitionsMonotonic: true,
      tenantIsolationConsistent: true,
      policyVersionConsistent: true,
      auditReferencesValid: true,
      checkDetails: [],
      failureReasons: [],
      verifiedAt: new Date().toISOString(),
    },
    lifecycleTrace: overrides?.lifecycleTrace ?? {
      traceId: createPolicyLifecycleTraceId('trc_001'),
      candidateId,
      tenantPartition,
      candidatePolicyVersion,
      currentRing: 'RING_0',
      currentState: 'SHADOWING',
      isGloballyActive: false,
      wasRolledBack: false,
      wasCircuitBreakerTripped: false,
      milestones: [],
      events: [],
      reconstructedAt: new Date().toISOString(),
      missingRings: ['RING_1', 'RING_2', 'RING_3', 'RING_4'],
    },
    auditCorrelation: overrides?.auditCorrelation ?? {
      correlationId: 'ecorr_001' as any,
      tenantPartition,
      candidateId,
      matchedCount: 1,
      unmatchedEvidenceCount: 0,
      correlatedRecords: [],
      analyzedAt: new Date().toISOString(),
    },
  };
}

console.log('======================================================================');
console.log('REALITY GATE: MS-1.3.64 GOVERNED POLICY DECISION & CONTROLLED REMEDIATION');
console.log('======================================================================');
console.log('');

// ============================================================================
// CATEGORY A: Branded Identifiers
// ============================================================================
console.log('--- CATEGORY A: Branded identifiers ---');
{
  const did = createDecisionId('dec_test_001');
  assert(did === 'dec_test_001', '[CATEGORY A] createDecisionId valid');

  const pid = createDecisionProposalId('prop_test_001');
  assert(pid === 'prop_test_001', '[CATEGORY A] createDecisionProposalId valid');

  const rid = createRemediationRequestId('rem_test_001');
  assert(rid === 'rem_test_001', '[CATEGORY A] createRemediationRequestId valid');

  const prid = createDecisionProvenanceId('dprov_test_001');
  assert(prid === 'dprov_test_001', '[CATEGORY A] createDecisionProvenanceId valid');

  assertThrows(
    () => createDecisionId(''),
    'INVALID_DECISION_ID',
    '[CATEGORY A] Empty DecisionId rejected'
  );
  assertThrows(
    () => createDecisionProposalId('   '),
    'INVALID_DECISION_PROPOSAL_ID',
    '[CATEGORY A] Whitespace DecisionProposalId rejected'
  );
}

// ============================================================================
// CATEGORY B: Proposal Creation
// ============================================================================
console.log('--- CATEGORY B: Proposal creation ---');
{
  const engine = new PolicyDecisionEngine();
  const summary = createMockInvestigationSummary();
  const proposal = engine.generateProposal(summary);

  assert(proposal.state === 'PENDING_HUMAN_REVIEW', '[CATEGORY B] Proposal in PENDING_HUMAN_REVIEW');
  assert(proposal.requiresHumanAuthorization === true, '[CATEGORY B] requiresHumanAuthorization is true');
  assert(proposal.tenantPartition === summary.tenantPartition, '[CATEGORY B] tenantPartition matches');
  assert(proposal.candidateId === summary.candidateId, '[CATEGORY B] candidateId matches');
  assert(Boolean(proposal.proposalId), '[CATEGORY B] proposalId generated');
}

// ============================================================================
// CATEGORY C: Deterministic Recommendation
// ============================================================================
console.log('--- CATEGORY C: Deterministic recommendation ---');
{
  const engine = new PolicyDecisionEngine();

  // Test 1: Circuit breaker tripped -> BLOCK_POLICY_CANDIDATE
  const cbSummary = createMockInvestigationSummary();
  (cbSummary.lifecycleTrace as any).wasCircuitBreakerTripped = true;
  const cbProp = engine.generateProposal(cbSummary);
  assert(cbProp.recommendation === 'BLOCK_POLICY_CANDIDATE', '[CATEGORY C] Circuit breaker trips BLOCK recommendation');

  // Test 2: Rolled back -> ROLLBACK_TO_BASELINE
  const rbSummary = createMockInvestigationSummary();
  (rbSummary.lifecycleTrace as any).wasRolledBack = true;
  (rbSummary.lifecycleTrace as any).rollbackReason = 'SAFETY_REGRESSION';
  const rbProp = engine.generateProposal(rbSummary);
  assert(rbProp.recommendation === 'ROLLBACK_TO_BASELINE', '[CATEGORY C] Rollback triggers ROLLBACK_TO_BASELINE');

  // Test 3: Globally active and clean -> PROCEED_TO_NEXT_RING_REVIEW
  const gaSummary = createMockInvestigationSummary();
  (gaSummary.lifecycleTrace as any).isGloballyActive = true;
  const gaProp = engine.generateProposal(gaSummary);
  assert(gaProp.recommendation === 'PROCEED_TO_NEXT_RING_REVIEW', '[CATEGORY C] Globally active candidate receives PROCEED recommendation');
}

// ============================================================================
// CATEGORY D: Evidence Linkage
// ============================================================================
console.log('--- CATEGORY D: Evidence linkage ---');
{
  const engine = new PolicyDecisionEngine();
  const summary = createMockInvestigationSummary();
  const proposal = engine.generateProposal(summary);

  assert(proposal.evidenceLinkage !== undefined, '[CATEGORY D] evidenceLinkage present');
  assert(proposal.evidenceLinkage.tenantPartition === summary.tenantPartition, '[CATEGORY D] Linked tenant matches');
  assert(proposal.evidenceLinkage.integrityStatus === 'VALID', '[CATEGORY D] Linked integrity status matches');
  assert(proposal.evidenceLinkage.provenanceHeadHash === summary.integrityResult.provenanceHeadHash, '[CATEGORY D] Provenance head hash bound');
}

// ============================================================================
// CATEGORY E: Integrity Validation
// ============================================================================
console.log('--- CATEGORY E: Integrity validation ---');
{
  const engine = new PolicyDecisionEngine();
  const degradedSummary = createMockInvestigationSummary();
  (degradedSummary.integrityResult as any).status = 'DEGRADED';

  const degradedProp = engine.generateProposal(degradedSummary);
  assert(degradedProp.recommendation === 'QUARANTINE_BROKEN_PROVENANCE', '[CATEGORY E] DEGRADED integrity triggers QUARANTINE');
}

// ============================================================================
// CATEGORY F: Invalid Evidence Rejection
// ============================================================================
console.log('--- CATEGORY F: Invalid evidence rejection ---');
{
  const engine = new PolicyDecisionEngine();
  const invalidSummary = createMockInvestigationSummary();
  (invalidSummary.integrityResult as any).status = 'INVALID';

  assertThrows(
    () => engine.generateProposal(invalidSummary),
    'INVALID_EVIDENCE_INTEGRITY',
    '[CATEGORY F] INVALID integrity rejected'
  );

  const missingSummary = createMockInvestigationSummary();
  (missingSummary.integrityResult as any).status = 'MISSING';

  assertThrows(
    () => engine.generateProposal(missingSummary),
    'MISSING_EVIDENCE',
    '[CATEGORY F] MISSING integrity rejected'
  );
}

// ============================================================================
// CATEGORY G: Stale Evidence Rejection
// ============================================================================
console.log('--- CATEGORY G: Stale evidence rejection ---');
{
  const engine = new PolicyDecisionEngine({ maxStalenessMs: 1000 }); // 1 second threshold
  const staleSummary = createMockInvestigationSummary({
    generatedAt: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
  });

  assertThrows(
    () => engine.generateProposal(staleSummary),
    'STALE_EVIDENCE_REJECTED',
    '[CATEGORY G] Stale evidence (>1000ms) rejected'
  );
}

// ============================================================================
// CATEGORY H: Tenant Isolation
// ============================================================================
console.log('--- CATEGORY H: Tenant isolation ---');
{
  const engine = new PolicyDecisionEngine();
  const summaryA = createMockInvestigationSummary({ tenantPartition: 'tenant_alpha' });
  const propA = engine.generateProposal(summaryA);

  assertThrows(
    () => engine.getProposal('tenant_beta', propA.proposalId),
    'PROPOSAL_NOT_FOUND',
    '[CATEGORY H] Tenant Beta cannot access Tenant Alpha proposal'
  );

  assertThrows(
    () => engine.getProposal('../tenant_alpha', propA.proposalId),
    'Path traversal or illegal separator detected',
    '[CATEGORY H] Path traversal in tenantPartition rejected'
  );

  assertThrows(
    () => engine.getProposal('anonymous', propA.proposalId),
    'Anonymous or unresolved user cannot access',
    '[CATEGORY H] Anonymous tenant rejected'
  );
}

// ============================================================================
// CATEGORY I: Human Authorization
// ============================================================================
console.log('--- CATEGORY I: Human authorization ---');
{
  const gate = new PolicyDecisionAuthorizationGate();
  const engine = new PolicyDecisionEngine();
  const summary = createMockInvestigationSummary();
  const proposal = engine.generateProposal(summary);

  const validToken: PolicyDecisionAuthorizationToken = {
    tokenId: 'tok_valid_001',
    proposalId: proposal.proposalId,
    tenantPartition: proposal.tenantPartition,
    candidateId: proposal.candidateId,
    operatorUserId: 'operator_human_alice',
    isHuman: true,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: 'sig_valid_001',
  };

  const result = gate.validateAndConsumeToken(validToken, proposal);
  assert(result.valid === true, '[CATEGORY I] Human token validated and consumed');
  assert(result.operatorUserId === 'operator_human_alice', '[CATEGORY I] Operator ID bound');
}

// ============================================================================
// CATEGORY J: Missing Authorization
// ============================================================================
console.log('--- CATEGORY J: Missing authorization ---');
{
  const boundary = new PolicyControlledRemediationBoundary();
  const unauthorizedRequest: any = {
    requestId: createRemediationRequestId('rem_unauth_001'),
    tenantPartition: 'tenant_test',
    state: 'AUTHORIZATION_REQUIRED',
    plan: { proposedActions: [] },
  };

  assertThrows(
    () => boundary.dispatchRemediation(unauthorizedRequest),
    'UNAUTHORIZED_REMEDIATION_DENIED',
    '[CATEGORY J] Unauthorized remediation request rejected at boundary'
  );
}

// ============================================================================
// CATEGORY K: Autonomous Authorization Rejection
// ============================================================================
console.log('--- CATEGORY K: Autonomous authorization rejection ---');
{
  const gate = new PolicyDecisionAuthorizationGate();
  const summary = createMockInvestigationSummary();
  const engine = new PolicyDecisionEngine();
  const proposal = engine.generateProposal(summary);

  // Non-human flag
  const autoToken1: PolicyDecisionAuthorizationToken = {
    tokenId: 'tok_auto_001',
    proposalId: proposal.proposalId,
    tenantPartition: proposal.tenantPartition,
    operatorUserId: 'human_operator',
    isHuman: false,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: 'sig_001',
  };

  assertThrows(
    () => gate.validateAndConsumeToken(autoToken1, proposal),
    'AUTONOMOUS_AUTHORIZATION_DENIED',
    '[CATEGORY K] isHuman=false rejected'
  );

  // Autonomous operator ID
  const autoToken2: PolicyDecisionAuthorizationToken = {
    tokenId: 'tok_auto_002',
    proposalId: proposal.proposalId,
    tenantPartition: proposal.tenantPartition,
    operatorUserId: 'autonomous_ai_bot',
    isHuman: true,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: 'sig_002',
  };

  assertThrows(
    () => gate.validateAndConsumeToken(autoToken2, proposal),
    'AUTONOMOUS_AUTHORIZATION_DENIED',
    '[CATEGORY K] Autonomous operator ID pattern rejected'
  );
}

// ============================================================================
// CATEGORY L: Authorization Replay Defense
// ============================================================================
console.log('--- CATEGORY L: Authorization replay defense ---');
{
  const gate = new PolicyDecisionAuthorizationGate();
  const summary = createMockInvestigationSummary();
  const engine = new PolicyDecisionEngine();
  const proposal = engine.generateProposal(summary);

  const token: PolicyDecisionAuthorizationToken = {
    tokenId: 'tok_replay_001',
    proposalId: proposal.proposalId,
    tenantPartition: proposal.tenantPartition,
    operatorUserId: 'operator_bob',
    isHuman: true,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: 'sig_001',
  };

  gate.validateAndConsumeToken(token, proposal);

  assertThrows(
    () => gate.validateAndConsumeToken(token, proposal),
    'AUTHORIZATION_TOKEN_REPLAYED',
    '[CATEGORY L] Replayed token throws AUTHORIZATION_TOKEN_REPLAYED'
  );
}

// ============================================================================
// CATEGORY M: Wrong-Proposal Authorization Rejection
// ============================================================================
console.log('--- CATEGORY M: Wrong-proposal authorization rejection ---');
{
  const gate = new PolicyDecisionAuthorizationGate();
  const summary = createMockInvestigationSummary();
  const engine = new PolicyDecisionEngine();
  const proposal = engine.generateProposal(summary);

  const wrongPropToken: PolicyDecisionAuthorizationToken = {
    tokenId: 'tok_wrong_prop_001',
    proposalId: createDecisionProposalId('prop_mismatched_999'),
    tenantPartition: proposal.tenantPartition,
    operatorUserId: 'operator_bob',
    isHuman: true,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: 'sig_001',
  };

  assertThrows(
    () => gate.validateAndConsumeToken(wrongPropToken, proposal),
    'PROPOSAL_MISMATCH',
    '[CATEGORY M] Token with wrong proposalId rejected'
  );
}

// ============================================================================
// CATEGORY N: Wrong-Tenant Authorization Rejection
// ============================================================================
console.log('--- CATEGORY N: Wrong-tenant authorization rejection ---');
{
  const gate = new PolicyDecisionAuthorizationGate();
  const summary = createMockInvestigationSummary();
  const engine = new PolicyDecisionEngine();
  const proposal = engine.generateProposal(summary);

  const wrongTenantToken: PolicyDecisionAuthorizationToken = {
    tokenId: 'tok_wrong_tenant_001',
    proposalId: proposal.proposalId,
    tenantPartition: 'tenant_attacker_x',
    operatorUserId: 'operator_bob',
    isHuman: true,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: 'sig_001',
  };

  assertThrows(
    () => gate.validateAndConsumeToken(wrongTenantToken, proposal),
    'TENANT_MISMATCH',
    '[CATEGORY N] Token with wrong tenantPartition rejected'
  );
}

// ============================================================================
// CATEGORY O: Decision State Machine
// ============================================================================
console.log('--- CATEGORY O: Decision state machine ---');
{
  const engine = new PolicyDecisionEngine();
  const summary = createMockInvestigationSummary();
  const proposal = engine.generateProposal(summary);

  assert(proposal.state === 'PENDING_HUMAN_REVIEW', '[CATEGORY O] Initial state is PENDING_HUMAN_REVIEW');

  const approved = engine.approveProposal(proposal.tenantPartition, proposal.proposalId, 'op_alice');
  assert(approved.state === 'APPROVED', '[CATEGORY O] Transition to APPROVED valid');
  assert(approved.reviewedBy === 'op_alice', '[CATEGORY O] reviewedBy recorded');

  // Cannot approve again
  assertThrows(
    () => engine.approveProposal(proposal.tenantPartition, proposal.proposalId, 'op_alice'),
    'ILLEGAL_STATE_TRANSITION',
    '[CATEGORY O] Cannot approve already-approved proposal'
  );
}

// ============================================================================
// CATEGORY P: Rejection Lifecycle
// ============================================================================
console.log('--- CATEGORY P: Rejection lifecycle ---');
{
  const engine = new PolicyDecisionEngine();
  const summary = createMockInvestigationSummary();
  const proposal = engine.generateProposal(summary);

  const rejected = engine.rejectProposal(
    proposal.tenantPartition,
    proposal.proposalId,
    'op_alice',
    'SAFETY_RISK_EXCESSIVE'
  );

  assert(rejected.state === 'REJECTED', '[CATEGORY P] Transition to REJECTED valid');
  assert(rejected.rejectionReason === 'SAFETY_RISK_EXCESSIVE', '[CATEGORY P] Rejection reason stored');

  // Cannot approve rejected proposal
  assertThrows(
    () => engine.approveProposal(proposal.tenantPartition, proposal.proposalId, 'op_alice'),
    'ILLEGAL_STATE_TRANSITION',
    '[CATEGORY P] Cannot approve rejected proposal'
  );
}

// ============================================================================
// CATEGORY Q: Expiration Lifecycle
// ============================================================================
console.log('--- CATEGORY Q: Expiration lifecycle ---');
{
  const engine = new PolicyDecisionEngine({ proposalTtlMs: -100 }); // Expired instantly
  const summary = createMockInvestigationSummary();
  const proposal = engine.generateProposal(summary);

  const retrieved = engine.getProposal(proposal.tenantPartition, proposal.proposalId);
  assert(retrieved.state === 'EXPIRED', '[CATEGORY Q] Proposal past TTL transitions to EXPIRED');
  assert(retrieved.expirationReason === 'REVIEW_TIMEOUT', '[CATEGORY Q] expirationReason is REVIEW_TIMEOUT');
}

// ============================================================================
// CATEGORY R: USER_STOP Supremacy
// ============================================================================
console.log('--- CATEGORY R: USER_STOP supremacy ---');
{
  let stopActive = false;
  const runtime = new PolicyDecisionRuntime({
    isUserStopActive: () => stopActive,
  });

  const summary = createMockInvestigationSummary();

  // Works when USER_STOP is inactive
  const prop = runtime.createProposalFromInvestigation(summary);
  assert(prop.state === 'PENDING_HUMAN_REVIEW', '[CATEGORY R] Proposal created when USER_STOP inactive');

  // Activate USER_STOP
  stopActive = true;

  assertThrows(
    () => runtime.createProposalFromInvestigation(summary),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY R] createProposal blocked by USER_STOP'
  );

  assertThrows(
    () => runtime.reviewProposal(prop.tenantPartition, prop.proposalId, 'APPROVE', 'op_human'),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY R] reviewProposal blocked by USER_STOP'
  );

  assertThrows(
    () => runtime.planRemediation(prop.tenantPartition, prop.proposalId),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY R] planRemediation blocked by USER_STOP'
  );

  assertThrows(
    () => runtime.authorizeAndDispatchRemediation({
      tenantPartition: prop.tenantPartition,
      proposalId: prop.proposalId,
      token: {
        tokenId: 'tok_stop_001',
        proposalId: prop.proposalId,
        tenantPartition: prop.tenantPartition,
        operatorUserId: 'op_human',
        isHuman: true,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        signature: 'sig',
      },
    }),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY R] authorizeAndDispatchRemediation blocked by USER_STOP'
  );
}

// ============================================================================
// CATEGORY S: Circuit-Breaker Blocking
// ============================================================================
console.log('--- CATEGORY S: Circuit-breaker blocking ---');
{
  const cb = new PolicyCanaryCircuitBreaker();
  const boundary = new PolicyControlledRemediationBoundary({ circuitBreaker: cb });

  cb.trip({
    tenantPartition: 'tenant_cb_test',
    reason: 'SAFETY_REGRESSION',
    details: 'Tripped in test',
  });

  const request: any = {
    requestId: createRemediationRequestId('rem_cb_001'),
    proposalId: createDecisionProposalId('prop_cb_001'),
    tenantPartition: 'tenant_cb_test',
    state: 'AUTHORIZED',
    authorizationToken: { operatorUserId: 'op_alice' },
    plan: {
      remediationType: 'CALIBRATE_GUARDRAIL', // Non-emergency action
      proposedActions: ['Adjust timeouts'],
    },
  };

  assertThrows(
    () => boundary.dispatchRemediation(request),
    'CIRCUIT_BREAKER_ACTIVE_BLOCKED',
    '[CATEGORY S] Tripped circuit breaker blocks non-safety remediation'
  );
}

// ============================================================================
// CATEGORY T: Hard-Forbidden Remediation Blocking
// ============================================================================
console.log('--- CATEGORY T: Hard-forbidden remediation blocking ---');
{
  const planner = new PolicyRemediationPlanner();

  assertThrows(
    () => planner.assertHardForbiddenImmutability('transfer_funds_allowed'),
    'HARD_FORBIDDEN_REMEDIATION_DENIED',
    '[CATEGORY T] transfer_funds denied'
  );

  assertThrows(
    () => planner.assertHardForbiddenImmutability('delete_database_remediation'),
    'HARD_FORBIDDEN_REMEDIATION_DENIED',
    '[CATEGORY T] delete_database denied'
  );

  assertThrows(
    () => planner.assertHardForbiddenImmutability('bypass_robot_interlocks'),
    'HARD_FORBIDDEN_REMEDIATION_DENIED',
    '[CATEGORY T] bypass_robot_interlocks denied'
  );

  assertThrows(
    () => planner.assertHardForbiddenImmutability('execute_untrusted_host_script'),
    'HARD_FORBIDDEN_REMEDIATION_DENIED',
    '[CATEGORY T] execute_untrusted_host_script denied'
  );
}

// ============================================================================
// CATEGORY U: Provenance Chain Integrity
// ============================================================================
console.log('--- CATEGORY U: Provenance chain integrity ---');
{
  const provenance = new PolicyDecisionProvenanceEngine();
  const did = createDecisionId('dec_prov_001');
  const pid = createDecisionProposalId('prop_prov_001');

  provenance.recordTransition({
    decisionId: did,
    proposalId: pid,
    tenantPartition: 'tenant_prov',
    eventType: 'PROPOSAL_CREATED',
  });

  provenance.recordTransition({
    decisionId: did,
    proposalId: pid,
    tenantPartition: 'tenant_prov',
    eventType: 'PROPOSAL_APPROVED',
    operatorUserId: 'op_alice',
  });

  const checkValid = provenance.verifyChain(did);
  assert(checkValid.valid === true, '[CATEGORY U] Unbroken decision provenance verifies valid');
  assert(checkValid.recordCount === 2, '[CATEGORY U] 2 transitions verified');

  // Tamper with record
  const chain = (provenance as any).chains.get(did);
  chain[1] = { ...chain[1], currentHash: 'tampered_hash_value' };

  const checkTampered = provenance.verifyChain(did);
  assert(checkTampered.valid === false, '[CATEGORY U] Tampered record detected as invalid');
  assert(checkTampered.reason?.includes('PROVENANCE_TAMPER_DETECTED'), '[CATEGORY U] Reason identifies tamper');
}

// ============================================================================
// CATEGORY V: Audit Correlation
// ============================================================================
console.log('--- CATEGORY V: Audit correlation ---');
{
  const auditLedger = new AuditLedger();
  const auditEngine = new PolicyDecisionAuditEngine({ auditLedger });

  const record = auditEngine.recordAuditEvent({
    eventType: 'PROPOSAL_CREATED',
    tenantPartition: 'tenant_aud_v',
    proposalId: 'prop_v_001',
    decisionId: 'dec_v_001',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
    details: { action: 'test_audit' },
  });

  assert(record.domain === 'POLICY_DECISION', '[CATEGORY V] Audit domain is POLICY_DECISION');
  assert(record.approvalId === 'prop_v_001', '[CATEGORY V] approvalId matches proposalId');
  assert(record.signature.length === 64, '[CATEGORY V] Cryptographic signature generated');
}

// ============================================================================
// CATEGORY W: Secret Sanitization
// ============================================================================
console.log('--- CATEGORY W: Secret sanitization ---');
{
  const auditLedger = new AuditLedger();
  const auditEngine = new PolicyDecisionAuditEngine({ auditLedger });

  const record = auditEngine.recordAuditEvent({
    eventType: 'PROPOSAL_CREATED',
    tenantPartition: 'tenant_sanit_w',
    proposalId: 'prop_w_001',
    operatorUserId: 'Bearer secret_token_ey12345',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
    details: { secret: 'super_secret_password', api_key: 'key_abcdef' },
  });

  assert(record.actor.userId.includes('[REDACTED]'), '[CATEGORY W] Bearer token in operatorUserId redacted');
  assert(!record.actor.userId.includes('secret_token_ey12345'), '[CATEGORY W] Raw token not stored');
}

// ============================================================================
// CATEGORY X: Controlled Remediation Boundary
// ============================================================================
console.log('--- CATEGORY X: Controlled remediation boundary ---');
{
  const boundary = new PolicyControlledRemediationBoundary();
  const req: RemediationRequest = {
    requestId: createRemediationRequestId('rem_bnd_001'),
    proposalId: createDecisionProposalId('prop_bnd_001'),
    tenantPartition: 'tenant_bnd_x',
    state: 'AUTHORIZED',
    authorizationToken: {
      tokenId: 'tok_001',
      proposalId: createDecisionProposalId('prop_bnd_001'),
      tenantPartition: 'tenant_bnd_x',
      operatorUserId: 'op_human',
      isHuman: true,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      signature: 'sig',
    },
    plan: {
      planId: 'plan_001',
      proposalId: createDecisionProposalId('prop_bnd_001'),
      tenantPartition: 'tenant_bnd_x',
      remediationType: 'HOLD_CANARY',
      blastRadius: 'TENANT_LOCAL',
      requiredOperatorRole: 'GOVERNED_OPERATOR',
      proposedActions: ['Hold canary observation'],
      safetyPreconditions: ['USER_STOP inactive'],
      plannedAt: new Date().toISOString(),
      explainableSummary: 'Summary',
    },
  };

  const res = boundary.dispatchRemediation(req);
  assert(res.success === true, '[CATEGORY X] Boundary dispatch succeeded');
  assert(res.envelope !== undefined, '[CATEGORY X] RemediationExecutionEnvelope produced');
  assert(res.envelope?.safetyFloorVerified === true, '[CATEGORY X] Safety floor verified');
}

// ============================================================================
// CATEGORY Y: Zero Direct Tool Execution
// ============================================================================
console.log('--- CATEGORY Y: Zero direct tool execution ---');
{
  const boundary = new PolicyControlledRemediationBoundary();
  // Ensure boundary has no executeTool, executeShell, spawn, etc.
  assert((boundary as any).executeTool === undefined, '[CATEGORY Y] Boundary has no executeTool');
  assert((boundary as any).executeShell === undefined, '[CATEGORY Y] Boundary has no executeShell');
  assert((boundary as any).runCommand === undefined, '[CATEGORY Y] Boundary has no runCommand');
}

// ============================================================================
// CATEGORY Z: Zero Forbidden Primitives
// ============================================================================
console.log('--- CATEGORY Z: Zero forbidden primitives ---');
{
  const forbidden = [
    /\bchild_process\b/,
    /\bexecSync\b/,
    /\bexec\s*\(/,
    /\bspawn\s*\(/,
    /\bfork\s*\(/,
    /\beval\s*\(/,
    /\bFunction\s*\(/,
  ];

  const domainDir = path.resolve(process.cwd(), 'src', 'core', 'policyDecision');
  const files = fs.readdirSync(domainDir).filter(f => f.endsWith('.ts'));

  let violations = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.resolve(domainDir, file), 'utf8');
    for (const pat of forbidden) {
      if (pat.test(content)) {
        console.error(`  [FAIL] Forbidden pattern ${pat} in ${file}`);
        violations++;
      }
    }
  }

  assert(violations === 0, '[CATEGORY Z] Zero forbidden execution primitives in policyDecision domain');
}

// ============================================================================
// CATEGORY AA: Zero Autonomous Authority Leakage
// ============================================================================
console.log('--- CATEGORY AA: Zero autonomous authority leakage ---');
{
  const unauthorizedMethods = [
    'autonomousPromote',
    'autonomousApprove',
    'issueToken',
    'autonomousRollback',
    'resetCircuitBreaker',
    'executeTool',
    'executeShell',
    'executeUntrustedCode',
  ];

  const targets = [
    { name: 'PolicyDecisionEngine', instance: new PolicyDecisionEngine() },
    { name: 'PolicyRemediationPlanner', instance: new PolicyRemediationPlanner() },
    { name: 'PolicyDecisionAuthorizationGate', instance: new PolicyDecisionAuthorizationGate() },
    { name: 'PolicyControlledRemediationBoundary', instance: new PolicyControlledRemediationBoundary() },
    { name: 'PolicyDecisionProvenanceEngine', instance: new PolicyDecisionProvenanceEngine() },
    { name: 'PolicyDecisionAuditEngine', instance: new PolicyDecisionAuditEngine() },
    { name: 'PolicyDecisionRuntime', instance: new PolicyDecisionRuntime() },
  ];

  for (const t of targets) {
    for (const m of unauthorizedMethods) {
      assert(
        (t.instance as any)[m] === undefined,
        `[CATEGORY AA] ${t.name} has no ${m}() method`
      );
    }
  }
}

// ============================================================================
// CATEGORY AB: Corrupted State Recovery / Fail-Closed
// ============================================================================
console.log('--- CATEGORY AB: Corrupted state recovery/fail-closed ---');
{
  const runtime = new PolicyDecisionRuntime();
  const brokenSummary = createMockInvestigationSummary();
  (brokenSummary.integrityResult as any).status = 'INVALID';

  assertThrows(
    () => runtime.createProposalFromInvestigation(brokenSummary),
    'INVALID_EVIDENCE_INTEGRITY',
    '[CATEGORY AB] Corrupted investigation results fail closed'
  );
}

// ============================================================================
// CATEGORY AC: Final Reality Gate
// ============================================================================
console.log('--- CATEGORY AC: Final reality gate ---');
{
  const protectedWorkspace = 'C:\\BOW\\shopofbow';
  const exists = fs.existsSync(protectedWorkspace);
  assert(exists === false, '[CATEGORY AC] Protected workspace C:\\BOW\\shopofbow untouched and does not exist');
}

// ============================================================================
// SUMMARY & EXIT
// ============================================================================
console.log('');
console.log('======================================================================');
console.log(`REALITY GATE COMPLETE: All ${passed} assertions PASSED`);
if (failed > 0) {
  console.error(`FAILED: ${failed} assertions failed!`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log('REALITY GATE SUCCESS: All assertions PASS');
}
console.log('======================================================================');
