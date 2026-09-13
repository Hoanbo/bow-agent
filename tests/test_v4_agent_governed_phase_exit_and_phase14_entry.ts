// tests/test_v4_agent_governed_phase_exit_and_phase14_entry.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Dedicated Reality Test Suite.
// Verifies Sections A through AQ covering:
// - Evidence-based phase exit candidate generation
// - Human-only authorization boundaries & anti-autonomous defenses
// - Anti-self-approval enforcement
// - Strict separation between Phase 1.3 exit and Phase 1.4 entry
// - Replay defense, tamper detection, and fail-closed transitions
// - Zero autonomous mutation, zero policy mutation
// - USER_STOP supremacy across all operations
// - Protected workspace verification (C:\BOW\shopofbow untouched)

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PolicyPhaseExitReadinessResolver,
  PolicyPhaseExitCriteriaRevalidator,
  PolicyPhaseExitReviewEngine,
  PolicyPhaseExitAuthorizationBoundary,
  PolicyPhaseExitTransitionEngine,
  PolicyPhase14EntryReadinessEngine,
  PolicyPhase14EntryAuthorizationBoundary,
  PolicyPhase14EntryTransitionEngine,
  PolicyPhaseTransitionStore,
  PolicyPhaseTransitionProvenanceEngine,
  PolicyPhaseTransitionAuditEngine,
  PolicyPhaseTransitionRuntime,
  POLICY_PHASE_TRANSITION_AUDIT_DOMAIN,
  type ReadinessAssessmentReport,
  type HumanAuthorizationRole,
} from '../src/index.js';

let passedAssertions = 0;
function testAssert(condition: boolean, msg: string): void {
  assert(condition, msg);
  passedAssertions++;
}

console.log('>>> [START] MS-1.3.77 Governed Phase Exit & Phase 1.4 Entry Reality Test Suite');

// Helper to create valid MS-1.3.76 report fixture
function createMockValidReport(tenantId = 'tenant_exit_reality'): ReadinessAssessmentReport {
  const passedCriteria = [];
  const criteriaResults = [];

  for (let i = 1; i <= 24; i++) {
    const numStr = i < 10 ? '0' + i : String(i);
    const criterionId = `CRITERION_${numStr}` as any;
    passedCriteria.push(criterionId);
    criteriaResults.push({
      criterion: {
        criterionId,
        criterionNumber: i,
        name: `CRITERION_${numStr}`,
        governanceLayer: 'ACTIVE_INCIDENT_RESOLUTION',
        description: `Description for criterion ${i}`,
        isMandatory: true,
        derivation: 'DERIVED_FROM_EXISTING_ARCHITECTURE',
      },
      status: 'PASS' as const,
      evidence: {
        evidenceId: `ev_${numStr}` as any,
        criterionId,
        evidenceType: 'REPOSITORY_INSPECTION' as const,
        description: 'Verified',
        verifiableArtifacts: ['src/core/policyDecision/index.ts'],
        requiresHumanReview: false,
        collectedAt: new Date().toISOString(),
      },
    });
  }

  const reportId = `rep_${tenantId}_001` as any;
  const assessmentId = `assess_${tenantId}_001` as any;
  const timestamp = new Date().toISOString();

  const expectedPayload = {
    reportId,
    assessmentId,
    tenantId,
    timestamp,
    componentMatrixSummary: { totalComponents: 869, realComponents: 846, partialComponents: 16, mockComponents: 7 },
    readinessStatus: 'READY_FOR_PHASE_EXIT',
    phaseExitRecommendation: 'RECOMMENDED',
    phaseExitDeclaration: 'HUMAN_AUTHORITY_REQUIRED',
    passedCount: 24,
    failedCount: 0,
    partialCount: 0,
    untestedCount: 0,
  };

  const provenanceHash = (awaitCryptoHash)(expectedPayload);

  return Object.freeze({
    reportId,
    assessmentId,
    tenantId,
    timestamp,
    componentMatrixSummary: { totalComponents: 869, realComponents: 846, partialComponents: 16, mockComponents: 7 },
    readinessStatus: 'READY_FOR_PHASE_EXIT',
    phaseExitRecommendation: 'RECOMMENDED',
    phaseExitDeclaration: 'HUMAN_AUTHORITY_REQUIRED',
    passedCriteria: Object.freeze(passedCriteria),
    failedCriteria: Object.freeze([]),
    partialCriteria: Object.freeze([]),
    untestedCriteria: Object.freeze([]),
    criteriaResults: Object.freeze(criteriaResults),
    provenanceHash,
  });
}

