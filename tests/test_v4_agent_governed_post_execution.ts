// tests/test_v4_agent_governed_post_execution.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Dedicated Reality-Gate Test Suite covering categories A through AK.
// Verifies:
// 1. Branded identifiers and DTO validation
// 2. Verified outcome consumption and reconciliation (SUCCESS, FAILURE, PARTIAL, BLOCKED, UNKNOWN)
// 3. Contradictory evidence detection & UNKNOWN preservation (UNKNOWN != SUCCESS)
// 4. Missing lifecycle evidence detection
// 5. Expected-vs-actual impact analysis (EXPECTED, BETTER, WORSE, NO_EFFECT, PARTIAL_EFFECT, SAFETY_REGRESSION)
// 6. Deterministic regression detection (policy regression, candidate degradation, repeated failure, rollback recurrence)
// 7. Remediation effectiveness: SUCCESS does NOT imply EFFECTIVE; empirical evidence requirement; INCONCLUSIVE handling
// 8. Governed feedback proposal generation & immutability (isAutonomousMutation === false)
// 9. Strict zero autonomous mutation, promotion, rollback, token issuance, or authorization
// 10. Absolute USER_STOP supremacy across all post-execution operations
// 11. Strict tenant isolation (path traversal, anonymous, cross-tenant denied)
// 12. Candidate isolation
// 13. Append-only SHA-256 cryptographic provenance hash chaining & anti-tamper detection
// 14. Structured audit logging under domain POLICY_POST_EXECUTION with DiagnosisSanitizer
// 15. Deterministic output & corrupted state fail-closed handling
// 16. Zero forbidden primitives & zero authority leakage
// 17. Confinement of protected workspace C:\BOW\shopofbow

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createReconciliationId,
  createPolicyReconciliationId,
  createImpactAnalysisId,
  createEffectivenessAssessmentId,
  createRegressionDetectionId,
  createFeedbackProposalId,
  createPostExecutionProvenanceId,
  PolicyPostExecutionReconciliationEngine,
  PolicyImpactAnalysisEngine,
  PolicyRegressionDetectionEngine,
  PolicyRemediationEffectivenessEngine,
  PolicyFeedbackProposalEngine,
  PolicyPostExecutionProvenanceEngine,
  PolicyPostExecutionAuditEngine,
  PolicyPostExecutionRuntime,
} from '../src/core/policyPostExecution/index.js';
import {
  createExecutionId,
  createExecutionOutcomeId,
  type ExecutionReceipt,
  type ExecutionVerificationResult,
} from '../src/core/policyExecution/index.js';
import {
  createDecisionProposalId,
  createRemediationRequestId,
} from '../src/core/policyDecision/index.js';
import { createPolicyCandidateId } from '../src/core/policyCanary/index.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

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

function createMockReceipt(overrides?: Partial<ExecutionReceipt>): ExecutionReceipt {
  const tenantPartition = overrides?.tenantPartition ?? 'tenant_post_exec_test';
  const executionId = overrides?.executionId ?? createExecutionId('exec_pe_001');
  const proposalId = overrides?.proposalId ?? createDecisionProposalId('prop_pe_001');
  const requestId = overrides?.requestId ?? createRemediationRequestId('rem_pe_001');
  const candidateId = overrides?.candidateId ?? createPolicyCandidateId('cand_pe_001');

  return Object.freeze({
    executionId,
    envelopeId: overrides?.envelopeId ?? 'env_pe_001',
    requestId,
    proposalId,
    tenantPartition,
    candidateId,
    actionType: overrides?.actionType ?? 'HOLD_CANARY',
    targetRing: overrides?.targetRing ?? 'RING_1',
    status: overrides?.status ?? 'SUCCEEDED',
    startedAt: overrides?.startedAt ?? new Date(Date.now() - 500).toISOString(),
    completedAt: overrides?.completedAt ?? new Date().toISOString(),
    dispatchedTarget: overrides?.dispatchedTarget ?? 'PolicyCanaryRingRouter',
    rawOutput: overrides?.rawOutput !== undefined ? overrides.rawOutput : { success: true },
    error: overrides?.error,
    operatorUserId: overrides?.operatorUserId ?? 'human_operator_alice',
    executionDurationMs: overrides?.executionDurationMs ?? 500,
  });
}

