// tests/test_v4_phase14_reality_validation_readiness.ts
// BOWCON V4.0 — MS-1.4.12: END-TO-END AGENT REALITY VALIDATION & GOVERNED READINESS ASSESSMENT TEST SUITE
// Verifies Holistic Reality Validation, Chaos Fault Injection, 12 Exit Criteria, Provenance Chaining, USER_STOP, and Immutability
// Minimum assertion target: >= 120 assertions

import assert from 'node:assert';
import {
  Phase14ReadinessRuntime,
  Phase14ExecutionGate,
  ChaosFaultInjector,
  Phase14ExitCriteriaEvaluator,
  Phase14ReadinessAssessor,
  Phase14ReadinessError,
  Phase14ReadinessAbortedError,
  Phase14ValidationError,
  Phase14SecurityError,
  PHASE14_CRITERIA_DEFINITIONS,
  deepFreeze,
  type Phase14CriterionId,
  type Phase14ChaosFaultType,
  type Phase14ReadinessReport,
} from '../src/core/phase14Readiness/index.js';

let passedAssertions = 0;
function testAssert(condition: boolean, message: string): void {
  assert.ok(condition, message);
  passedAssertions++;
}

console.log('================================================================');
console.log('BOWCON V4 — MS-1.4.12 PHASE 1.4 READINESS ASSESSMENT TEST SUITE');
console.log('================================================================');

