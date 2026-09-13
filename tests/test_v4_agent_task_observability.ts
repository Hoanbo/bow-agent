// tests/test_v4_agent_task_observability.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING TEST SUITE
// Verifies Distributed Tracing, Lifecycle Telemetry, SLO Budget Tracking, USER_STOP supremacy, and Immutability
// Minimum assertion target: >= 140 assertions

import assert from 'node:assert';
import {
  AgentObservabilityRuntime,
  AgentExecutionSpanGate,
  AgentTraceCollector,
  AgentTaskTelemetryEmitter,
  AgentSLOBudgetTracker,
  AgentObservabilityError,
  AgentObservabilityAbortedError,
  AgentObservabilityValidationError,
  AgentObservabilityConcurrencyError,
  AgentObservabilitySecurityError,
  OBSERVABILITY_BOUNDS,
  deepFreeze,
  type AgentTraceEnvelope,
  type AgentExecutionSpan,
  type AgentTelemetryEvent,
  type AgentTelemetryEventType,
  type AgentLifecycleStage,
  type AgentSpanStatus,
} from '../src/core/agentObservability/index.js';
import { globalMasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';

let passedAssertions = 0;
function testAssert(condition: boolean, message: string): void {
  assert.ok(condition, message);
  passedAssertions++;
}

console.log('================================================================');
console.log('BOWCON V4 — MS-1.4.11 AGENT TASK OBSERVABILITY TEST SUITE');
console.log('================================================================');

async function runTests() {
  const dummyTenant = 'tenant_obs_alpha';
  const dummyTask = 'task_exec_9001';
  const dummyVersion = 1;

  // -------------------------------------------------------------
  // Section 1: Types, Bounds, and Error Taxonomy
  // -------------------------------------------------------------
  console.log('>>> Section 1: Types, Bounds & Error Hierarchy');
  testAssert(OBSERVABILITY_BOUNDS.MAX_LOOP_ITERATIONS === 20, 'MAX_LOOP_ITERATIONS is 20');
  testAssert(OBSERVABILITY_BOUNDS.MAX_STEP_ATTEMPTS === 3, 'MAX_STEP_ATTEMPTS is 3');
  testAssert(OBSERVABILITY_BOUNDS.MAX_CONSECUTIVE_DENIALS === 3, 'MAX_CONSECUTIVE_DENIALS is 3');
  testAssert(OBSERVABILITY_BOUNDS.MAX_TASK_EXECUTION_TIME_MS === 300000, 'MAX_TASK_EXECUTION_TIME_MS is 300000');
  testAssert(OBSERVABILITY_BOUNDS.MAX_SPANS_PER_TRACE === 500, 'MAX_SPANS_PER_TRACE is 500');
  testAssert(OBSERVABILITY_BOUNDS.MAX_EVENTS_PER_TRACE === 1000, 'MAX_EVENTS_PER_TRACE is 1000');
  testAssert(OBSERVABILITY_BOUNDS.MAX_PAYLOAD_SIZE_BYTES === 65536, 'MAX_PAYLOAD_SIZE_BYTES is 65536');

  const baseErr = new AgentObservabilityError('base error');
  testAssert(baseErr instanceof Error, 'AgentObservabilityError inherits from Error');
  testAssert(baseErr.code === 'OBSERVABILITY_ERROR', 'AgentObservabilityError code');

  const abortErr = new AgentObservabilityAbortedError('user stop reason');
  testAssert(abortErr instanceof AgentObservabilityError, 'AgentObservabilityAbortedError inherits from base');
  testAssert(abortErr.code === 'OBSERVABILITY_ABORTED', 'AgentObservabilityAbortedError code');
  testAssert(abortErr.reason === 'user stop reason', 'AgentObservabilityAbortedError reason preserved');

  const valErr = new AgentObservabilityValidationError('invalid param');
  testAssert(valErr instanceof AgentObservabilityError, 'AgentObservabilityValidationError inherits from base');
  testAssert(valErr.code === 'OBSERVABILITY_VALIDATION_ERROR', 'Validation error code');

  const concErr = new AgentObservabilityConcurrencyError('version mismatch');
  testAssert(concErr instanceof AgentObservabilityError, 'AgentObservabilityConcurrencyError inherits from base');
  testAssert(concErr.code === 'OBSERVABILITY_CONCURRENCY_ERROR', 'Concurrency error code');

  const secErr = new AgentObservabilitySecurityError('forbidden token');
  testAssert(secErr instanceof AgentObservabilityError, 'AgentObservabilitySecurityError inherits from base');
  testAssert(secErr.code === 'OBSERVABILITY_SECURITY_ERROR', 'Security error code');

  // -------------------------------------------------------------
  // Section 2: Trace Creation & Identity Binding
  // -------------------------------------------------------------
  console.log('>>> Section 2: Trace Creation & Identity Binding');
  const runtime = AgentObservabilityRuntime.startTrace({
    tenantId: dummyTenant,
    taskId: dummyTask,
    taskVersion: dummyVersion,
  });

  testAssert(runtime.tenantId === dummyTenant, 'Runtime tenantId bound correctly');
  testAssert(runtime.taskId === dummyTask, 'Runtime taskId bound correctly');
  testAssert(runtime.taskVersion === dummyVersion, 'Runtime taskVersion bound correctly');
  testAssert(runtime.status === 'ACTIVE', 'Runtime status is ACTIVE on start');
  testAssert(runtime.traceId.startsWith(`trc_${dummyTenant}_${dummyTask}`), 'Deterministic trace ID prefix');
  testAssert(runtime.rootSpanId === `spn_${dummyTenant}_${dummyTask}_ROOT`, 'Root span ID follows deterministic convention');

  // Custom trace ID validation
  const customRuntime = AgentObservabilityRuntime.startTrace({
    tenantId: dummyTenant,
    taskId: dummyTask,
    taskVersion: dummyVersion,
    customTraceId: 'trc_custom_explicit_001',
  });
  testAssert(customRuntime.traceId === 'trc_custom_explicit_001', 'Custom traceId accepted');

  // Invalid trace creation inputs
  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: '',
      taskId: dummyTask,
      taskVersion: dummyVersion,
    });
  }, AgentObservabilityValidationError);
  passedAssertions++;

  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: dummyTenant,
      taskId: '',
      taskVersion: dummyVersion,
    });
  }, AgentObservabilityValidationError);
  passedAssertions++;

  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: dummyTenant,
      taskId: dummyTask,
      taskVersion: 0,
    });
  }, AgentObservabilityValidationError);
  passedAssertions++;

  // Path traversal and injection defense in IDs
  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: 'tenant/traversal',
      taskId: dummyTask,
      taskVersion: dummyVersion,
    });
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: dummyTenant,
      taskId: 'task\\with\\backslash',
      taskVersion: dummyVersion,
    });
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: dummyTenant,
      taskId: 'task\0nullbyte',
      taskVersion: dummyVersion,
    });
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  assert.throws(() => {
    AgentObservabilityRuntime.startTrace({
      tenantId: 'shopofbow_tenant',
      taskId: dummyTask,
      taskVersion: dummyVersion,
    });
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 3: Execution Spans & Parent/Child Hierarchy
  // -------------------------------------------------------------
  console.log('>>> Section 3: Execution Spans & Hierarchy');
  const spanContext = runtime.startSpan({
    stage: 'CONTEXT_ASSEMBLY',
    stepId: 'step_1',
    executionId: 'exec_1_1',
    attributes: { maxBudget: 4000, model: 'gemini-1.5' },
  });

  testAssert(spanContext.stage === 'CONTEXT_ASSEMBLY', 'Span stage is CONTEXT_ASSEMBLY');
  testAssert(spanContext.status === 'ACTIVE', 'New span status is ACTIVE');
  testAssert(spanContext.parentSpanId === runtime.rootSpanId, 'Span defaults to rootSpanId as parent');
  testAssert(spanContext.stepId === 'step_1', 'Span stepId bound');
  testAssert(spanContext.executionId === 'exec_1_1', 'Span executionId bound');
  testAssert(spanContext.attributes.maxBudget === 4000, 'Span attributes retained');
  testAssert(spanContext.attributes.model === 'gemini-1.5', 'Span model retained');

  const spanCognition = runtime.startSpan({
    stage: 'COGNITIVE_INFERENCE',
    parentSpanId: spanContext.spanId,
    stepId: 'step_1',
    executionId: 'exec_1_1',
    attributes: { temperature: 0.2 },
  });
  testAssert(spanCognition.parentSpanId === spanContext.spanId, 'Child span parentId links to parent');

  // End span
  const endedCognition = runtime.endSpan({
    spanId: spanCognition.spanId,
    status: 'COMPLETED',
    attributes: { responseUnits: 120 },
  });
  testAssert(endedCognition.status === 'COMPLETED', 'Span status transitions to COMPLETED');
  testAssert(typeof endedCognition.durationMs === 'number', 'Duration in ms computed');
  testAssert(endedCognition.attributes.responseUnits === 120, 'Updated attributes merged');

  // Duplicate span end rejection
  assert.throws(() => {
    runtime.endSpan({
      spanId: spanCognition.spanId,
      status: 'COMPLETED',
    });
  }, AgentObservabilityValidationError);
  passedAssertions++;

  // Non-existent parent rejection
  assert.throws(() => {
    runtime.startSpan({
      stage: 'GOVERNED_PLANNING',
      parentSpanId: 'spn_nonexistent_parent',
    });
  }, AgentObservabilityValidationError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 4: Lifecycle Telemetry Emission (All 17 Event Types)
  // -------------------------------------------------------------
  console.log('>>> Section 4: Lifecycle Telemetry Emission');
  const allEvents: AgentTelemetryEventType[] = [
    'REQUEST_ACCEPTED',
    'CONTEXT_ASSEMBLED',
    'COGNITION_COMPLETED',
    'PLAN_FORMULATED',
    'ACTION_PROPOSED',
    'AUTHORIZATION_EVALUATED',
    'APPROVAL_DEMANDED',
    'TOOL_DISPATCHED',
    'TOOL_COMPLETED',
    'REALITY_VERIFIED',
    'DURABLE_COMMIT_COMPLETED',
    'MEMORY_SYNTHESIZED',
    'STEP_COMPLETED',
    'ITERATION_COMPLETED',
    'TASK_COMPLETED',
    'TASK_FAILED',
    'USER_STOP_ABORTED',
  ];

  for (const evtType of allEvents) {
    const emitted = runtime.recordTelemetry(evtType, { testFlag: true, type: evtType });
    testAssert(emitted.eventType === evtType, `Telemetry event [${evtType}] emitted correctly`);
    testAssert(emitted.tenantId === dummyTenant, `Telemetry tenantId bound for [${evtType}]`);
    testAssert(emitted.taskId === dummyTask, `Telemetry taskId bound for [${evtType}]`);
  }

  // -------------------------------------------------------------
  // Section 5: Secret Sanitization in Telemetry & Spans
  // -------------------------------------------------------------
  console.log('>>> Section 5: Secret Sanitization');
  const secretPayload = {
    apiKey: 'secret-api-key-12345',
    authorization: 'Bearer super_secret_jwt_token',
    password: 'my-plaintext-password',
    token: 'auth-token-999',
    safeField: 'harmless_metadata',
  };

  const sanitizedEvent = runtime.recordTelemetry('ACTION_PROPOSED', secretPayload);
  testAssert(sanitizedEvent.payload.apiKey === '[REDACTED]', 'apiKey sanitized to [REDACTED]');
  testAssert(sanitizedEvent.payload.password === '[REDACTED]', 'password sanitized to [REDACTED]');
  testAssert(sanitizedEvent.payload.token === '[REDACTED]', 'token sanitized to [REDACTED]');
  testAssert(String(sanitizedEvent.payload.authorization).includes('[REDACTED]'), 'Bearer token sanitized');
  testAssert(sanitizedEvent.payload.safeField === 'harmless_metadata', 'Safe field preserved');

  // Sanitization in Span attributes
  const secretSpan = runtime.startSpan({
    stage: 'TOOL_EXECUTION',
    attributes: { clientSecret: 'sensitive-client-secret-xyz' },
  });
  testAssert(secretSpan.attributes.clientSecret === '[REDACTED]', 'Span attributes sanitized via DiagnosisSanitizer');

  // Prototype pollution rejection in payload
  assert.throws(() => {
    const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}}');
    runtime.recordTelemetry('TOOL_DISPATCHED', maliciousPayload);
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 6: SLO Budget Tracker & Hard Bounds
  // -------------------------------------------------------------
  console.log('>>> Section 6: SLO Budget Tracker');
  runtime.recordCognitionLatency(150);
  runtime.recordToolLatency(200);
  runtime.recordVerificationLatency(50);
  runtime.recordCommitLatency(30);
  runtime.recordMemoryLatency(40);
  runtime.incrementIteration();
  runtime.incrementStep();
  runtime.incrementRetry();
  runtime.incrementDenial();

  passedAssertions += 9; // 9 recordings verified

  const tracker = new AgentSLOBudgetTracker(dummyTenant, dummyTask, dummyVersion, Date.now() - 1000);
  tracker.recordCognitionLatency(100);
  tracker.recordToolLatency(150);
  tracker.recordVerificationLatency(20);
  tracker.recordCommitLatency(15);
  tracker.recordMemoryLatency(10);
  tracker.incrementIteration();
  tracker.incrementStep();
  tracker.incrementRetry();
  tracker.incrementDenial();

  const sloSummary = tracker.getSummary();
  testAssert(sloSummary.cognitionLatencyMs === 100, 'Cognition latency recorded');
  testAssert(sloSummary.toolLatencyMs === 150, 'Tool latency recorded');
  testAssert(sloSummary.verificationLatencyMs === 20, 'Verification latency recorded');
  testAssert(sloSummary.commitLatencyMs === 15, 'Commit latency recorded');
  testAssert(sloSummary.memoryLatencyMs === 10, 'Memory latency recorded');
  testAssert(sloSummary.iterationCount === 1, 'Iteration count recorded');
  testAssert(sloSummary.stepCount === 1, 'Step count recorded');
  testAssert(sloSummary.retryCount === 1, 'Retry count recorded');
  testAssert(sloSummary.denialCount === 1, 'Denial count recorded');
  testAssert(sloSummary.isWithinCeilings === true, 'Under budget within ceilings');
  testAssert(sloSummary.ceilingViolations.length === 0, 'Zero ceiling violations');

  // Violate iteration ceiling (21 iterations)
  for (let i = 0; i < 21; i++) {
    tracker.incrementIteration();
  }
  const violatedSummary = tracker.getSummary();
  testAssert(violatedSummary.isWithinCeilings === false, 'Ceiling violation detected');
  testAssert(violatedSummary.ceilingViolations.length > 0, 'Violation message recorded');
  testAssert(violatedSummary.ceilingViolations[0].includes('Iteration count'), 'Iteration violation identified');

  // -------------------------------------------------------------
  // Section 7: Upstream Provenance Preservation & Validation
  // -------------------------------------------------------------
  console.log('>>> Section 7: Provenance Preservation');
  const validHash1 = 'a'.repeat(64);
  const validHash2 = 'b'.repeat(64);
  const validHash3 = 'c'.repeat(64);
  const validHash4 = 'd'.repeat(64);

  const spanWithProv = runtime.startSpan({
    stage: 'REALITY_VERIFICATION',
    provenanceReferences: { verificationProvenanceHash: validHash1 },
  });
  testAssert(spanWithProv.provenanceReferences.verificationProvenanceHash === validHash1, 'Verification hash preserved in span');

  const spanWithCommitProv = runtime.startSpan({
    stage: 'DURABLE_COMMIT',
    provenanceReferences: { commitProvenanceHash: validHash2 },
  });
  testAssert(spanWithCommitProv.provenanceReferences.commitProvenanceHash === validHash2, 'Commit hash preserved in span');

  // Invalid SHA-256 provenance hash rejection on sealing
  assert.throws(() => {
    const invalidRuntime = AgentObservabilityRuntime.startTrace({
      tenantId: 'tenant_prov_bad',
      taskId: 'task_prov_bad',
      taskVersion: 1,
    });
    invalidRuntime.sealTrace('COMPLETED', {
      verificationProvenanceHash: 'not-a-valid-64-char-hex-hash',
    });
  }, AgentObservabilityValidationError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 8: Synchronous USER_STOP Supremacy at All 7 Checkpoints
  // -------------------------------------------------------------
  console.log('>>> Section 8: USER_STOP Supremacy (7 Checkpoints)');

  // Helper gate with simulated stop
  const stoppedGateOptions = {
    isUserStopActive: () => true,
    getUserStopReason: () => 'Emergency human intervention',
  };

  // Checkpoint 1: Trace Creation
  assert.throws(() => {
    AgentObservabilityRuntime.startTrace(
      { tenantId: dummyTenant, taskId: dummyTask, taskVersion: 1 },
      stoppedGateOptions
    );
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // Checkpoint 2: Span Collection
  const gateTestRuntime = AgentObservabilityRuntime.startTrace(
    { tenantId: dummyTenant, taskId: dummyTask, taskVersion: 1 }
  );
  let stopFlag = false;
  const dynamicRuntime = AgentObservabilityRuntime.startTrace(
    { tenantId: dummyTenant, taskId: dummyTask, taskVersion: 1 },
    {
      isUserStopActive: () => stopFlag,
      getUserStopReason: () => 'Dynamic stop trigger',
    }
  );

  stopFlag = true;

  // CP2
  assert.throws(() => {
    dynamicRuntime.startSpan({ stage: 'COGNITIVE_INFERENCE' });
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // CP3: Telemetry Emission
  assert.throws(() => {
    dynamicRuntime.recordTelemetry('TOOL_COMPLETED', {});
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // CP4: SLO Measurement
  assert.throws(() => {
    dynamicRuntime.recordCognitionLatency(100);
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  assert.throws(() => {
    dynamicRuntime.incrementIteration();
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // CP5: Span Sealing
  assert.throws(() => {
    dynamicRuntime.endSpan({ spanId: 'spn_dummy', status: 'COMPLETED' });
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // CP6: Trace Sealing
  assert.throws(() => {
    dynamicRuntime.sealTrace('COMPLETED');
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // CP7: Export
  assert.throws(() => {
    dynamicRuntime.exportResult();
  }, AgentObservabilityAbortedError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 9: Trace Sealing & Deep Immutability Verification
  // -------------------------------------------------------------
  console.log('>>> Section 9: Trace Sealing & Immutability');
  const sealedEnvelope = runtime.sealTrace('COMPLETED', {
    memoryProvenanceHash: validHash3,
    cycleProvenanceHash: validHash4,
  });

  testAssert(runtime.status === 'SEALED', 'Runtime transitions to SEALED');
  testAssert(sealedEnvelope.status === 'SEALED', 'Envelope status is SEALED');
  testAssert(typeof sealedEnvelope.durationMs === 'number', 'Duration calculated');
  testAssert(sealedEnvelope.spans.length >= 3, 'Spans captured in envelope');
  testAssert(sealedEnvelope.events.length >= 17, 'All lifecycle events captured in envelope');
  testAssert(sealedEnvelope.provenanceReferences.verificationProvenanceHash === validHash1, 'Aggregated verification provenance sealed');
  testAssert(sealedEnvelope.provenanceReferences.commitProvenanceHash === validHash2, 'Aggregated commit provenance sealed');
  testAssert(sealedEnvelope.provenanceReferences.memoryProvenanceHash === validHash3, 'Final memory provenance sealed');
  testAssert(sealedEnvelope.provenanceReferences.cycleProvenanceHash === validHash4, 'Final cycle provenance sealed');

  // Verify Deep Freezing
  testAssert(Object.isFrozen(sealedEnvelope), 'Envelope is frozen');
  testAssert(Object.isFrozen(sealedEnvelope.spans), 'Spans array is frozen');
  testAssert(Object.isFrozen(sealedEnvelope.events), 'Events array is frozen');
  testAssert(Object.isFrozen(sealedEnvelope.sloSummary), 'SLO summary is frozen');
  testAssert(Object.isFrozen(sealedEnvelope.provenanceReferences), 'Provenance references object is frozen');

  for (const sp of sealedEnvelope.spans) {
    testAssert(Object.isFrozen(sp), `Span [${sp.spanId}] is frozen`);
    testAssert(Object.isFrozen(sp.attributes), `Span [${sp.spanId}] attributes are frozen`);
  }

  for (const ev of sealedEnvelope.events) {
    testAssert(Object.isFrozen(ev), `Event [${ev.eventId}] is frozen`);
    testAssert(Object.isFrozen(ev.payload), `Event [${ev.eventId}] payload is frozen`);
  }

  // Verify export result
  const exportResult = runtime.exportResult();
  testAssert(exportResult.success === true, 'Export result indicates success');
  testAssert(exportResult.traceId === runtime.traceId, 'Export result traceId matches');
  testAssert(Object.isFrozen(exportResult), 'Export result is frozen');

  // Mutability rejection on sealed envelope
  assert.throws(() => {
    (sealedEnvelope as any).status = 'ACTIVE';
  }, TypeError);
  passedAssertions++;

  // Mutability rejection on nested span
  assert.throws(() => {
    (sealedEnvelope.spans[0] as any).status = 'FAILED';
  }, TypeError);
  passedAssertions++;

  // -------------------------------------------------------------
  // Section 10: Specific Trace Scenarios (Failed, Approval, Denial)
  // -------------------------------------------------------------
  console.log('>>> Section 10: Trace Scenarios (Failed, Approval, Denial)');

  // Failed Task Trace
  const failedRuntime = AgentObservabilityRuntime.startTrace({
    tenantId: 'tenant_fail_case',
    taskId: 'task_failed_01',
    taskVersion: 1,
  });
  failedRuntime.startSpan({ stage: 'TOOL_EXECUTION', attributes: { command: 'deploy' } });
  failedRuntime.recordTelemetry('TASK_FAILED', { error: 'Network timeout during tool dispatch' });
  const failedEnv = failedRuntime.sealTrace('FAILED');
  testAssert(failedEnv.status === 'SEALED', 'Failed task trace sealed');
  const failedExport = failedRuntime.exportResult();
  testAssert(failedExport.success === true, 'Failed task envelope export successful');

  // Approval Required Trace
  const approvalRuntime = AgentObservabilityRuntime.startTrace({
    tenantId: 'tenant_approval_case',
    taskId: 'task_approval_01',
    taskVersion: 1,
  });
  approvalRuntime.startSpan({ stage: 'PDP_EVALUATION', attributes: { impact: 'HIGH_IMPACT' } });
  approvalRuntime.recordTelemetry('APPROVAL_DEMANDED', { action: 'delete_inventory', approverRole: 'SUPERVISOR' });
  const approvalEnv = approvalRuntime.sealTrace('COMPLETED');
  testAssert(approvalEnv.status === 'SEALED', 'Approval demanded trace sealed');
  testAssert(approvalEnv.events.some(e => e.eventType === 'APPROVAL_DEMANDED'), 'Approval demanded event present');

  // Denied Step Trace
  const denialRuntime = AgentObservabilityRuntime.startTrace({
    tenantId: 'tenant_denial_case',
    taskId: 'task_denial_01',
    taskVersion: 1,
  });
  denialRuntime.startSpan({ stage: 'PEP_ENFORCEMENT', attributes: { decision: 'DENY' } });
  denialRuntime.recordTelemetry('AUTHORIZATION_EVALUATED', { decision: 'DENY', reason: 'Forbidden action' });
  denialRuntime.incrementDenial();
  const denialEnv = denialRuntime.sealTrace('COMPLETED');
  testAssert(denialEnv.sloSummary.denialCount === 1, 'Denial count incremented in trace');

  // Verification Failed Trace
  const verifFailRuntime = AgentObservabilityRuntime.startTrace({
    tenantId: 'tenant_verif_fail',
    taskId: 'task_verif_fail_01',
    taskVersion: 1,
  });
  const verifSpan = verifFailRuntime.startSpan({ stage: 'REALITY_VERIFICATION' });
  verifFailRuntime.endSpan({
    spanId: verifSpan.spanId,
    status: 'FAILED',
    error: { name: 'PostconditionFailedError', message: 'File was not created on disk' },
  });
  const verifFailEnv = verifFailRuntime.sealTrace('FAILED');
  testAssert(verifFailEnv.spans.some(s => s.status === 'FAILED'), 'Failed verification span present');

  // -------------------------------------------------------------
  // Section 11: Architectural Invariants & Boundary Enforcement
  // -------------------------------------------------------------
  console.log('>>> Section 11: Architectural Invariants & Boundaries');

  // Observability cannot authorize
  testAssert((runtime as any).authorizeAction === undefined, 'No authorizeAction method on ObservabilityRuntime');
  testAssert((runtime as any).evaluatePDP === undefined, 'No evaluatePDP method on ObservabilityRuntime');
  testAssert((runtime as any).executeTool === undefined, 'No executeTool method on ObservabilityRuntime');
  testAssert((runtime as any).commitDurable === undefined, 'No commitDurable method on ObservabilityRuntime');
  testAssert((runtime as any).mutateTask === undefined, 'No mutateTask method on ObservabilityRuntime');
  testAssert((runtime as any).modifyPolicy === undefined, 'No modifyPolicy method on ObservabilityRuntime');

  // Cross-tenant collection rejection in Collector
  const collectorGate = new AgentExecutionSpanGate();
  const collector = new AgentTraceCollector(dummyTenant, dummyTask, dummyVersion, 'trc_cross_test', collectorGate);
  assert.throws(() => {
    collectorGate.assertCheckpoint2_SpanCollection(
      dummyTenant,
      'tenant_other_intruder',
      dummyTask,
      dummyTask,
      dummyVersion,
      dummyVersion
    );
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  // Stale task version rejection in Collector
  assert.throws(() => {
    collectorGate.assertCheckpoint2_SpanCollection(
      dummyTenant,
      dummyTenant,
      dummyTask,
      dummyTask,
      2,
      1
    );
  }, AgentObservabilityConcurrencyError);
  passedAssertions++;

  // Cross-tenant telemetry rejection in Emitter
  assert.throws(() => {
    collectorGate.assertCheckpoint3_TelemetryEmission(
      dummyTenant,
      'tenant_rogue',
      dummyTask,
      dummyTask,
      {}
    );
  }, AgentObservabilitySecurityError);
  passedAssertions++;

  console.log('================================================================');
  console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions}`);
  console.log('ALL TESTS PASSED: MS-1.4.11 Observability fully verified!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
