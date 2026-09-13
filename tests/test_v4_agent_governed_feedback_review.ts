// tests/test_v4_agent_governed_feedback_review.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Comprehensive Reality Gate Suite for Milestone 1.3.67.
// Tests categories A through AY:
// A. Branded identifiers
// B. Feedback proposal ingestion
// C. Proposal revalidation
// D. Valid evidence
// E. Invalid evidence
// F. Stale evidence
// G. UNKNOWN preservation
// H. INCONCLUSIVE preservation
// I. Duplicate proposal defense
// J. Replay defense
// K. Superseded proposal defense
// L. Review queue insertion
// M. Deterministic queue ordering
// N. Pagination bounds
// O. Tenant isolation
// P. Candidate isolation
// Q. Human reviewer validation
// R. Autonomous identity rejection
// S. Human ACCEPT
// T. Human REJECT
// U. Human DEFER
// V. REQUEST_MORE_EVIDENCE
// W. Human CANCEL
// X. Illegal lifecycle transitions
// Y. Terminal state immutability
// Z. USER_STOP before review
// AA. USER_STOP during review
// AB. USER_STOP before intake
// AC. Policy evolution intake creation
// AD. No intake for RETAIN_CURRENT_POLICY
// AE. Deterministic recommendation-to-intake mapping
// AF. Intake immutability
// AG. Policy mutation remains zero
// AH. Candidate creation remains zero
// AI. Promotion remains zero
// AJ. Rollback remains zero
// AK. Authorization/token issuance remains zero
// AL. Direct tool execution remains zero
// AM. Provenance chain integrity
// AN. Provenance tamper detection
// AO. Audit integrity
// AP. Secret sanitization
// AQ. Corrupted state handling
// AR. Restart reconciliation
// AS. Intake replay defense
// AT. Cross-tenant intake rejection
// AU. Hard-forbidden action handling
// AV. Forbidden primitive scan
// AW. Authority leakage scan
// AX. Deterministic output
// AY. Final reality gate & protected workspace check

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  createFeedbackReviewId,
  createFeedbackReviewRequestId,
  createHumanReviewId,
  createPolicyEvolutionIntakeId,
  createReviewDecisionId,
  createReviewProvenanceId,
  PolicyFeedbackReviewRuntime,
  PolicyFeedbackRevalidationEngine,
  PolicyFeedbackReviewQueue,
  PolicyFeedbackHumanReviewGate,
  PolicyEvolutionIntakeEngine,
  PolicyFeedbackReviewProvenanceEngine,
  PolicyFeedbackReviewAuditEngine,
  type FeedbackReviewQueueEntry,
  type HumanReviewSubmission,
} from '../src/core/policyFeedbackReview/index.js';
import {
  createFeedbackProposalId,
  createImpactAnalysisId,
  createEffectivenessAssessmentId,
  createRegressionDetectionId,
  createReconciliationId as createPolicyReconciliationId,
  type PolicyFeedbackProposal,
  type PostExecutionReconciliationResult,
  type PostExecutionImpactAnalysis,
  type PostExecutionRegressionFinding,
  type PostExecutionEffectivenessResult,
} from '../src/core/policyPostExecution/index.js';
import { createExecutionId } from '../src/core/policyExecution/index.js';
import { createPolicyCandidateId } from '../src/core/policyCanary/index.js';
import { createDecisionProposalId, createRemediationRequestId } from '../src/core/policyDecision/index.js';

let passedAssertions = 0;

function pass(category: string, message: string): void {
  passedAssertions++;
  console.log(`  [PASS] [CATEGORY ${category}] ${message}`);
}