async function runTests() {
  const dummyTenant = 'tenant_readiness_test';

  // -------------------------------------------------------------
  // Section 1: Types, 12 Criteria Definitions & Error Taxonomy
  // -------------------------------------------------------------
  console.log('>>> Section 1: Criteria Definitions & Error Taxonomy');
  const allCriteriaIds: Phase14CriterionId[] = [
    'CRIT-1.4-01',
    'CRIT-1.4-02',
    'CRIT-1.4-03',
    'CRIT-1.4-04',
    'CRIT-1.4-05',
    'CRIT-1.4-06',
    'CRIT-1.4-07',
    'CRIT-1.4-08',
    'CRIT-1.4-09',
    'CRIT-1.4-10',
    'CRIT-1.4-11',
    'CRIT-1.4-12',
  ];

  testAssert(allCriteriaIds.length === 12, 'Exactly 12 Phase 1.4 exit criteria cataloged');

  for (const critId of allCriteriaIds) {
    const def = PHASE14_CRITERIA_DEFINITIONS[critId];
    testAssert(def !== undefined, `Definition exists for [${critId}]`);
    testAssert(typeof def.name === 'string' && def.name.length > 0, `Name populated for [${critId}]`);
    testAssert(typeof def.description === 'string' && def.description.length > 0, `Description populated for [${critId}]`);
  }

  // Error Taxonomy
  const baseErr = new Phase14ReadinessError('base error');
  testAssert(baseErr instanceof Error, 'Base error extends Error');
  testAssert(baseErr.code === 'PHASE14_READINESS_ERROR', 'Base error code matches');

  const abortErr = new Phase14ReadinessAbortedError('user stop asserted');
  testAssert(abortErr instanceof Phase14ReadinessError, 'Aborted error extends base');
  testAssert(abortErr.code === 'PHASE14_READINESS_ABORTED', 'Aborted error code matches');
  testAssert(abortErr.reason === 'user stop asserted', 'Aborted error reason preserved');

  const valErr = new Phase14ValidationError('invalid id');
  testAssert(valErr instanceof Phase14ReadinessError, 'Validation error extends base');
  testAssert(valErr.code === 'PHASE14_VALIDATION_ERROR', 'Validation error code matches');

  const secErr = new Phase14SecurityError('null byte detected');
  testAssert(secErr instanceof Phase14ReadinessError, 'Security error extends base');
  testAssert(secErr.code === 'PHASE14_SECURITY_ERROR', 'Security error code matches');

  // -------------------------------------------------------------
  // Section 2: Execution Gate Security & Input Defenses
  // -------------------------------------------------------------
  console.log('>>> Section 2: Execution Gate Security Defenses');
  const gate = new Phase14ExecutionGate();

  // Valid identifiers
  gate.validateIdentifier('tenant_valid_01', 'tenantId');
  gate.validateIdentifier('rep_valid_report_01', 'reportId');
  passedAssertions += 2;

  // Rejection of path traversals
  assert.throws(() => {
    gate.validateIdentifier('../traversal', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  assert.throws(() => {
    gate.validateIdentifier('tenant/with/slash', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  assert.throws(() => {
    gate.validateIdentifier('tenant\\with\\backslash', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  // Rejection of null byte
  assert.throws(() => {
    gate.validateIdentifier('tenant\0null', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  // Rejection of protected workspace shopofbow
  assert.throws(() => {
    gate.validateIdentifier('tenant_shopofbow_admin', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  // Rejection of prototype pollution in identifiers
  assert.throws(() => {
    gate.validateIdentifier('__proto__', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  assert.throws(() => {
    gate.validateIdentifier('constructor', 'tenantId');
  }, Phase14SecurityError);
  passedAssertions++;

  // Rejection of prototype pollution in payloads
  assert.throws(() => {
    const polluted = JSON.parse('{"__proto__": {"injected": true}}');
    gate.validatePayload(polluted);
  }, Phase14SecurityError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 3: Bounded Chaos Fault Injection (All 6 Fault Types)
  // -------------------------------------------------------------
  console.log('>>> Section 3: Chaos Fault Injection');
  const injector = new ChaosFaultInjector(gate);

  const faultTypes: Phase14ChaosFaultType[] = [
    'NETWORK_TIMEOUT',
    'MODEL_CIRCUIT_BREAK',
    'PDP_DENIAL',
    'VERIFICATION_FAILURE',
    'COMMIT_CONFLICT',
    'USER_STOP_PREEMPTION',
  ];

  for (const fault of faultTypes) {
    const res = await injector.executeChaosScenario({
      scenarioId: `scenario_${fault.toLowerCase()}`,
      faultType: fault,
      targetSubsystem: `Subsystem_${fault}`,
      tenantId: dummyTenant,
    });

    testAssert(res.faultType === fault, `Chaos fault type [${fault}] returned in result`);
    testAssert(res.injected === true, `Injected flag set for [${fault}]`);
    testAssert(res.agentHandledSafely === true, `Agent handled [${fault}] safely`);
    testAssert(res.recoveredOrTerminatedCleanly === true, `Agent recovered/terminated cleanly for [${fault}]`);
    testAssert(res.zeroStatePollution === true, `Zero state pollution preserved for [${fault}]`);
    testAssert(res.durationMs > 0, `Duration measured for [${fault}]`);
    testAssert(typeof res.observedBehavior === 'string' && res.observedBehavior.length > 0, `Observed behavior logged for [${fault}]`);
  }

  // -------------------------------------------------------------
  // Section 4: Empirical Evaluation of the 12 Exit Criteria
  // -------------------------------------------------------------
  console.log('>>> Section 4: 12 Exit Criteria Evaluation');
  const evaluator = new Phase14ExitCriteriaEvaluator(gate);

  const healthyContext = {
    tenantId: dummyTenant,
    shopOfBowUntouched: true,
    regressionPassRatio: 1.0,
    userStopLatencyMs: 25,
    multiStepCompletionObserved: true,
    zeroUnauthToolObserved: true,
    zeroUnhandledDenialObserved: true,
    inferenceBudgetsEnforced: true,
    toolIsolationEnforced: true,
    realityVerificationEnforced: true,
    memoryPollutionInvariantHeld: true,
    distributedTracesComplete: true,
    multiTenantIsolationHeld: true,
  };

  const fullEvals = evaluator.evaluateAllCriteria(healthyContext);
  testAssert(fullEvals.length === 12, 'Evaluated all 12 criteria');

  for (const ev of fullEvals) {
    testAssert(ev.status === 'PASSED', `Criterion [${ev.criterionId}] passed in healthy context`);
    testAssert(ev.score === 1.0, `Score is 1.0 for [${ev.criterionId}]`);
    testAssert(Object.keys(ev.empiricalEvidence).length > 0, `Empirical evidence attached for [${ev.criterionId}]`);
  }

  // Negative evaluation test: fail single criterion (e.g. regressionPassRatio < 1.0)
  const failingContext = {
    ...healthyContext,
    regressionPassRatio: 0.95,
  };
  const failingEvals = evaluator.evaluateAllCriteria(failingContext);
  const crit11 = failingEvals.find(e => e.criterionId === 'CRIT-1.4-11');
  testAssert(crit11 !== undefined, 'CRIT-1.4-11 found');
  testAssert(crit11?.status === 'FAILED', 'CRIT-1.4-11 failed when regressionPassRatio < 1.0');
  testAssert(crit11?.score === 0.95, 'CRIT-1.4-11 score reflects actual pass ratio');

  // Negative evaluation test: shopofbow touched
  const shopFailingContext = {
    ...healthyContext,
    shopOfBowUntouched: false,
  };
  const shopFailingEvals = evaluator.evaluateAllCriteria(shopFailingContext);
  const crit12 = shopFailingEvals.find(e => e.criterionId === 'CRIT-1.4-12');
  testAssert(crit12?.status === 'FAILED', 'CRIT-1.4-12 failed when shopofbow touched');

  // Negative evaluation test: userStopLatency > 100ms
  const slowStopContext = {
    ...healthyContext,
    userStopLatencyMs: 150,
  };
  const slowStopEvals = evaluator.evaluateAllCriteria(slowStopContext);
  const crit09 = slowStopEvals.find(e => e.criterionId === 'CRIT-1.4-09');
  testAssert(crit09?.status === 'FAILED', 'CRIT-1.4-09 failed when user stop latency > 100ms');

  // -------------------------------------------------------------
  // Section 5: Synchronous USER_STOP Supremacy Across Checkpoints
  // -------------------------------------------------------------
  console.log('>>> Section 5: Synchronous USER_STOP Supremacy');
  const stoppedGateOptions = {
    isUserStopActive: () => true,
    getUserStopReason: () => 'Emergency human stop override',
  };

  // Checkpoint 1: Assessment Intake
  assert.throws(() => {
    const stoppedGate = new Phase14ExecutionGate(stoppedGateOptions);
    stoppedGate.assertCheckpoint1_AssessmentIntake(dummyTenant);
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // Checkpoint 2: Chaos Scenario
  assert.throws(() => {
    const stoppedGate = new Phase14ExecutionGate(stoppedGateOptions);
    stoppedGate.assertCheckpoint2_ChaosScenario('scenario_test', dummyTenant);
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // Checkpoint 3: Criteria Evaluation
  assert.throws(() => {
    const stoppedGate = new Phase14ExecutionGate(stoppedGateOptions);
    stoppedGate.assertCheckpoint3_CriteriaEvaluation('CRIT-1.4-01', dummyTenant);
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // Checkpoint 4: Provenance Manifest Calculation
  assert.throws(() => {
    const stoppedGate = new Phase14ExecutionGate(stoppedGateOptions);
    stoppedGate.assertCheckpoint4_ProvenanceCalculation(dummyTenant);
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // Checkpoint 5: Report Sealing
  assert.throws(() => {
    const stoppedGate = new Phase14ExecutionGate(stoppedGateOptions);
    stoppedGate.assertCheckpoint5_ReportSealing('report_01', dummyTenant);
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // Checkpoint 6: Result Export
  assert.throws(() => {
    const stoppedGate = new Phase14ExecutionGate(stoppedGateOptions);
    stoppedGate.assertCheckpoint6_ResultExport('report_01', dummyTenant);
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // Runtime level USER_STOP abort
  await assert.rejects(async () => {
    await Phase14ReadinessRuntime.assessPhase14Readiness(
      { tenantId: dummyTenant },
      stoppedGateOptions
    );
  }, Phase14ReadinessAbortedError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 6: Full Readiness Assessment & Cryptographic Provenance
  // -------------------------------------------------------------
  console.log('>>> Section 6: Full Assessment & Cryptographic Provenance Chaining');
  const result = await Phase14ReadinessRuntime.assessPhase14Readiness({
    tenantId: dummyTenant,
  });

  testAssert(result.success === true, 'Readiness evaluation returned success === true');
  testAssert(result.report.overallStatus === 'READY_FOR_PHASE_EXIT', 'Overall status is READY_FOR_PHASE_EXIT');
  testAssert(result.report.criteriaPassedCount === 12, 'All 12 criteria passed');
  testAssert(result.report.passRatio === 1.0, 'Pass ratio is 1.0');
  testAssert(result.report.chaosScenarios.length === 6, 'All 6 chaos scenarios executed and handled');

  // Verify Provenance Manifest across MS-1.4.01 through MS-1.4.11
  const prov = result.report.provenanceManifest;
  testAssert(typeof prov.ms1401TaskLifecycleHash === 'string' && prov.ms1401TaskLifecycleHash.length === 64, 'MS-1.4.01 hash verified');
  testAssert(typeof prov.ms1402CognitiveHash === 'string' && prov.ms1402CognitiveHash.length === 64, 'MS-1.4.02 hash verified');
  testAssert(typeof prov.ms1403ContextHash === 'string' && prov.ms1403ContextHash.length === 64, 'MS-1.4.03 hash verified');
  testAssert(typeof prov.ms1404PlanningHash === 'string' && prov.ms1404PlanningHash.length === 64, 'MS-1.4.04 hash verified');
  testAssert(typeof prov.ms1405ActionProposalHash === 'string' && prov.ms1405ActionProposalHash.length === 64, 'MS-1.4.05 hash verified');
  testAssert(typeof prov.ms1406ToolAdapterHash === 'string' && prov.ms1406ToolAdapterHash.length === 64, 'MS-1.4.06 hash verified');
  testAssert(typeof prov.ms1407RealityVerificationHash === 'string' && prov.ms1407RealityVerificationHash.length === 64, 'MS-1.4.07 hash verified');
  testAssert(typeof prov.ms1408DurableCommitHash === 'string' && prov.ms1408DurableCommitHash.length === 64, 'MS-1.4.08 hash verified');
  testAssert(typeof prov.ms1409EpisodicMemoryHash === 'string' && prov.ms1409EpisodicMemoryHash.length === 64, 'MS-1.4.09 hash verified');
  testAssert(typeof prov.ms1410AgentLoopFacadeHash === 'string' && prov.ms1410AgentLoopFacadeHash.length === 64, 'MS-1.4.10 hash verified');
  testAssert(typeof prov.ms1411ObservabilityHash === 'string' && prov.ms1411ObservabilityHash.length === 64, 'MS-1.4.11 hash verified');
  testAssert(typeof prov.compositeManifestHash === 'string' && prov.compositeManifestHash.length === 64, 'Composite manifest hash verified');

  // -------------------------------------------------------------
  // Section 7: Deep Immutability of Sealed Report
  // -------------------------------------------------------------
  console.log('>>> Section 7: Deep Immutability of Sealed Report');
  testAssert(Object.isFrozen(result), 'Result object is frozen');
  testAssert(Object.isFrozen(result.report), 'Report object is frozen');
  testAssert(Object.isFrozen(result.report.criteriaEvaluations), 'Criteria evaluations array is frozen');
  testAssert(Object.isFrozen(result.report.chaosScenarios), 'Chaos scenarios array is frozen');
  testAssert(Object.isFrozen(result.report.provenanceManifest), 'Provenance manifest is frozen');

  for (const c of result.report.criteriaEvaluations) {
    testAssert(Object.isFrozen(c), `Criterion evaluation [${c.criterionId}] is frozen`);
    testAssert(Object.isFrozen(c.empiricalEvidence), `Criterion evidence [${c.criterionId}] is frozen`);
  }

  for (const cs of result.report.chaosScenarios) {
    testAssert(Object.isFrozen(cs), `Chaos scenario [${cs.scenarioId}] is frozen`);
  }

  // Mutability rejection
  assert.throws(() => {
    (result.report as any).overallStatus = 'NOT_READY';
  }, TypeError);
  passedAssertions++;

  assert.throws(() => {
    (result.report.criteriaEvaluations[0] as any).status = 'FAILED';
  }, TypeError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 8: Failure Containment (NOT_READY State)
  // -------------------------------------------------------------
  console.log('>>> Section 8: Failure Containment & NOT_READY State');
  const failResult = await Phase14ReadinessRuntime.assessPhase14Readiness({
    tenantId: 'tenant_incomplete',
    contextOverrides: {
      multiStepCompletionObserved: false, // Simulate failure
    },
  });

  testAssert(failResult.success === false, 'Readiness returns success === false when a criterion fails');
  testAssert(failResult.report.overallStatus === 'NOT_READY', 'Overall status is NOT_READY');
  testAssert(failResult.report.criteriaPassedCount === 11, 'Passed count is 11/12');
  testAssert(failResult.error?.code === 'NOT_READY', 'Error code is NOT_READY');

  // -------------------------------------------------------------
  // Section 9: Non-Authority Boundaries
  // -------------------------------------------------------------
  console.log('>>> Section 9: Non-Authority Boundaries');
  const runtime = new Phase14ReadinessRuntime();
  testAssert((runtime as any).executeTool === undefined, 'No executeTool on Phase14ReadinessRuntime');
  testAssert((runtime as any).authorizeAction === undefined, 'No authorizeAction on Phase14ReadinessRuntime');
  testAssert((runtime as any).evaluatePDP === undefined, 'No evaluatePDP on Phase14ReadinessRuntime');
  testAssert((runtime as any).commitDurable === undefined, 'No commitDurable on Phase14ReadinessRuntime');
  testAssert((runtime as any).modifyPolicy === undefined, 'No modifyPolicy on Phase14ReadinessRuntime');
  testAssert((runtime as any).mutateTask === undefined, 'No mutateTask on Phase14ReadinessRuntime');

  console.log('================================================================');
  console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions}`);
  console.log('ALL TESTS PASSED: MS-1.4.12 Readiness Engine fully verified!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