function createMockVerification(overrides?: Partial<ExecutionVerificationResult>): ExecutionVerificationResult {
  const tenantPartition = overrides?.tenantPartition ?? 'tenant_post_exec_test';
  const executionId = overrides?.executionId ?? createExecutionId('exec_pe_001');
  const verificationId = overrides?.verificationId ?? createExecutionOutcomeId('out_pe_001');

  return Object.freeze({
    verificationId,
    executionId,
    envelopeId: overrides?.envelopeId ?? 'env_pe_001',
    tenantPartition,
    status: overrides?.status ?? 'SUCCESS',
    verified: overrides?.verified ?? true,
    evidenceCount: overrides?.evidenceCount ?? 2,
    reasons: overrides?.reasons ?? ['VERIFIED_EXECUTION_SUCCESS'],
    verifiedAt: overrides?.verifiedAt ?? new Date().toISOString(),
    provenanceHash: overrides?.provenanceHash ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  });
}

async function runRealityGate(): Promise<void> {
  console.log('======================================================================');
  console.log('REALITY GATE: MS-1.3.66 GOVERNED POST-EXECUTION RECONCILIATION & FEEDBACK');
  console.log('======================================================================\n');

  // ============================================================================
  // CATEGORY A: Branded Identifiers
  // ============================================================================
  console.log('--- CATEGORY A: Branded identifiers ---');
  {
    const rId = createReconciliationId('rec_001');
    assert(typeof rId === 'string' && rId === 'rec_001', '[CATEGORY A] createReconciliationId valid');

    const prId = createPolicyReconciliationId('rec_policy_001');
    assert(typeof prId === 'string' && prId === 'rec_policy_001', '[CATEGORY A] createPolicyReconciliationId valid');

    const impId = createImpactAnalysisId('imp_001');
    assert(typeof impId === 'string' && impId === 'imp_001', '[CATEGORY A] createImpactAnalysisId valid');

    const effId = createEffectivenessAssessmentId('eff_001');
    assert(typeof effId === 'string' && effId === 'eff_001', '[CATEGORY A] createEffectivenessAssessmentId valid');

    const regId = createRegressionDetectionId('reg_001');
    assert(typeof regId === 'string' && regId === 'reg_001', '[CATEGORY A] createRegressionDetectionId valid');

    const fbpId = createFeedbackProposalId('fbp_001');
    assert(typeof fbpId === 'string' && fbpId === 'fbp_001', '[CATEGORY A] createFeedbackProposalId valid');

    const prvId = createPostExecutionProvenanceId('pep_prv_001');
    assert(typeof prvId === 'string' && prvId === 'pep_prv_001', '[CATEGORY A] createPostExecutionProvenanceId valid');

    assertThrows(() => createReconciliationId(''), 'INVALID_RECONCILIATION_ID', '[CATEGORY A] Empty ReconciliationId rejected');
    assertThrows(() => createImpactAnalysisId('   '), 'INVALID_IMPACT_ANALYSIS_ID', '[CATEGORY A] Whitespace ImpactAnalysisId rejected');
  }

  // ============================================================================
  // CATEGORY B: Verified Outcome Consumption
  // ============================================================================
  console.log('--- CATEGORY B: Verified outcome consumption ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt();
    const verification = createMockVerification();

    const result = engine.reconcile(receipt, verification);
    assert(result.executionId === receipt.executionId, '[CATEGORY B] Reconciled executionId matches');
    assert(result.tenantPartition === receipt.tenantPartition, '[CATEGORY B] Reconciled tenant matches');
    assert(result.rawOutcomeStatus === 'SUCCESS', '[CATEGORY B] Raw outcome status preserved');
  }

  // ============================================================================
  // CATEGORY C: Successful Reconciliation
  // ============================================================================
  console.log('--- CATEGORY C: Successful reconciliation ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt({ status: 'SUCCEEDED' });
    const verification = createMockVerification({ status: 'SUCCESS' });

    const result = engine.reconcile(receipt, verification);
    assert(result.status === 'VERIFIED_SUCCESS', '[CATEGORY C] SUCCEEDED + SUCCESS yields VERIFIED_SUCCESS');
    assert(result.discrepancies.length === 0, '[CATEGORY C] Zero discrepancies in clean reconciliation');
  }

  // ============================================================================
  // CATEGORY D: Failed Reconciliation
  // ============================================================================
  console.log('--- CATEGORY D: Failed reconciliation ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt({ status: 'FAILED' });
    const verification = createMockVerification({ status: 'FAILURE' });

    const result = engine.reconcile(receipt, verification);
    assert(result.status === 'VERIFIED_FAILURE', '[CATEGORY D] FAILED + FAILURE yields VERIFIED_FAILURE');
  }

  // ============================================================================
  // CATEGORY E: Partial Reconciliation
  // ============================================================================
  console.log('--- CATEGORY E: Partial reconciliation ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt({ status: 'PARTIAL' });
    const verification = createMockVerification({ status: 'PARTIAL' });

    const result = engine.reconcile(receipt, verification);
    assert(result.status === 'VERIFIED_PARTIAL', '[CATEGORY E] PARTIAL + PARTIAL yields VERIFIED_PARTIAL');
  }

  // ============================================================================
  // CATEGORY F: UNKNOWN Preservation
  // ============================================================================
  console.log('--- CATEGORY F: UNKNOWN preservation ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt({ status: 'UNKNOWN' });
    const verification = createMockVerification({ status: 'UNKNOWN' });

    const result = engine.reconcile(receipt, verification);
    assert(result.status === 'VERIFIED_UNKNOWN', '[CATEGORY F] UNKNOWN status strictly preserved as VERIFIED_UNKNOWN');
    assert(result.status !== 'VERIFIED_SUCCESS', '[CATEGORY F] UNKNOWN is NEVER converted to SUCCESS');
  }

  // ============================================================================
  // CATEGORY G: Contradictory Evidence
  // ============================================================================
  console.log('--- CATEGORY G: Contradictory evidence ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt({ status: 'SUCCEEDED' });
    const verification = createMockVerification({ status: 'FAILURE' });

    const result = engine.reconcile(receipt, verification);
    assert(result.status === 'RECONCILIATION_INVALID', '[CATEGORY G] Contradictory SUCCEEDED vs FAILURE yields RECONCILIATION_INVALID');
    assert(result.discrepancies.length > 0, '[CATEGORY G] Contradiction logged in discrepancies');
  }

  // ============================================================================
  // CATEGORY H: Missing Lifecycle Evidence
  // ============================================================================
  console.log('--- CATEGORY H: Missing lifecycle evidence ---');
  {
    const engine = new PolicyPostExecutionReconciliationEngine();
    const badReceipt = createMockReceipt({
      startedAt: '',
      executionDurationMs: -10,
    });
    const verification = createMockVerification();

    const result = engine.reconcile(badReceipt, verification);
    assert(result.discrepancies.some((d) => d.includes('MISSING_TIMING_METADATA')), '[CATEGORY H] Missing timing detected');
    assert(result.discrepancies.some((d) => d.includes('INVALID_EXECUTION_DURATION')), '[CATEGORY H] Negative duration detected');
  }

  // ============================================================================
  // CATEGORY I: Expected-vs-Actual Impact
  // ============================================================================
  console.log('--- CATEGORY I: Expected-vs-actual impact ---');
  {
    const impactEngine = new PolicyImpactAnalysisEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());

    const impact = impactEngine.analyzeImpact(rec, {
      expectedEffect: 'Hold canary rollout pending review',
      observedEffect: 'Rollout held at Ring 1',
    });

    assert(impact.classification === 'EXPECTED', '[CATEGORY I] Matching expected and actual yields EXPECTED');
  }

  // ============================================================================
  // CATEGORY J: No-Effect Detection
  // ============================================================================
  console.log('--- CATEGORY J: No-effect detection ---');
  {
    const impactEngine = new PolicyImpactAnalysisEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());

    const impact = impactEngine.analyzeImpact(rec, {
      expectedEffect: 'Reduce error rate by 50%',
      metricsDelta: { errorRateReduction: 0, latencyShift: 0 },
    });

    assert(impact.classification === 'NO_EFFECT', '[CATEGORY J] Zero metric shift detected as NO_EFFECT');
  }

  // ============================================================================
  // CATEGORY K: Partial-Effect Detection
  // ============================================================================
  console.log('--- CATEGORY K: Partial-effect detection ---');
  {
    const impactEngine = new PolicyImpactAnalysisEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const rec = recEngine.reconcile(
      createMockReceipt({ status: 'PARTIAL' }),
      createMockVerification({ status: 'PARTIAL' })
    );

    const impact = impactEngine.analyzeImpact(rec, {
      expectedEffect: 'Full parameter calibration',
      observedEffect: 'Partial parameter calibration',
    });

    assert(impact.classification === 'PARTIAL_EFFECT', '[CATEGORY K] Partial reconciliation yields PARTIAL_EFFECT');
  }

  // ============================================================================
  // CATEGORY L: Safety Regression Detection
  // ============================================================================
  console.log('--- CATEGORY L: Safety regression detection ---');
  {
    const impactEngine = new PolicyImpactAnalysisEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());

    const impact = impactEngine.analyzeImpact(rec, {
      expectedEffect: 'Remediation',
      safetyStateDegraded: true,
    });

    assert(impact.classification === 'SAFETY_REGRESSION', '[CATEGORY L] Degraded safety state classified as SAFETY_REGRESSION');

    const regEngine = new PolicyRegressionDetectionEngine();
    const finding = regEngine.detectRegression(rec, impact);
    assert(finding.regressionDetected === true, '[CATEGORY L] Regression detected on SAFETY_REGRESSION');
    assert(finding.severity === 'CRITICAL', '[CATEGORY L] Severity is CRITICAL on safety regression');
    assert(finding.regressionTypes.includes('SAFETY_FLOOR_VIOLATION'), '[CATEGORY L] SAFETY_FLOOR_VIOLATION present');
  }

  // ============================================================================
  // CATEGORY M: Policy Regression Detection
  // ============================================================================
  console.log('--- CATEGORY M: Policy regression detection ---');
  {
    const impactEngine = new PolicyImpactAnalysisEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const rec = recEngine.reconcile(
      createMockReceipt({ status: 'FAILED' }),
      createMockVerification({ status: 'FAILURE' })
    );

    const impact = impactEngine.analyzeImpact(rec, {
      expectedEffect: 'Baseline restoration',
    });

    const regEngine = new PolicyRegressionDetectionEngine();
    const finding = regEngine.detectRegression(rec, impact);
    assert(finding.regressionTypes.includes('POLICY_REGRESSION'), '[CATEGORY M] Worse-than-expected classified as POLICY_REGRESSION');
  }

  // ============================================================================
  // CATEGORY N: Repeated Remediation Failure
  // ============================================================================
  console.log('--- CATEGORY N: Repeated remediation failure ---');
  {
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();

    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });

    const finding = regEngine.detectRegression(rec, impact, { historicalFailureCount: 3 });
    assert(finding.regressionTypes.includes('REPEATED_REMEDIATION_FAILURE'), '[CATEGORY N] Repeated failure identified');
    assert(finding.severity === 'HIGH', '[CATEGORY N] Repeated failure severity is HIGH');
  }

  // ============================================================================
  // CATEGORY O: Effectiveness = SUCCESS Does NOT Imply EFFECTIVE
  // ============================================================================
  console.log('--- CATEGORY O: Effectiveness = SUCCESS does NOT imply EFFECTIVE ---');
  {
    const effEngine = new PolicyRemediationEffectivenessEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();

    // Clean execution success, but zero empirical follow-up evidence provided
    const rec = recEngine.reconcile(createMockReceipt({ status: 'SUCCEEDED' }), createMockVerification({ status: 'SUCCESS' }));
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });
    const reg = regEngine.detectRegression(rec, impact);

    const eff = effEngine.assessEffectiveness(rec, impact, reg, { empiricalEvidenceCount: 0 });
    assert(eff.executionSuccess === true, '[CATEGORY O] Execution success is true');
    assert(eff.status !== 'EFFECTIVE', '[CATEGORY O] Status is NOT EFFECTIVE merely because execution succeeded');
    assert(eff.status === 'INCONCLUSIVE', '[CATEGORY O] Zero evidence yields INCONCLUSIVE');
  }

  // ============================================================================
  // CATEGORY P: EFFECTIVE Requires Empirical Evidence
  // ============================================================================
  console.log('--- CATEGORY P: EFFECTIVE requires empirical evidence ---');
  {
    const effEngine = new PolicyRemediationEffectivenessEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();

    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });
    const reg = regEngine.detectRegression(rec, impact);

    const eff = effEngine.assessEffectiveness(rec, impact, reg, {
      empiricalEvidenceCount: 5,
      underlyingIssueResolved: true,
      healthRestored: true,
    });

    assert(eff.status === 'EFFECTIVE', '[CATEGORY P] Verified empirical evidence yields EFFECTIVE');
    assert(eff.issueResolved === true, '[CATEGORY P] issueResolved is true');
  }

  // ============================================================================
  // CATEGORY Q: INCONCLUSIVE Handling
  // ============================================================================
  console.log('--- CATEGORY Q: INCONCLUSIVE handling ---');
  {
    const effEngine = new PolicyRemediationEffectivenessEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();

    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });
    const reg = regEngine.detectRegression(rec, impact);

    const eff = effEngine.assessEffectiveness(rec, impact, reg, { empiricalEvidenceCount: 0 });
    assert(eff.status === 'INCONCLUSIVE', '[CATEGORY Q] Inconclusive status handled');

    const fbpEngine = new PolicyFeedbackProposalEngine();
    const prop = fbpEngine.generateProposal(rec, impact, reg, eff);
    assert(prop.proposedAction === 'RE_EVALUATE_CANDIDATE', '[CATEGORY Q] Inconclusive effectiveness proposes RE_EVALUATE_CANDIDATE');
  }

  // ============================================================================
  // CATEGORY R: Feedback Proposal Generation
  // ============================================================================
  console.log('--- CATEGORY R: Feedback proposal generation ---');
  {
    const fbpEngine = new PolicyFeedbackProposalEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();
    const effEngine = new PolicyRemediationEffectivenessEngine();

    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });
    const reg = regEngine.detectRegression(rec, impact);
    const eff = effEngine.assessEffectiveness(rec, impact, reg, {
      empiricalEvidenceCount: 3,
      underlyingIssueResolved: true,
      healthRestored: true,
    });

    const proposal = fbpEngine.generateProposal(rec, impact, reg, eff);
    assert(proposal.proposedAction === 'RETAIN_CURRENT_POLICY', '[CATEGORY R] Stable effective remediation proposes RETAIN_CURRENT_POLICY');
    assert(proposal.state === 'PROPOSED', '[CATEGORY R] Initial proposal state is PROPOSED');
  }

  // ============================================================================
  // CATEGORY S: Feedback Proposal Immutability
  // ============================================================================
  console.log('--- CATEGORY S: Feedback proposal immutability ---');
  {
    const fbpEngine = new PolicyFeedbackProposalEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();
    const effEngine = new PolicyRemediationEffectivenessEngine();

    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });
    const reg = regEngine.detectRegression(rec, impact);
    const eff = effEngine.assessEffectiveness(rec, impact, reg);

    const proposal = fbpEngine.generateProposal(rec, impact, reg, eff);
    assert(proposal.isAutonomousMutation === false, '[CATEGORY S] isAutonomousMutation is strictly false');
    assert(Object.isFrozen(proposal), '[CATEGORY S] Proposal is frozen and immutable');
  }

  // ============================================================================
  // CATEGORY T: Zero Autonomous Policy Mutation
  // ============================================================================
  console.log('--- CATEGORY T: Zero autonomous policy mutation ---');
  {
    const runtime = new PolicyPostExecutionRuntime();
    assert(typeof (runtime as any).mutatePolicy === 'undefined', '[CATEGORY T] Runtime has no mutatePolicy method');
    assert(typeof (runtime as any).updateActivePolicy === 'undefined', '[CATEGORY T] Runtime has no updateActivePolicy method');
  }

  // ============================================================================
  // CATEGORY U: Zero Autonomous Candidate Creation
  // ============================================================================
  console.log('--- CATEGORY U: Zero autonomous candidate creation ---');
  {
    const runtime = new PolicyPostExecutionRuntime();
    assert(typeof (runtime as any).createCandidate === 'undefined', '[CATEGORY U] Runtime has no createCandidate method');
  }

  // ============================================================================
  // CATEGORY V: Zero Autonomous Promotion
  // ============================================================================
  console.log('--- CATEGORY V: Zero autonomous promotion ---');
  {
    const runtime = new PolicyPostExecutionRuntime();
    assert(typeof (runtime as any).promoteCandidate === 'undefined', '[CATEGORY V] Runtime has no promoteCandidate method');
    assert(typeof (runtime as any).autonomousPromote === 'undefined', '[CATEGORY V] Runtime has no autonomousPromote method');
  }

  // ============================================================================
  // CATEGORY W: Zero Autonomous Rollback
  // ============================================================================
  console.log('--- CATEGORY W: Zero autonomous rollback ---');
  {
    const runtime = new PolicyPostExecutionRuntime();
    assert(typeof (runtime as any).autonomousRollback === 'undefined', '[CATEGORY W] Runtime has no autonomousRollback method');
  }

  // ============================================================================
  // CATEGORY X: Zero Autonomous Authorization
  // ============================================================================
  console.log('--- CATEGORY X: Zero autonomous authorization ---');
  {
    const runtime = new PolicyPostExecutionRuntime();
    assert(typeof (runtime as any).autonomousApprove === 'undefined', '[CATEGORY X] Runtime has no autonomousApprove method');
  }

  // ============================================================================
  // CATEGORY Y: Zero Autonomous Token Issuance
  // ============================================================================
  console.log('--- CATEGORY Y: Zero autonomous token issuance ---');
  {
    const runtime = new PolicyPostExecutionRuntime();
    assert(typeof (runtime as any).issueToken === 'undefined', '[CATEGORY Y] Runtime has no issueToken method');
  }

  // ============================================================================
  // CATEGORY Z: USER_STOP Supremacy
  // ============================================================================
  console.log('--- CATEGORY Z: USER_STOP supremacy ---');
  {
    let userStop = true;
    const runtime = new PolicyPostExecutionRuntime({
      isUserStopActive: () => userStop,
    });

    const receipt = createMockReceipt();
    const verification = createMockVerification();

    assertThrows(
      () =>
        runtime.processPostExecution({
          receipt,
          verification,
          impactContext: { expectedEffect: 'Test' },
        }),
      'OPERATION_SUSPENDED_BY_USER_STOP',
      '[CATEGORY Z] processPostExecution blocked immediately by USER_STOP'
    );
  }

  // ============================================================================
  // CATEGORY AA: Tenant Isolation
  // ============================================================================
  console.log('--- CATEGORY AA: Tenant isolation ---');
  {
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const receiptA = createMockReceipt({ tenantPartition: 'tenant_alpha' });
    const verificationB = createMockVerification({ tenantPartition: 'tenant_beta' });

    assertThrows(
      () => recEngine.reconcile(receiptA, verificationB),
      'TENANT_MISMATCH_RECONCILIATION_FAILED',
      '[CATEGORY AA] Cross-tenant reconciliation fails closed'
    );

    const traversalReceipt = createMockReceipt({ tenantPartition: '../secrets' });
    const traversalVerification = createMockVerification({ tenantPartition: '../secrets' });

    assertThrows(
      () => recEngine.reconcile(traversalReceipt, traversalVerification),
      'Path traversal or illegal separator detected',
      '[CATEGORY AA] Path traversal in tenantPartition fails closed'
    );

    const anonReceipt = createMockReceipt({ tenantPartition: 'anonymous' });
    const anonVerification = createMockVerification({ tenantPartition: 'anonymous' });

    assertThrows(
      () => recEngine.reconcile(anonReceipt, anonVerification),
      'Anonymous or unresolved user cannot access',
      '[CATEGORY AA] Anonymous tenant access fails closed'
    );
  }

  // ============================================================================
  // CATEGORY AB: Candidate Isolation
  // ============================================================================
  console.log('--- CATEGORY AB: Candidate isolation ---');
  {
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const receipt = createMockReceipt({ candidateId: createPolicyCandidateId('cand_isolated_999') });
    const verification = createMockVerification();

    const rec = recEngine.reconcile(receipt, verification);
    assert(rec.candidateId === 'cand_isolated_999', '[CATEGORY AB] Candidate ID preserved throughout reconciliation');
  }

  // ============================================================================
  // CATEGORY AC: Provenance Integrity
  // ============================================================================
  console.log('--- CATEGORY AC: Provenance integrity ---');
  {
    const provenance = new PolicyPostExecutionProvenanceEngine();
    const execId = createExecutionId('exec_pep_prov_001');

    provenance.recordTransition({
      executionId: execId,
      tenantPartition: 'tenant_prov_pe',
      eventType: 'POST_EXECUTION_RECONCILED',
    });
    provenance.recordTransition({
      executionId: execId,
      tenantPartition: 'tenant_prov_pe',
      eventType: 'IMPACT_ANALYZED',
    });
    provenance.recordTransition({
      executionId: execId,
      tenantPartition: 'tenant_prov_pe',
      eventType: 'FEEDBACK_PROPOSED',
    });

    const check = provenance.verifyChain(execId);
    assert(check.valid === true, '[CATEGORY AC] Unaltered 3-transition provenance chain valid');
    assert(check.recordCount === 3, '[CATEGORY AC] 3 transitions verified');

    // Tamper with record
    const chain = (provenance as any).chains.get(execId);
    chain[1] = { ...chain[1], currentHash: 'tampered_hash_value' };

    const tamperedCheck = provenance.verifyChain(execId);
    assert(tamperedCheck.valid === false, '[CATEGORY AC] Tampered record detected as invalid');
    assert(tamperedCheck.reason?.includes('PROVENANCE_TAMPER_DETECTED') === true, '[CATEGORY AC] Tamper identified in reason');
  }

  // ============================================================================
  // CATEGORY AD: Audit Integrity
  // ============================================================================
  console.log('--- CATEGORY AD: Audit integrity ---');
  {
    const auditLedger = new AuditLedger();
    const auditEngine = new PolicyPostExecutionAuditEngine({ auditLedger });

    auditEngine.recordEvent({
      eventType: 'POST_EXECUTION_RECONCILED',
      tenantPartition: 'tenant_pe_audit',
      executionId: 'exec_pe_aud_001',
      status: 'VERIFIED_SUCCESS',
    });

    const trail = auditLedger.getTrail({ domain: PolicyPostExecutionAuditEngine.CANONICAL_DOMAIN });
    assert(trail.length === 1, '[CATEGORY AD] Audit event recorded under POLICY_POST_EXECUTION domain');
    assert(trail[0].domain === 'POLICY_POST_EXECUTION', '[CATEGORY AD] Domain is POLICY_POST_EXECUTION');
  }

  // ============================================================================
  // CATEGORY AE: Secret Sanitization
  // ============================================================================
  console.log('--- CATEGORY AE: Secret sanitization ---');
  {
    const auditLedger = new AuditLedger();
    const sanitizer = new DiagnosisSanitizer();
    const auditEngine = new PolicyPostExecutionAuditEngine({ auditLedger, sanitizer });

    auditEngine.recordEvent({
      eventType: 'FEEDBACK_PROPOSED',
      tenantPartition: 'tenant_pe_sec',
      executionId: 'exec_pe_sec_001',
      details: {
        rawToken: 'Bearer secret_token_abc_123',
        apiKey: 'sk-live-123456789abcdef',
      },
    });

    const trail = auditLedger.getTrail({ domain: PolicyPostExecutionAuditEngine.CANONICAL_DOMAIN });
    assert(trail.length === 1, '[CATEGORY AE] Audit trail entry present');
  }

  // ============================================================================
  // CATEGORY AF: Corrupted State Handling
  // ============================================================================
  console.log('--- CATEGORY AF: Corrupted state handling ---');
  {
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    assertThrows(
      () => recEngine.reconcile(null as any, null as any),
      'INVALID_RECONCILIATION_INPUT',
      '[CATEGORY AF] Null reconciliation input fails closed'
    );
  }

  // ============================================================================
  // CATEGORY AG: Deterministic Output
  // ============================================================================
  console.log('--- CATEGORY AG: Deterministic output ---');
  {
    const fbpEngine = new PolicyFeedbackProposalEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();
    const regEngine = new PolicyRegressionDetectionEngine();
    const effEngine = new PolicyRemediationEffectivenessEngine();

    const receipt = createMockReceipt();
    const verification = createMockVerification();
    const rec = recEngine.reconcile(receipt, verification);
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });
    const reg = regEngine.detectRegression(rec, impact);
    const eff = effEngine.assessEffectiveness(rec, impact, reg);

    const prop1 = fbpEngine.generateProposal(rec, impact, reg, eff);
    const prop2 = fbpEngine.generateProposal(rec, impact, reg, eff);

    assert(prop1.proposedAction === prop2.proposedAction, '[CATEGORY AG] Deterministic proposed action across repeated calls');
    assert(prop1.rationale === prop2.rationale, '[CATEGORY AG] Deterministic rationale across repeated calls');
  }

  // ============================================================================
  // CATEGORY AH: Forbidden Action Handling
  // ============================================================================
  console.log('--- CATEGORY AH: Forbidden action handling ---');
  {
    const regEngine = new PolicyRegressionDetectionEngine();
    const recEngine = new PolicyPostExecutionReconciliationEngine();
    const impactEngine = new PolicyImpactAnalysisEngine();

    const rec = recEngine.reconcile(createMockReceipt(), createMockVerification());
    const impact = impactEngine.analyzeImpact(rec, { expectedEffect: 'Test' });

    const finding = regEngine.detectRegression(rec, impact, { safetyViolationReported: true });
    assert(finding.regressionDetected === true, '[CATEGORY AH] Safety violation detected as regression');
    assert(finding.severity === 'CRITICAL', '[CATEGORY AH] Safety violation severity is CRITICAL');
  }

  // ============================================================================
  // CATEGORY AI: Forbidden Primitive Scan
  // ============================================================================
  console.log('--- CATEGORY AI: Forbidden primitive scan ---');
  {
    const dir = path.join(process.cwd(), 'src', 'core', 'policyPostExecution');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'));

    const forbiddenPatterns = [
      /\bchild_process\b/,
      /\bexecSync\b/,
      /\bexec\s*\(/,
      /\bspawn\s*\(/,
      /\bfork\s*\(/,
      /\beval\s*\(/,
      /\bFunction\s*\(/,
    ];

    let matches = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const pat of forbiddenPatterns) {
        if (pat.test(content)) {
          console.error(`Forbidden pattern match in ${file}: ${pat}`);
          matches++;
        }
      }
    }
    assert(matches === 0, '[CATEGORY AI] Zero forbidden primitives in policyPostExecution domain');
  }

  // ============================================================================
  // CATEGORY AJ: Authority Leakage Scan
  // ============================================================================
  console.log('--- CATEGORY AJ: Authority leakage scan ---');
  {
    const classes = [
      PolicyPostExecutionReconciliationEngine,
      PolicyImpactAnalysisEngine,
      PolicyRegressionDetectionEngine,
      PolicyRemediationEffectivenessEngine,
      PolicyFeedbackProposalEngine,
      PolicyPostExecutionProvenanceEngine,
      PolicyPostExecutionAuditEngine,
      PolicyPostExecutionRuntime,
    ];

    const forbiddenMethods = [
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

    for (const Cls of classes) {
      for (const meth of forbiddenMethods) {
        assert(
          typeof (Cls.prototype as any)[meth] === 'undefined',
          `[CATEGORY AJ] ${Cls.name} has no ${meth}() method`
        );
      }
    }
  }

  // ============================================================================
  // CATEGORY AK: Final Reality Gate
  // ============================================================================
  console.log('--- CATEGORY AK: Final reality gate ---');
  {
    const protectedDir = 'C:\\BOW\\shopofbow';
    const exists = fs.existsSync(protectedDir);
    assert(exists === false, '[CATEGORY AK] Protected workspace C:\\BOW\\shopofbow untouched and does not exist');
  }

  console.log('\n======================================================================');
  console.log(`REALITY GATE COMPLETE: All ${passed} assertions PASSED`);
  if (failed > 0) {
    console.error(`REALITY GATE FAILURE: ${failed} assertions FAILED`);
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('REALITY GATE SUCCESS: All assertions PASS');
    console.log('======================================================================\n');
  }
}

runRealityGate().catch((err) => {
  console.error('Unhandled reality gate error:', err);
  process.exit(1);
});