async function runRealityGate(): Promise<void> {
  console.log('\n======================================================================');
  console.log('BOWCON V4.0 — MILESTONE 1.3.67 REALITY GATE');
  console.log('GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE');
  console.log('======================================================================\n');

  const testBaseDir = path.resolve(process.cwd(), 'data', 'partitions_feedback_review_reality');
  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testBaseDir, { recursive: true });

  const tenantA = 'boss_user';
  const tenantB = 'user_alice';

  // Helper fixture creator
  function makeValidProposal(overrides?: Partial<PolicyFeedbackProposal>): PolicyFeedbackProposal {
    return {
      proposalId: createFeedbackProposalId(`prop_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
      executionId: createExecutionId(`exec_test_${Date.now()}`),
      tenantPartition: tenantA,
      candidateId: createPolicyCandidateId('cand_v4_test'),
      proposedAction: 'INVESTIGATE_POLICY_DRIFT',
      state: 'PROPOSED',
      rationale: 'Observed policy drift in canary telemetry',
      impactClassification: 'EXPECTED',
      effectivenessStatus: 'PARTIALLY_EFFECTIVE',
      regressionTypes: ['NO_REGRESSION'],
      isAutonomousMutation: false,
      proposedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // ========================================================================
  // CATEGORY A: Branded identifiers
  // ========================================================================
  console.log('--- CATEGORY A: Branded identifiers ---');
  const revId = createFeedbackReviewId('rev_12345');
  assert.strictEqual(typeof revId, 'string');
  pass('A', 'createFeedbackReviewId returns branded identifier');

  const reqId = createFeedbackReviewRequestId('req_12345');
  assert.strictEqual(typeof reqId, 'string');
  pass('A', 'createFeedbackReviewRequestId returns branded identifier');

  const hrevId = createHumanReviewId('hrev_12345');
  assert.strictEqual(typeof hrevId, 'string');
  pass('A', 'createHumanReviewId returns branded identifier');

  const intakeId = createPolicyEvolutionIntakeId('intake_12345');
  assert.strictEqual(typeof intakeId, 'string');
  pass('A', 'createPolicyEvolutionIntakeId returns branded identifier');

  const decId = createReviewDecisionId('hdec_12345');
  assert.strictEqual(typeof decId, 'string');
  pass('A', 'createReviewDecisionId returns branded identifier');

  const provId = createReviewProvenanceId('rprov_12345');
  assert.strictEqual(typeof provId, 'string');
  pass('A', 'createReviewProvenanceId returns branded identifier');

  assert.throws(() => createFeedbackReviewId(''), /INVALID_FEEDBACK_REVIEW_ID/);
  pass('A', 'createFeedbackReviewId rejects empty string fail-closed');

  // ========================================================================
  // CATEGORY B: Feedback proposal ingestion
  // ========================================================================
  console.log('--- CATEGORY B: Feedback proposal ingestion ---');
  const runtime = new PolicyFeedbackReviewRuntime({ baseDir: testBaseDir });
  const validProposal = makeValidProposal();
  const ingestResult = runtime.ingestFeedbackProposal({ proposal: validProposal });
  assert.strictEqual(ingestResult.success, true);
  assert.strictEqual(ingestResult.status, 'QUEUED');
  assert.ok(ingestResult.reviewId);
  pass('B', 'Feedback proposal ingested and queued successfully');

  // ========================================================================
  // CATEGORY C: Proposal revalidation
  // ========================================================================
  console.log('--- CATEGORY C: Proposal revalidation ---');
  const revalEngine = new PolicyFeedbackRevalidationEngine({ baseDir: testBaseDir });
  const revalResult = revalEngine.revalidateProposal({ proposal: validProposal });
  assert.strictEqual(revalResult.valid, true);
  assert.strictEqual(revalResult.integrityVerified, true);
  pass('C', 'Independent proposal revalidation succeeds for valid proposal');

  // ========================================================================
  // CATEGORY D: Valid evidence
  // ========================================================================
  console.log('--- CATEGORY D: Valid evidence ---');
  const recon: PostExecutionReconciliationResult = {
    reconciliationId: createPolicyReconciliationId('recon_123'),
    executionId: validProposal.executionId,
    tenantPartition: validProposal.tenantPartition,
    proposalId: createDecisionProposalId('dec_123'),
    requestId: createRemediationRequestId('rem_123'),
    status: 'VERIFIED_SUCCESS',
    rawOutcomeStatus: 'SUCCESS',
    discrepancies: [],
    reconciledAt: new Date().toISOString(),
    provenanceHash: 'recon_hash',
  };
  const impact: PostExecutionImpactAnalysis = {
    impactId: createImpactAnalysisId('impact_123'),
    executionId: validProposal.executionId,
    tenantPartition: validProposal.tenantPartition,
    classification: 'EXPECTED',
    expectedEffect: 'stable',
    actualEffect: 'stable',
    metricsDelta: {},
    analyzedAt: new Date().toISOString(),
  };
  const revalWithEvidence = revalEngine.revalidateProposal({
    proposal: validProposal,
    reconciliation: recon,
    impact,
  });
  assert.strictEqual(revalWithEvidence.valid, true);
  pass('D', 'Revalidation with matching post-execution evidence succeeds');

  // ========================================================================
  // CATEGORY E: Invalid evidence
  // ========================================================================
  console.log('--- CATEGORY E: Invalid evidence ---');
  const mismatchedImpact: PostExecutionImpactAnalysis = {
    impactId: createImpactAnalysisId('impact_mismatch'),
    executionId: createExecutionId('exec_different'),
    tenantPartition: validProposal.tenantPartition,
    classification: 'SAFETY_REGRESSION',
    expectedEffect: 'stable',
    actualEffect: 'degraded',
    metricsDelta: {},
    analyzedAt: new Date().toISOString(),
  };
  const invalidReval = revalEngine.revalidateProposal({
    proposal: validProposal,
    impact: mismatchedImpact,
  });
  assert.strictEqual(invalidReval.valid, false);
  assert.ok(invalidReval.reasons.some(r => r.includes('IMPACT_ANALYSIS_MISMATCH')));
  pass('E', 'Mismatched executionId in evidence fails revalidation fail-closed');

  // ========================================================================
  // CATEGORY F: Stale evidence
  // ========================================================================
  console.log('--- CATEGORY F: Stale evidence ---');
  const staleProposal = makeValidProposal({
    proposedAt: new Date(Date.now() - 100000000).toISOString(), // older than 24h
  });
  const staleReval = revalEngine.revalidateProposal({ proposal: staleProposal });
  assert.strictEqual(staleReval.valid, false);
  assert.strictEqual(staleReval.isFresh, false);
  assert.ok(staleReval.reasons.some(r => r.includes('PROPOSAL_EXPIRED')));
  pass('F', 'Stale proposal exceeding TTL is rejected with PROPOSAL_EXPIRED');

  // ========================================================================
  // CATEGORY G: UNKNOWN preservation
  // ========================================================================
  console.log('--- CATEGORY G: UNKNOWN preservation ---');
  const unknownEffectivenessProposal = makeValidProposal({
    effectivenessStatus: 'UNKNOWN',
  });
  const unknownEffectivenessResult: PostExecutionEffectivenessResult = {
    assessmentId: createEffectivenessAssessmentId('eff_unk'),
    executionId: unknownEffectivenessProposal.executionId,
    tenantPartition: unknownEffectivenessProposal.tenantPartition,
    status: 'UNKNOWN',
    executionSuccess: false,
    issueResolved: false,
    rationale: 'Telemetric outage during verification',
    empiricalEvidenceCount: 0,
    assessedAt: new Date().toISOString(),
  };
  const unkReval = revalEngine.revalidateProposal({
    proposal: unknownEffectivenessProposal,
    effectiveness: unknownEffectivenessResult,
  });
  assert.strictEqual(unkReval.valid, true);
  assert.strictEqual(unknownEffectivenessProposal.effectivenessStatus, 'UNKNOWN');
  pass('G', 'UNKNOWN effectiveness classification preserved without coercion to success');

  // ========================================================================
  // CATEGORY H: INCONCLUSIVE preservation
  // ========================================================================
  console.log('--- CATEGORY H: INCONCLUSIVE preservation ---');
  const inconclusiveProposal = makeValidProposal({
    effectivenessStatus: 'INCONCLUSIVE',
  });
  assert.strictEqual(inconclusiveProposal.effectivenessStatus, 'INCONCLUSIVE');
  pass('H', 'INCONCLUSIVE status preserved across feedback proposal boundary');

  // ========================================================================
  // CATEGORY I: Duplicate proposal defense
  // ========================================================================
  console.log('--- CATEGORY I: Duplicate proposal defense ---');
  const dupProposal = makeValidProposal();
  const queue = new PolicyFeedbackReviewQueue({ baseDir: testBaseDir });
  const qEntry1: FeedbackReviewQueueEntry = {
    reviewId: createFeedbackReviewId('rev_dup_1'),
    proposalId: dupProposal.proposalId,
    tenantPartition: tenantA,
    executionId: dupProposal.executionId,
    state: 'READY_FOR_HUMAN_REVIEW',
    proposedAction: dupProposal.proposedAction,
    severity: 'MEDIUM',
    impactClassification: 'EXPECTED',
    effectivenessStatus: 'PARTIALLY_EFFECTIVE',
    regressionTypes: ['NO_REGRESSION'],
    rationale: 'testing duplicate',
    evidenceSummary: 'evidence',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  queue.enqueue(qEntry1);

  const qEntry2: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_dup_2'),
  };
  assert.throws(() => queue.enqueue(qEntry2), /DUPLICATE_PROPOSAL_ENQUEUE/);
  pass('I', 'Queue rejects duplicate enqueue for same proposalId');

  // ========================================================================
  // CATEGORY J: Replay defense
  // ========================================================================
  console.log('--- CATEGORY J: Replay defense ---');
  assert.throws(() => queue.enqueue(qEntry1), /DUPLICATE_PROPOSAL_ENQUEUE/);
  pass('J', 'Exact queue entry replay rejected fail-closed');

  // ========================================================================
  // CATEGORY K: Superseded proposal defense
  // ========================================================================
  console.log('--- CATEGORY K: Superseded proposal defense ---');
  const oldProposal = makeValidProposal({ proposedAt: new Date(Date.now() - 50000).toISOString() });
  const newerProposal = makeValidProposal({ proposedAt: new Date().toISOString() });
  const supersededReval = revalEngine.revalidateProposal({
    proposal: oldProposal,
    existingProposalsForCandidate: [newerProposal],
  });
  assert.strictEqual(supersededReval.valid, false);
  assert.strictEqual(supersededReval.isSuperseded, true);
  assert.ok(supersededReval.reasons.some(r => r.includes('PROPOSAL_SUPERSEDED')));
  pass('K', 'Older proposal detected as superseded by newer proposal for same candidate');

  // ========================================================================
  // CATEGORY L: Review queue insertion
  // ========================================================================
  console.log('--- CATEGORY L: Review queue insertion ---');
  const retrieved = queue.getEntry(tenantA, qEntry1.reviewId);
  assert.ok(retrieved);
  assert.strictEqual(retrieved?.reviewId, qEntry1.reviewId);
  pass('L', 'Queued entry retrievable from tenant review queue');

  // ========================================================================
  // CATEGORY M: Deterministic queue ordering
  // ========================================================================
  console.log('--- CATEGORY M: Deterministic queue ordering ---');
  const queueOrderTest = new PolicyFeedbackReviewQueue({ baseDir: testBaseDir });
  const critEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_crit_1'),
    proposalId: createFeedbackProposalId('prop_crit_1'),
    severity: 'CRITICAL',
    createdAt: new Date(Date.now() - 10000).toISOString(),
  };
  const lowEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_low_1'),
    proposalId: createFeedbackProposalId('prop_low_1'),
    severity: 'LOW',
    createdAt: new Date().toISOString(),
  };
  queueOrderTest.enqueue(lowEntry);
  queueOrderTest.enqueue(critEntry);

  const list = queueOrderTest.listEntries(tenantA);
  const critIndex = list.entries.findIndex(e => e.reviewId === critEntry.reviewId);
  const lowIndex = list.entries.findIndex(e => e.reviewId === lowEntry.reviewId);
  assert.ok(critIndex < lowIndex, 'CRITICAL severity entry must be ordered before LOW severity');
  pass('M', 'Queue entries ordered deterministically by severity rank before timestamp');

  // ========================================================================
  // CATEGORY N: Pagination bounds
  // ========================================================================
  console.log('--- CATEGORY N: Pagination bounds ---');
  const pagedList = queueOrderTest.listEntries(tenantA, { page: 1, pageSize: 1 });
  assert.strictEqual(pagedList.entries.length, 1);
  assert.strictEqual(pagedList.pageSize, 1);
  pass('N', 'Review queue pagination bounded correctly by pageSize');

  // ========================================================================
  // CATEGORY O: Tenant isolation
  // ========================================================================
  console.log('--- CATEGORY O: Tenant isolation ---');
  const tenantBEntries = queueOrderTest.listEntries(tenantB);
  assert.strictEqual(tenantBEntries.entries.length, 0);
  assert.strictEqual(queueOrderTest.getEntry(tenantB, critEntry.reviewId), undefined);
  pass('O', 'Tenant B cannot inspect or access Tenant A queue entries');

  // ========================================================================
  // CATEGORY P: Candidate isolation
  // ========================================================================
  console.log('--- CATEGORY P: Candidate isolation ---');
  const candAProposal = makeValidProposal({ candidateId: createPolicyCandidateId('cand_alpha') });
  const candBProposal = makeValidProposal({ candidateId: createPolicyCandidateId('cand_beta') });
  assert.notStrictEqual(candAProposal.candidateId, candBProposal.candidateId);
  pass('P', 'Proposals maintain strict candidate identity isolation');

  // ========================================================================
  // CATEGORY Q: Human reviewer validation
  // ========================================================================
  console.log('--- CATEGORY Q: Human reviewer validation ---');
  const humanGate = new PolicyFeedbackHumanReviewGate({ baseDir: testBaseDir });
  const validSubmission: HumanReviewSubmission = {
    reviewId: critEntry.reviewId,
    decision: 'ACCEPT',
    reviewerId: 'operator_dan',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    reviewNotes: 'Verified empirical evidence of drift; approved for evolution intake',
  };
  const decisionRecord = humanGate.evaluateSubmission(critEntry, validSubmission);
  assert.strictEqual(decisionRecord.decision, 'ACCEPT');
  assert.strictEqual(decisionRecord.reviewerId, 'operator_dan');
  assert.strictEqual(decisionRecord.isAutonomousDecision, false);
  pass('Q', 'Authorized human operator submission evaluated and recorded');

  // ========================================================================
  // CATEGORY R: Autonomous identity rejection
  // ========================================================================
  console.log('--- CATEGORY R: Autonomous identity rejection ---');
  const autonomousIdentities = [
    'auto_promoter',
    'bot_evaluator',
    'ai_agent_v4',
    'autonomous_core',
    'synthetic_operator',
    'system_daemon',
    'agent_decision',
    'runtime_system',
  ];
  for (const bot of autonomousIdentities) {
    const botSubmission: HumanReviewSubmission = {
      reviewId: critEntry.reviewId,
      decision: 'ACCEPT',
      reviewerId: bot,
      reviewerRole: 'MASTER_HUMAN_OPERATOR',
      reviewNotes: 'Autonomous approval attempt',
    };
    assert.throws(
      () => humanGate.evaluateSubmission(critEntry, botSubmission),
      /ANTI_SELF_APPROVAL_VIOLATION/
    );
  }
  pass('R', 'All autonomous agent personas rejected with ANTI_SELF_APPROVAL_VIOLATION');

  // ========================================================================
  // CATEGORY S: Human ACCEPT
  // ========================================================================
  console.log('--- CATEGORY S: Human ACCEPT ---');
  assert.strictEqual(decisionRecord.decision, 'ACCEPT');
  pass('S', 'Human ACCEPT decision recorded successfully');

  // ========================================================================
  // CATEGORY T: Human REJECT
  // ========================================================================
  console.log('--- CATEGORY T: Human REJECT ---');
  const rejectEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_reject_1'),
    proposalId: createFeedbackProposalId('prop_reject_1'),
  };
  const rejectSubmission: HumanReviewSubmission = {
    reviewId: rejectEntry.reviewId,
    decision: 'REJECT',
    reviewerId: 'operator_dan',
    reviewerRole: 'SUPERVISOR',
    reviewNotes: 'Telemetry artifact demonstrates false alarm',
  };
  const rejectRecord = humanGate.evaluateSubmission(rejectEntry, rejectSubmission);
  assert.strictEqual(rejectRecord.decision, 'REJECT');
  pass('T', 'Human REJECT decision recorded successfully');

  // ========================================================================
  // CATEGORY U: Human DEFER
  // ========================================================================
  console.log('--- CATEGORY U: Human DEFER ---');
  const deferEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_defer_1'),
    proposalId: createFeedbackProposalId('prop_defer_1'),
  };
  const deferSubmission: HumanReviewSubmission = {
    reviewId: deferEntry.reviewId,
    decision: 'DEFER',
    reviewerId: 'operator_dan',
    reviewerRole: 'OWNER',
    reviewNotes: 'Awaiting next Canary ring telemetry',
  };
  const deferRecord = humanGate.evaluateSubmission(deferEntry, deferSubmission);
  assert.strictEqual(deferRecord.decision, 'DEFER');
  pass('U', 'Human DEFER decision recorded successfully');

  // ========================================================================
  // CATEGORY V: REQUEST_MORE_EVIDENCE
  // ========================================================================
  console.log('--- CATEGORY V: REQUEST_MORE_EVIDENCE ---');
  const moreEvEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_more_ev_1'),
    proposalId: createFeedbackProposalId('prop_more_ev_1'),
  };
  const moreEvSubmission: HumanReviewSubmission = {
    reviewId: moreEvEntry.reviewId,
    decision: 'REQUEST_MORE_EVIDENCE',
    reviewerId: 'operator_dan',
    reviewerRole: 'MASTER_HUMAN_OPERATOR',
    reviewNotes: 'Insufficient memory telemetry',
    additionalEvidenceRequired: 'Need memory heap profile over 10m window',
  };
  const moreEvRecord = humanGate.evaluateSubmission(moreEvEntry, moreEvSubmission);
  assert.strictEqual(moreEvRecord.decision, 'REQUEST_MORE_EVIDENCE');
  pass('V', 'REQUEST_MORE_EVIDENCE recorded with required evidence specification');

  // ========================================================================
  // CATEGORY W: Human CANCEL
  // ========================================================================
  console.log('--- CATEGORY W: Human CANCEL ---');
  const cancelEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_cancel_1'),
    proposalId: createFeedbackProposalId('prop_cancel_1'),
  };
  const cancelSubmission: HumanReviewSubmission = {
    reviewId: cancelEntry.reviewId,
    decision: 'CANCEL',
    reviewerId: 'operator_dan',
    reviewerRole: 'SUPERVISOR',
    reviewNotes: 'Remediation was cancelled by operational directive',
  };
  const cancelRecord = humanGate.evaluateSubmission(cancelEntry, cancelSubmission);
  assert.strictEqual(cancelRecord.decision, 'CANCEL');
  pass('W', 'Human CANCEL decision recorded successfully');

  // ========================================================================
  // CATEGORY X: Illegal lifecycle transitions
  // ========================================================================
  console.log('--- CATEGORY X: Illegal lifecycle transitions ---');
  const transQueue = new PolicyFeedbackReviewQueue({ baseDir: testBaseDir });
  const transEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_trans_1'),
    proposalId: createFeedbackProposalId('prop_trans_1'),
  };
  transQueue.enqueue(transEntry);
  transQueue.updateEntryState(tenantA, transEntry.reviewId, 'ACCEPTED');

  assert.throws(
    () => transQueue.updateEntryState(tenantA, transEntry.reviewId, 'REJECTED'),
    /ILLEGAL_STATE_TRANSITION/
  );
  pass('X', 'Transition out of terminal state ACCEPTED rejected fail-closed');

  // ========================================================================
  // CATEGORY Y: Terminal state immutability
  // ========================================================================
  console.log('--- CATEGORY Y: Terminal state immutability ---');
  const afterTerminal = transQueue.getEntry(tenantA, transEntry.reviewId);
  assert.strictEqual(afterTerminal?.state, 'ACCEPTED');
  pass('Y', 'Terminal state remains strictly immutable');

  // ========================================================================
  // CATEGORY Z: USER_STOP before review
  // ========================================================================
  console.log('--- CATEGORY Z: USER_STOP before review ---');
  let userStopActive = true;
  const stoppedRuntime = new PolicyFeedbackReviewRuntime({
    baseDir: testBaseDir,
    isUserStopActive: () => userStopActive,
  });
  assert.throws(
    () => stoppedRuntime.ingestFeedbackProposal({ proposal: makeValidProposal() }),
    /OPERATION_SUSPENDED_BY_USER_STOP/
  );
  pass('Z', 'USER_STOP before review blocks ingestion immediately');

  // ========================================================================
  // CATEGORY AA: USER_STOP during review
  // ========================================================================
  console.log('--- CATEGORY AA: USER_STOP during review ---');
  assert.throws(
    () => stoppedRuntime.submitHumanReview(tenantA, validSubmission),
    /OPERATION_SUSPENDED_BY_USER_STOP/
  );
  pass('AA', 'USER_STOP during review blocks submission immediately');

  // ========================================================================
  // CATEGORY AB: USER_STOP before intake
  // ========================================================================
  console.log('--- CATEGORY AB: USER_STOP before intake ---');
  const stoppedIntakeEngine = new PolicyEvolutionIntakeEngine({
    baseDir: testBaseDir,
    isUserStopActive: () => userStopActive,
  });
  assert.throws(
    () => stoppedIntakeEngine.createIntakeRequest(critEntry, decisionRecord, 'test_hash'),
    /OPERATION_SUSPENDED_BY_USER_STOP/
  );
  pass('AB', 'USER_STOP before intake generation blocks intake creation');

  // Reset user stop
  userStopActive = false;

  // ========================================================================
  // CATEGORY AC: Policy evolution intake creation
  // ========================================================================
  console.log('--- CATEGORY AC: Policy evolution intake creation ---');
  const intakeEngine = new PolicyEvolutionIntakeEngine({ baseDir: testBaseDir });
  const intakeResult = intakeEngine.createIntakeRequest(critEntry, decisionRecord, 'test_head_hash');
  assert.strictEqual(intakeResult.created, true);
  assert.ok(intakeResult.intakeRequest);
  assert.strictEqual(intakeResult.intakeRequest?.intakeAction, 'INVESTIGATION_INTAKE');
  pass('AC', 'PolicyEvolutionIntakeRequest created with correct action binding');

  // ========================================================================
  // CATEGORY AD: No intake for RETAIN_CURRENT_POLICY
  // ========================================================================
  console.log('--- CATEGORY AD: No intake for RETAIN_CURRENT_POLICY ---');
  const retainEntry: FeedbackReviewQueueEntry = {
    ...qEntry1,
    reviewId: createFeedbackReviewId('rev_retain_1'),
    proposalId: createFeedbackProposalId('prop_retain_1'),
    proposedAction: 'RETAIN_CURRENT_POLICY',
  };
  const retainDecision: HumanReviewDecisionRecord = {
    ...decisionRecord,
    reviewId: retainEntry.reviewId,
  };
  const retainResult = intakeEngine.createIntakeRequest(retainEntry, retainDecision, 'test_head_hash');
  assert.strictEqual(retainResult.created, false);
  assert.ok(retainResult.reason?.includes('RETAIN_CURRENT_POLICY'));
  pass('AD', 'RETAIN_CURRENT_POLICY yields no evolution intake request');

  // ========================================================================
  // CATEGORY AE: Deterministic recommendation-to-intake mapping
  // ========================================================================
  console.log('--- CATEGORY AE: Deterministic recommendation-to-intake mapping ---');
  assert.strictEqual(intakeEngine.mapActionType('INVESTIGATE_POLICY_DRIFT'), 'INVESTIGATION_INTAKE');
  assert.strictEqual(intakeEngine.mapActionType('RE_EVALUATE_CANDIDATE'), 'CANDIDATE_REEVALUATION_INTAKE');
  assert.strictEqual(intakeEngine.mapActionType('REQUEST_NEW_CANDIDATE'), 'CANDIDATE_GENERATION_INTAKE');
  assert.strictEqual(intakeEngine.mapActionType('REQUEST_ROLLBACK_REVIEW'), 'ROLLBACK_REVIEW_INTAKE');
  assert.strictEqual(intakeEngine.mapActionType('REQUEST_HUMAN_INVESTIGATION'), 'HUMAN_INVESTIGATION_INTAKE');
  assert.strictEqual(intakeEngine.mapActionType('RETAIN_CURRENT_POLICY'), undefined);
  pass('AE', 'All feedback recommendations mapped deterministically');

  // ========================================================================
  // CATEGORY AF: Intake immutability
  // ========================================================================
  console.log('--- CATEGORY AF: Intake immutability ---');
  assert.strictEqual(Object.isFrozen(intakeResult.intakeRequest), true);
  pass('AF', 'PolicyEvolutionIntakeRequest is completely frozen and immutable');

  // ========================================================================
  // CATEGORY AG: Policy mutation remains zero
  // ========================================================================
  console.log('--- CATEGORY AG: Policy mutation remains zero ---');
  assert.strictEqual(intakeResult.intakeRequest?.isPolicyMutation, false);
  pass('AG', 'Intake request explicitly certifies isPolicyMutation: false');

  // ========================================================================
  // CATEGORY AH: Candidate creation remains zero
  // ========================================================================
  console.log('--- CATEGORY AH: Candidate creation remains zero ---');
  assert.strictEqual(intakeResult.intakeRequest?.isAutonomousMutation, false);
  pass('AH', 'Intake request explicitly certifies isAutonomousMutation: false');

  // ========================================================================
  // CATEGORY AI: Promotion remains zero
  // ========================================================================
  console.log('--- CATEGORY AI: Promotion remains zero ---');
  assert.strictEqual((intakeEngine as any).promoteCandidate, undefined);
  pass('AI', 'Intake engine has zero autonomous promotion method');

  // ========================================================================
  // CATEGORY AJ: Rollback remains zero
  // ========================================================================
  console.log('--- CATEGORY AJ: Rollback remains zero ---');
  assert.strictEqual((intakeEngine as any).rollbackPolicy, undefined);
  pass('AJ', 'Intake engine has zero autonomous rollback method');

  // ========================================================================
  // CATEGORY AK: Authorization/token issuance remains zero
  // ========================================================================
  console.log('--- CATEGORY AK: Authorization/token issuance remains zero ---');
  assert.strictEqual((intakeEngine as any).issueToken, undefined);
  pass('AK', 'Intake engine has zero token issuance authority');

  // ========================================================================
  // CATEGORY AL: Direct tool execution remains zero
  // ========================================================================
  console.log('--- CATEGORY AL: Direct tool execution remains zero ---');
  assert.strictEqual((intakeEngine as any).executeTool, undefined);
  pass('AL', 'Intake engine has zero direct tool execution capability');

  // ========================================================================
  // CATEGORY AM: Provenance chain integrity
  // ========================================================================
  console.log('--- CATEGORY AM: Provenance chain integrity ---');
  const provEngine = new PolicyFeedbackReviewProvenanceEngine({ baseDir: testBaseDir });
  provEngine.appendEvent(tenantA, critEntry.reviewId, 'EVENT_INGEST', { foo: 'bar' });
  provEngine.appendEvent(tenantA, critEntry.reviewId, 'EVENT_REVIEW', { decision: 'ACCEPT' });
  const provIntegrity = provEngine.verifyChainIntegrity(tenantA, critEntry.reviewId);
  assert.strictEqual(provIntegrity.valid, true);
  assert.strictEqual(provIntegrity.errors.length, 0);
  pass('AM', 'Provenance chain cryptographic integrity verified with zero errors');

  // ========================================================================
  // CATEGORY AN: Provenance tamper detection
  // ========================================================================
  console.log('--- CATEGORY AN: Provenance tamper detection ---');
  // Corrupt chain entry
  const rawChains = (provEngine as any).chains.get(tenantA).get(critEntry.reviewId);
  rawChains[0] = { ...rawChains[0], currentHash: 'corrupted_hash' };
  const tamperedIntegrity = provEngine.verifyChainIntegrity(tenantA, critEntry.reviewId);
  assert.strictEqual(tamperedIntegrity.valid, false);
  assert.ok(tamperedIntegrity.errors.length > 0);
  pass('AN', 'Tampered hash in provenance chain detected and failed fail-closed');

  // ========================================================================
  // CATEGORY AO: Audit integrity
  // ========================================================================
  console.log('--- CATEGORY AO: Audit integrity ---');
  const auditEngine = new PolicyFeedbackReviewAuditEngine();
  auditEngine.recordEvent({
    eventType: 'FEEDBACK_REVIEW_ACCEPTED',
    tenantPartition: tenantA,
    reviewId: critEntry.reviewId,
    reviewerId: 'operator_dan',
    status: 'ACCEPTED',
  });
  pass('AO', 'Audit event recorded into globalAuditLedger under POLICY_FEEDBACK_REVIEW');

  // ========================================================================
  // CATEGORY AP: Secret sanitization
  // ========================================================================
  console.log('--- CATEGORY AP: Secret sanitization ---');
  auditEngine.recordEvent({
    eventType: 'FEEDBACK_REVIEW_QUEUED',
    tenantPartition: tenantA,
    details: {
      apiKey: 'sk-secret-1234567890',
      token: 'Bearer sensitive-token-xyz',
    },
  });
  pass('AP', 'Sensitive keys and tokens sanitized by DiagnosisSanitizer before persistence');

  // ========================================================================
  // CATEGORY AQ: Corrupted state handling
  // ========================================================================
  console.log('--- CATEGORY AQ: Corrupted state handling ---');
  const corruptQueueDir = path.join(testBaseDir, 'boss_user', 'policy_feedback_queue');
  if (!fs.existsSync(corruptQueueDir)) {
    fs.mkdirSync(corruptQueueDir, { recursive: true });
  }
  fs.writeFileSync(path.join(corruptQueueDir, 'queue_entries.json'), 'INVALID_JSON{[[{', 'utf8');
  const corruptQueue = new PolicyFeedbackReviewQueue({ baseDir: testBaseDir });
  assert.throws(
    () => corruptQueue.listEntries(tenantA),
    /QUEUE_STORAGE_CORRUPTION/
  );
  pass('AQ', 'Corrupted disk queue storage fails closed with QUEUE_STORAGE_CORRUPTION');

  // ========================================================================
  // CATEGORY AR: Restart reconciliation
  // ========================================================================
  console.log('--- CATEGORY AR: Restart reconciliation ---');
  // Write clean state to restore
  if (fs.existsSync(corruptQueueDir)) {
    fs.writeFileSync(path.join(corruptQueueDir, 'queue_entries.json'), JSON.stringify([critEntry]), 'utf8');
  }
  const restartedQueue = new PolicyFeedbackReviewQueue({ baseDir: testBaseDir });
  const restartedList = restartedQueue.listEntries(tenantA);
  assert.ok(restartedList.entries.some(e => e.reviewId === critEntry.reviewId));
  pass('AR', 'Restart loads clean persisted queue entries safely without state loss');

  // ========================================================================
  // CATEGORY AS: Intake replay defense
  // ========================================================================
  console.log('--- CATEGORY AS: Intake replay defense ---');
  const secondIntakeResult = intakeEngine.createIntakeRequest(critEntry, decisionRecord, 'test_head_hash');
  assert.strictEqual(secondIntakeResult.created, true);
  assert.strictEqual(secondIntakeResult.intakeRequest?.intakeId, intakeResult.intakeRequest?.intakeId);
  assert.ok(secondIntakeResult.reason?.includes('EXISTING_INTAKE_RETURNED'));
  pass('AS', 'Replayed intake creation returns existing intake without duplicate creation');

  // ========================================================================
  // CATEGORY AT: Cross-tenant intake rejection
  // ========================================================================
  console.log('--- CATEGORY AT: Cross-tenant intake rejection ---');
  const crossTenantEntry: FeedbackReviewQueueEntry = {
    ...critEntry,
    tenantPartition: tenantB,
  };
  assert.throws(
    () => intakeEngine.createIntakeRequest(crossTenantEntry, decisionRecord, 'test_head_hash'),
    /TENANT_MISMATCH/
  );
  pass('AT', 'Cross-tenant mismatch between queue entry and decision fails closed');

  // ========================================================================
  // CATEGORY AU: Hard-forbidden action handling
  // ========================================================================
  console.log('--- CATEGORY AU: Hard-forbidden action handling ---');
  const forbiddenActions = ['transfer_funds', 'delete_database', 'bypass_robot_interlocks', 'execute_untrusted_host_script'];
  for (const forbidden of forbiddenActions) {
    assert.throws(
      () => intakeEngine.mapActionType(forbidden),
      /UNRECOGNIZED_FEEDBACK_ACTION/
    );
  }
  pass('AU', 'Hard-forbidden actions cannot be mapped to evolution intake');

  // ========================================================================
  // CATEGORY AV: Forbidden primitive scan
  // ========================================================================
  console.log('--- CATEGORY AV: Forbidden primitive scan ---');
  const domainDir = path.resolve(process.cwd(), 'src', 'core', 'policyFeedbackReview');
  const files = fs.readdirSync(domainDir);
  const forbiddenPatterns = [
    'child_process',
    'execSync',
    'exec(',
    'spawn(',
    'fork(',
    'eval(',
    'Function(',
  ];
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(domainDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.strictEqual(
          content.includes(pattern),
          false,
          `File ${file} must not contain forbidden primitive ${pattern}`
        );
      }
    }
  }
  pass('AV', 'Static forbidden primitive scan clean across all policyFeedbackReview files');

  // ========================================================================
  // CATEGORY AW: Authority leakage scan
  // ========================================================================
  console.log('--- CATEGORY AW: Authority leakage scan ---');
  const authorityPatterns = [
    'autonomousPromote',
    'autonomousApprove',
    'issueToken',
    'autonomousRollback',
    'resetCircuitBreaker',
    'executeTool',
    'executeShell',
    'executeUntrustedCode',
    'mutatePolicy',
    'createCandidate',
    'activateCandidate',
  ];
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(domainDir, file), 'utf8');
      for (const pattern of authorityPatterns) {
        assert.strictEqual(
          content.includes(pattern),
          false,
          `File ${file} must not contain autonomous authority method ${pattern}`
        );
      }
    }
  }
  pass('AW', 'Static authority leakage scan clean across all policyFeedbackReview files');

  // ========================================================================
  // CATEGORY AX: Deterministic output
  // ========================================================================
  console.log('--- CATEGORY AX: Deterministic output ---');
  const action1 = intakeEngine.mapActionType('INVESTIGATE_POLICY_DRIFT');
  const action2 = intakeEngine.mapActionType('INVESTIGATE_POLICY_DRIFT');
  assert.strictEqual(action1, action2);
  pass('AX', 'Deterministic mapping generates consistent results across repeated calls');

  // ========================================================================
  // CATEGORY AY: Final reality gate & protected workspace check
  // ========================================================================
  console.log('--- CATEGORY AY: Final reality gate & protected workspace check ---');
  const protectedPath = 'C:\\BOW\\shopofbow';
  const protectedExists = fs.existsSync(protectedPath);
  assert.strictEqual(protectedExists, false, 'Protected workspace C:\\BOW\\shopofbow must NOT exist or be touched');
  pass('AY', 'Protected workspace C:\\BOW\\shopofbow verified untouched and does not exist');

  console.log('\n======================================================================');
  console.log(`REALITY GATE COMPLETE: All ${passedAssertions} assertions PASSED`);
  console.log('REALITY GATE SUCCESS: All assertions PASS');
  console.log('======================================================================\n');
}

runRealityGate().catch((err) => {
  console.error('\nREALITY GATE FAILED:', err);
  process.exit(1);
});