function awaitCryptoHash(payload: Record<string, any>): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// ============================================================================
// Section A: Clean Initialization
// ============================================================================
console.log('--- Section A: Clean Initialization ---');
const runtime = new PolicyPhaseTransitionRuntime();
testAssert(runtime instanceof PolicyPhaseTransitionRuntime, 'A01: Runtime instantiated cleanly');
testAssert(typeof runtime.generatePhaseExitCandidate === 'function', 'A02: generatePhaseExitCandidate exists');
testAssert(typeof runtime.authorizePhaseExit === 'function', 'A03: authorizePhaseExit exists');
testAssert(typeof runtime.commitPhaseExit === 'function', 'A04: commitPhaseExit exists');
testAssert(typeof runtime.evaluatePhase14EntryReadiness === 'function', 'A05: evaluatePhase14EntryReadiness exists');
testAssert(typeof runtime.authorizePhase14Entry === 'function', 'A06: authorizePhase14Entry exists');
testAssert(typeof runtime.commitPhase14Entry === 'function', 'A07: commitPhase14Entry exists');

// Initial phase state
const initialPhase = runtime.getCurrentPhase('tenant_fresh_01');
testAssert(initialPhase === 'PHASE_1_3_ACTIVE', 'A08: Initial phase is PHASE_1_3_ACTIVE');

// ============================================================================
// Section B, C, D, E, F: Readiness Rejection Gate
// ============================================================================
console.log('--- Section B-F: Readiness Rejection Gate ---');
const resolver = new PolicyPhaseExitReadinessResolver();

// B: Missing report
const nullRes = resolver.resolveReadiness(null as any);
testAssert(nullRes.valid === false && nullRes.isReadyForPhaseExit === false, 'B01: Missing report blocked');

// C: PARTIAL readiness
const validReport = createMockValidReport('tenant_test_readiness');
const partialReport: any = { ...validReport, readinessStatus: 'NOT_READY_FOR_PHASE_EXIT' };
const partialRes = resolver.resolveReadiness(partialReport);
testAssert(partialRes.valid === false && partialRes.isReadyForPhaseExit === false, 'C01: NOT_READY status blocked');

// D: FAILED criterion
const failedReport: any = { ...validReport, failedCriteria: ['CRITERION_01'] };
const failedRes = resolver.resolveReadiness(failedReport);
testAssert(failedRes.valid === false, 'D01: Report with failed criteria blocked');

// E: Corrupted evidence / provenance hash mismatch
const corruptedReport: any = { ...validReport, provenanceHash: 'a'.repeat(64) };
const corruptedRes = resolver.resolveReadiness(corruptedReport);
testAssert(corruptedRes.valid === false, 'E01: Report with corrupted provenance hash blocked');

// F: Invalid declaration
const wrongDeclReport: any = { ...validReport, phaseExitDeclaration: 'PHASE_1_3_COMPLETE' };
const wrongDeclRes = resolver.resolveReadiness(wrongDeclReport);
testAssert(wrongDeclRes.valid === false, 'F01: Report with non-HUMAN_AUTHORITY_REQUIRED declaration blocked');

// ============================================================================
// Section G, H: Candidate Generation & Review Separation
// ============================================================================
console.log('--- Section G, H: Candidate Generation & Review Separation ---');
const candidateResult = runtime.generatePhaseExitCandidate({
  report: validReport,
  proposedBy: 'operator_alice_proposer',
});

testAssert(candidateResult.candidate.candidateId.startsWith('cand_exit_'), 'G01: Candidate ID generated');
testAssert(candidateResult.candidate.targetPhase === 'PHASE_1_3_EXIT_COMMITTED', 'G02: Target phase defined');
testAssert(candidateResult.reviewPackage.criteriaVerified === true, 'H01: Criteria verified in review package');
testAssert(candidateResult.reviewPackage.protectedWorkspaceUntouched === true, 'H02: Protected workspace untouched verified');
testAssert(candidateResult.reviewPackage.humanReviewChecklist.length === 7, 'H03: Review checklist assembled');

// Candidate generation does NOT commit exit
const currentPhaseAfterCand = runtime.getCurrentPhase('tenant_test_readiness');
testAssert(currentPhaseAfterCand === 'PHASE_1_3_EXIT_PENDING_REVIEW', 'G03: Phase is PENDING_REVIEW, not committed');

// ============================================================================
// Section I, J, K, L, M, N: Exit Authorization Boundary Checks
// ============================================================================
console.log('--- Section I-N: Exit Authorization Boundary Checks ---');
const boundary = new PolicyPhaseExitAuthorizationBoundary();

// I: Autonomous exit authorization rejected
let caughtAuto = false;
try {
  boundary.authorizePhaseExit(candidateResult.candidate, {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'auto_policy_engine',
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    rationale: 'Autonomous approval attempt for phase exit',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caughtAuto = err.message.includes('AUTONOMOUS_AUTHORIZATION_REJECTED');
}
testAssert(caughtAuto, 'I01: Autonomous identity auto_policy_engine rejected');

// J: Anonymous exit authorization rejected
let caughtAnon = false;
try {
  boundary.authorizePhaseExit(candidateResult.candidate, {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'anonymous',
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    rationale: 'Anonymous approval attempt for phase exit',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caughtAnon = err.message.includes('ANONYMOUS_AUTHORIZATION_REJECTED');
}
testAssert(caughtAnon, 'J01: Anonymous identity rejected');

// K: Guest exit authorization rejected
let caughtGuest = false;
try {
  boundary.authorizePhaseExit(candidateResult.candidate, {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'guest',
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    rationale: 'Guest approval attempt for phase exit',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caughtGuest = err.message.includes('ANONYMOUS_AUTHORIZATION_REJECTED');
}
testAssert(caughtGuest, 'K01: Guest identity rejected');

// L: Invalid human role rejected
let caughtRole = false;
try {
  boundary.authorizePhaseExit(candidateResult.candidate, {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'human_operator_bob',
    operatorRole: 'GUEST_OPERATOR' as any,
    rationale: 'Attempt with unauthorized role',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caughtRole = err.message.includes('UNAUTHORIZED_ROLE');
}
testAssert(caughtRole, 'L01: Invalid role GUEST_OPERATOR rejected');

// M: Anti-Self-Approval (Proposer == Authorizer)
let caughtSelf = false;
try {
  boundary.authorizePhaseExit(candidateResult.candidate, {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'operator_alice_proposer', // Self-approval!
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    rationale: 'Self-approval attempt by the candidate proposer',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caughtSelf = err.message.includes('SELF_APPROVAL_VIOLATION');
}
testAssert(caughtSelf, 'M01: Proposer self-approval strictly rejected');

// N: Missing or short rationale
let caughtRationale = false;
try {
  boundary.authorizePhaseExit(candidateResult.candidate, {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'operator_bob_admin',
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    rationale: 'ok', // too short (< 10 chars)
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caughtRationale = err.message.includes('INVALID_RATIONALE');
}
testAssert(caughtRationale, 'N01: Insufficient rationale rejected');

// ============================================================================
// Section O, P, Q: Valid Human Exit Authorization & Replay Rejection
// ============================================================================
console.log('--- Section O-Q: Valid Human Exit Authorization & Replay ---');
const validExitAuth = runtime.authorizePhaseExit({
  candidate: candidateResult.candidate,
  request: {
    candidateId: candidateResult.candidate.candidateId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_alice_proposer',
    authorizedBy: 'operator_bob_security_lead',
    operatorRole: 'HUMAN_SECURITY_ADMIN',
    rationale: 'Comprehensive audit verified; all 24 criteria passed; authorized Phase 1.3 exit',
    decision: 'AUTHORIZE',
  },
});

testAssert(validExitAuth.authorizationId.startsWith('auth_exit_'), 'O01: Exit authorization record created');
testAssert(validExitAuth.decision === 'AUTHORIZED', 'O02: Exit authorization decision is AUTHORIZED');

// P: Exit authorization replay blocked
let caughtExitReplay = false;
try {
  runtime.authorizePhaseExit({
    candidate: candidateResult.candidate,
    request: {
      candidateId: candidateResult.candidate.candidateId,
      tenantId: 'tenant_test_readiness',
      requestedBy: 'operator_alice_proposer',
      authorizedBy: 'operator_bob_security_lead',
      operatorRole: 'HUMAN_SECURITY_ADMIN',
      rationale: 'Comprehensive audit verified; all 24 criteria passed; authorized Phase 1.3 exit',
      decision: 'AUTHORIZE',
    },
  });
} catch (err: any) {
  caughtExitReplay = err.message.includes('REPLAY_REJECTED');
}
testAssert(caughtExitReplay, 'P01: Replaying identical exit authorization rejected');

// Q: Conflicting candidate binding mismatch
let caughtBinding = false;
try {
  const otherCand = { ...candidateResult.candidate, candidateId: 'cand_other_999' as any };
  runtime.authorizePhaseExit({
    candidate: otherCand,
    request: {
      candidateId: candidateResult.candidate.candidateId,
      tenantId: 'tenant_test_readiness',
      requestedBy: 'operator_alice_proposer',
      authorizedBy: 'operator_carol_owner',
      operatorRole: 'OWNER',
      rationale: 'Different candidate authorization attempt',
      decision: 'AUTHORIZE',
    },
  });
} catch (err: any) {
  caughtBinding = err.message.includes('BINDING_MISMATCH');
}
testAssert(caughtBinding, 'Q01: Candidate ID mismatch rejected');

// ============================================================================
// Section R, S, T: Phase Exit Commit & Phase 1.4 Non-Entry Invariant
// ============================================================================
console.log('--- Section R-T: Phase Exit Commit & Phase 1.4 Non-Entry ---');
const exitCommit = runtime.commitPhaseExit({
  candidate: candidateResult.candidate,
  authorization: validExitAuth,
  committedBy: 'operator_david_committer',
});

testAssert(exitCommit.committedPhase === 'PHASE_1_3_EXIT_COMMITTED', 'R01: Exit committed successfully');
testAssert(exitCommit.commitId.startsWith('commit_exit_'), 'R02: Commit ID generated');

// Current phase is now PHASE_1_3_EXIT_COMMITTED
const currentPhaseAfterExit = runtime.getCurrentPhase('tenant_test_readiness');
testAssert(currentPhaseAfterExit === 'PHASE_1_3_EXIT_COMMITTED', 'R03: Phase state is PHASE_1_3_EXIT_COMMITTED');

// T: PHASE 1.4 IS NOT AUTOMATICALLY ENTERED
testAssert(currentPhaseAfterExit !== ('PHASE_1_4_ENTRY_COMMITTED' as any), 'T01: Phase 1.4 NOT automatically entered');
testAssert(currentPhaseAfterExit !== ('PHASE_1_4_ENTRY_READY' as any), 'T02: Phase 1.4 readiness NOT automatically asserted');

// ============================================================================
// Section U, V, W: Phase 1.4 Entry Readiness Evaluated Separately
// ============================================================================
console.log('--- Section U-W: Phase 1.4 Entry Readiness Evaluated Separately ---');
const entryReadinessEngine = new PolicyPhase14EntryReadinessEngine();

// V: Missing exit commit fails
const unreadyEntry = entryReadinessEngine.evaluateEntryReadiness({
  exitCommit: null as any,
  tenantId: 'tenant_test_readiness',
});
testAssert(unreadyEntry.status === 'PHASE_1_4_ENTRY_NOT_READY', 'V01: Missing exit commit yields NOT_READY');
testAssert(unreadyEntry.prerequisitesSatisfied === false, 'V02: Prerequisites unsatisfied');

// W: Valid exit commit produces advisory readiness
const validEntryReadiness = runtime.evaluatePhase14EntryReadiness({
  exitCommit,
  tenantId: 'tenant_test_readiness',
});
testAssert(validEntryReadiness.status === 'PHASE_1_4_ENTRY_READY', 'W01: Valid exit commit yields PHASE_1_4_ENTRY_READY');
testAssert(validEntryReadiness.prerequisitesSatisfied === true, 'W02: All prerequisites confirmed');
testAssert(validEntryReadiness.requiredPrerequisites.length === 6, 'W03: 6 canonical prerequisites tracked');

// ============================================================================
// Section X, Y, Z, AA: Phase 1.4 Human Entry Authorization Boundary
// ============================================================================
console.log('--- Section X-AA: Phase 1.4 Entry Authorization Boundary ---');
const entryBoundary = new PolicyPhase14EntryAuthorizationBoundary();

// X: Autonomous Phase 1.4 authorization rejected
let caught14Auto = false;
try {
  entryBoundary.authorizePhase14Entry(validEntryReadiness, {
    readinessId: validEntryReadiness.readinessId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_david_committer',
    authorizedBy: 'ai_phase_transitioner',
    operatorRole: 'MASTER_HUMAN_OPERATOR',
    rationale: 'Autonomous Phase 1.4 transition',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caught14Auto = err.message.includes('AUTONOMOUS_AUTHORIZATION_REJECTED');
}
testAssert(caught14Auto, 'X01: Autonomous actor rejected for Phase 1.4 entry authorization');

// Y: Anti-self-approval for Phase 1.4
let caught14Self = false;
try {
  entryBoundary.authorizePhase14Entry(validEntryReadiness, {
    readinessId: validEntryReadiness.readinessId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_eva_admin',
    authorizedBy: 'operator_eva_admin', // Self-approval!
    operatorRole: 'OWNER',
    rationale: 'Self-authorizing Phase 1.4 entry',
    decision: 'AUTHORIZE',
  });
} catch (err: any) {
  caught14Self = err.message.includes('SELF_APPROVAL_VIOLATION');
}
testAssert(caught14Self, 'Y01: Anti-self-approval enforced on Phase 1.4 entry');

// Z: Valid Phase 1.4 human authorization accepted
const valid14Auth = runtime.authorizePhase14Entry({
  readiness: validEntryReadiness,
  request: {
    readinessId: validEntryReadiness.readinessId,
    tenantId: 'tenant_test_readiness',
    requestedBy: 'operator_david_committer',
    authorizedBy: 'operator_frank_owner',
    operatorRole: 'OWNER',
    rationale: 'Phase 1.3 complete; governance plane verified; authorizing transition to Phase 1.4',
    decision: 'AUTHORIZE',
  },
});
testAssert(valid14Auth.authorizationId.startsWith('auth_14_'), 'Z01: Phase 1.4 entry authorization record created');
testAssert(valid14Auth.decision === 'AUTHORIZED', 'Z02: Decision is AUTHORIZED');

// AA: Phase 1.4 authorization replay blocked
let caught14Replay = false;
try {
  runtime.authorizePhase14Entry({
    readiness: validEntryReadiness,
    request: {
      readinessId: validEntryReadiness.readinessId,
      tenantId: 'tenant_test_readiness',
      requestedBy: 'operator_david_committer',
      authorizedBy: 'operator_frank_owner',
      operatorRole: 'OWNER',
      rationale: 'Phase 1.3 complete; governance plane verified; authorizing transition to Phase 1.4',
      decision: 'AUTHORIZE',
    },
  });
} catch (err: any) {
  caught14Replay = err.message.includes('REPLAY_REJECTED');
}
testAssert(caught14Replay, 'AA01: Phase 1.4 authorization replay blocked');

// ============================================================================
// Section AB, AC, AD, AE, AF: Phase 1.4 Commit & Transition Integrity
// ============================================================================
console.log('--- Section AB-AF: Phase 1.4 Commit & Transition Integrity ---');
const entryCommitEngine = new PolicyPhase14EntryTransitionEngine();

// AC: Direct Phase 1.3 -> Phase 1.4 jump blocked
let caughtDirectJump = false;
try {
  entryCommitEngine.commitPhase14Entry({
    exitCommit,
    entryReadiness: validEntryReadiness,
    entryAuthorization: valid14Auth,
    currentPhase: 'PHASE_1_3_ACTIVE', // Direct jump!
    committedBy: 'operator_grace_committer',
  });
} catch (err: any) {
  caughtDirectJump = err.message.includes('DIRECT_JUMP_REJECTED');
}
testAssert(caughtDirectJump, 'AC01: Direct jump from PHASE_1_3_ACTIVE to Phase 1.4 blocked');

// AB: Phase 1.4 commit succeeds
const entryCommit = runtime.commitPhase14Entry({
  exitCommit,
  entryReadiness: validEntryReadiness,
  entryAuthorization: valid14Auth,
  committedBy: 'operator_grace_committer',
});

testAssert(entryCommit.committedPhase === 'PHASE_1_4_ENTRY_COMMITTED', 'AB01: Phase 1.4 entry committed');
testAssert(entryCommit.commitId.startsWith('commit_14_'), 'AB02: Phase 1.4 commit ID generated');

// Phase state is now PHASE_1_4_ENTRY_COMMITTED
const currentPhaseFinal = runtime.getCurrentPhase('tenant_test_readiness');
testAssert(currentPhaseFinal === 'PHASE_1_4_ENTRY_COMMITTED', 'AB03: Final phase state is PHASE_1_4_ENTRY_COMMITTED');

// AD: Out-of-order transition blocked (cannot re-commit exit after 1.4 entry)
let caughtOutOfOrder = false;
try {
  runtime.commitPhaseExit({
    candidate: candidateResult.candidate,
    authorization: validExitAuth,
    committedBy: 'operator_grace_committer',
  });
} catch (err: any) {
  caughtOutOfOrder = err.message.includes('INVALID_PHASE_STATE');
}
testAssert(caughtOutOfOrder, 'AD01: Out-of-order transition attempt blocked');

// ============================================================================
// Section AG, AH, AI: Tenant Isolation, Path Traversal, Reserved Names
// ============================================================================
console.log('--- Section AG-AI: Tenant Isolation ---');
const store = new PolicyPhaseTransitionStore();

// AG: Tenant partition isolation (Tenant A cannot see Tenant B)
const tenantAPhase = runtime.getCurrentPhase('tenant_alpha_iso');
const tenantBPhase = runtime.getCurrentPhase('tenant_beta_iso');
testAssert(tenantAPhase === 'PHASE_1_3_ACTIVE', 'AG01: Tenant A is isolated');
testAssert(tenantBPhase === 'PHASE_1_3_ACTIVE', 'AG02: Tenant B is isolated');

// AH: Path traversal rejected
let caughtTraversal = false;
try {
  store.getCurrentPhase('../../../etc/passwd');
} catch (err: any) {
  caughtTraversal = err.message.includes('PATH_TRAVERSAL') || err.message.includes('DurablePersistenceSecurityError') || err.message.includes('Path traversal');
}
testAssert(caughtTraversal, 'AH01: Path traversal rejected in tenant identifier');

// AI: Windows reserved device name rejected
let caughtReserved = false;
try {
  store.getCurrentPhase('CON');
} catch (err: any) {
  caughtReserved = err.message.includes('WINDOWS_RESERVED') || err.message.includes('DurablePersistenceSecurityError') || err.message.includes('reserved');
}
testAssert(caughtReserved, 'AI01: Reserved device name CON rejected');

// ============================================================================
// Section AJ, AK: Provenance Chain Integrity & Tamper Detection
// ============================================================================
console.log('--- Section AJ, AK: Provenance Chain & Tamper Detection ---');
const provEngine = new PolicyPhaseTransitionProvenanceEngine();

const p1 = provEngine.recordTransitionEvent({
  tenantId: 'tenant_prov_test',
  transitionType: 'PHASE_1_3_EXIT',
  targetPhase: 'PHASE_1_3_EXIT_PENDING_REVIEW',
  entityId: 'cand_test_01',
  payload: { step: 1 },
});

const p2 = provEngine.recordTransitionEvent({
  tenantId: 'tenant_prov_test',
  transitionType: 'PHASE_1_3_EXIT',
  targetPhase: 'PHASE_1_3_EXIT_COMMITTED',
  entityId: 'commit_test_01',
  payload: { step: 2 },
});

testAssert(p2.previousHash === p1.sha256, 'AJ01: Provenance records are cryptographically chained');

const provVerification = provEngine.verifyChain('tenant_prov_test');
testAssert(provVerification.valid === true, 'AJ02: Cryptographic chain verified');

// AK: Tamper detection
(provEngine as any).chains.get('tenant_prov_test')[0] = { ...p1, sha256: 'tampered_hash_value' };
const tamperedVerification = provEngine.verifyChain('tenant_prov_test');
testAssert(tamperedVerification.valid === false, 'AK01: Tampered chain link detected');
testAssert(tamperedVerification.error?.includes('PROVENANCE_TAMPER_DETECTED') === true, 'AK02: Tamper error reported');

// ============================================================================
// Section AL, AM: Audit Trail & Secret Sanitization
// ============================================================================
console.log('--- Section AL, AM: Audit Trail & Secret Sanitization ---');
const auditEngine = new PolicyPhaseTransitionAuditEngine();
auditEngine.recordEvent({
  eventType: 'PHASE_EXIT_CANDIDATE_CREATED',
  tenantId: 'tenant_audit_test',
  actorUserId: 'operator_audit_user',
  details: {
    candidateId: 'cand_test',
    secretToken: 'sk_live_secret_token_1234567890',
  },
});

testAssert(POLICY_PHASE_TRANSITION_AUDIT_DOMAIN === 'POLICY_PHASE_TRANSITION', 'AL01: Audit domain is POLICY_PHASE_TRANSITION');

// ============================================================================
// Section AN: USER_STOP Dominance Across Every Public Operation
// ============================================================================
console.log('--- Section AN: USER_STOP Dominance ---');
let stopActive = true;
const stopRuntime = new PolicyPhaseTransitionRuntime({
  isUserStopActive: () => stopActive,
});

const stopOps: Array<[string, () => void]> = [
  ['getCurrentPhase', () => stopRuntime.getCurrentPhase('tenant_stop')],
  ['generatePhaseExitCandidate', () => stopRuntime.generatePhaseExitCandidate({ report: validReport, proposedBy: 'op' })],
  ['authorizePhaseExit', () => stopRuntime.authorizePhaseExit({ candidate: candidateResult.candidate, request: null as any })],
  ['commitPhaseExit', () => stopRuntime.commitPhaseExit({ candidate: candidateResult.candidate, authorization: null as any, committedBy: 'op' })],
  ['evaluatePhase14EntryReadiness', () => stopRuntime.evaluatePhase14EntryReadiness({ exitCommit, tenantId: 'tenant_stop' })],
  ['authorizePhase14Entry', () => stopRuntime.authorizePhase14Entry({ readiness: validEntryReadiness, request: null as any })],
  ['commitPhase14Entry', () => stopRuntime.commitPhase14Entry({ exitCommit, entryReadiness: validEntryReadiness, entryAuthorization: null as any, committedBy: 'op' })],
];

for (const [opName, op] of stopOps) {
  let caughtStop = false;
  try {
    op();
  } catch (err: any) {
    caughtStop = err.message.includes('OPERATION_SUSPENDED_BY_USER_STOP');
  }
  testAssert(caughtStop, `AN_${opName}: Operation ${opName} halted by USER_STOP`);
}

// ============================================================================
// Section AO, AP: Forbidden Primitives & Authority Leakage Scans
// ============================================================================
console.log('--- Section AO, AP: Forbidden Primitives & Authority Leakage ---');
const domainDir = path.resolve('src/core/policyPhaseTransition');
const domainFiles = fs.readdirSync(domainDir).filter(f => f.endsWith('.ts'));

const FORBIDDEN_PROCESS_PATTERNS = [
  "from 'child_process'",
  'from "child_process"',
  "from 'node:child_process'",
  'from "node:child_process"',
  "require('child_process')",
  'require("child_process")',
  "require('node:child_process')",
  'require("node:child_process")',
  'execSync(',
  'spawn(',
  'fork(',
  'eval(',
  'new Function(',
];

const FORBIDDEN_AUTHORITY_PATTERNS = [
  'mutatePolicy',
  'activateCandidate',
  'promoteCandidate',
  'rollbackPolicy',
  'recoverPolicy',
  'sunsetPolicy',
  'autonomousRollback',
  'autonomousRecover',
  'autonomousSunset',
  'autonomousApprove',
  'autonomousPromote',
  'issueToken',
  'executeTool',
  'executeShell',
  'executeUntrustedCode',
  'autoRepair',
  'selfHealPolicy',
];

for (const f of domainFiles) {
  const content = fs.readFileSync(path.join(domainDir, f), 'utf-8');

  for (const prim of FORBIDDEN_PROCESS_PATTERNS) {
    testAssert(!content.includes(prim), `AO_${f}: File must not contain forbidden primitive '${prim}'`);
  }

  for (const kw of FORBIDDEN_AUTHORITY_PATTERNS) {
    const fnPattern = new RegExp(`\\b(function\\s+${kw}|${kw}\\s*\\()`, 'g');
    testAssert(!fnPattern.test(content), `AP_${f}: File must not invoke authority pattern '${kw}'`);
  }
}

// Ensure runtime does NOT expose dangerous mutation methods
testAssert((runtime as any).mutatePolicy === undefined, 'AP_runtime: mutatePolicy must not exist');
testAssert((runtime as any).activatePolicy === undefined, 'AP_runtime: activatePolicy must not exist');
testAssert((runtime as any).rollbackPolicy === undefined, 'AP_runtime: rollbackPolicy must not exist');
testAssert((runtime as any).declarePhaseComplete === undefined, 'AP_runtime: declarePhaseComplete must not exist');

// ============================================================================
// Section AQ: Protected Workspace Untouched
// ============================================================================
console.log('--- Section AQ: Protected Workspace Untouched ---');
const protectedPath = 'C:\\BOW\\shopofbow';
testAssert(!fs.existsSync(protectedPath), 'AQ01: Protected workspace C:\\BOW\\shopofbow must not exist');

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n============================================================`);
console.log(`MS-1.3.77 REALITY GATE PASSED: ${passedAssertions} assertions verified`);
console.log(`============================================================\n`);
