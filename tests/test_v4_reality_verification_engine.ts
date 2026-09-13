// tests/test_v4_reality_verification_engine.ts
// BOWCON V4.0 — MS-1.4.07: DEDICATED REALITY TEST SUITE
//
// EN:
// Tests the Empirical Reality Verification Engine under all operational conditions:
// Valid execution verification, postcondition mismatch, missing evidence,
// eventual consistency, contradictory evidence, stale evidence, stale task version,
// tenant isolation, execution binding, malformed input rejection, prototype pollution,
// null-byte attacks, oversized evidence, secret scrubbing, adapter TIMED_OUT handling,
// 4 synchronous USER_STOP checkpoints, cryptographic provenance determinism and tampering,
// audit trail completeness and sanitization, zero tool execution, zero task mutation,
// and zero authorization.
//
// VI:
// Kiểm thử Động cơ Xác minh Thực tế Thực nghiệm dưới mọi điều kiện vận hành.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  RealityVerificationRuntime,
  RealityEvidenceCollector,
  PostconditionVerificationOracle,
  VerificationExecutionGate,
  REALITY_VERIFICATION_BOUNDS,
  REALITY_VERIFICATION_VERSION,
  REALITY_VERIFICATION_AUDIT_DOMAIN,
  VerificationAbortedError,
  VerificationValidationError,
  CrossTenantVerificationError,
  StaleTaskVerificationError,
  ContradictoryEvidenceError,
  VerificationSecurityViolationError,
  type RealityVerificationRequest,
  type RealityEvidence,
  type RealityVerificationResult,
} from '../src/core/realityVerification/index.js';
import type { ToolAdapterResult } from '../src/core/toolAdapter/toolAdapterTypes.js';
import type { AgentTask } from '../src/core/taskLifecycle/agentTaskTypes.js';
import type { Postcondition } from '../src/core/verification/postconditionTypes.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

let passedAssertions = 0;
function testAssert(condition: boolean, message: string) {
  assert(condition, message);
  passedAssertions++;
}

async function runRealityTests() {
  console.log('Starting MS-1.4.07 Reality Test Suite: Empirical Reality Verification Engine...\n');

  const testDataDir = path.resolve(process.cwd(), 'data', 'test_ms_1_4_07_' + Date.now());
  fs.mkdirSync(testDataDir, { recursive: true });

  const auditPath = path.join(testDataDir, 'test_reality_audit.jsonl');
  const auditLedger = new AuditLedger(auditPath);
  const sanitizer = new DiagnosisSanitizer();

  // Helper to create a valid base ToolAdapterResult
  function createValidAdapterResult(overrides?: Partial<ToolAdapterResult>): ToolAdapterResult {
    const execHash = crypto.randomBytes(32).toString('hex');
    const result: ToolAdapterResult = {
      executionId: 'exec_test_' + crypto.randomBytes(4).toString('hex'),
      taskId: 'task_alpha_01',
      tenantId: 'tenant_bow_01',
      stepId: 'step_order_01',
      toolName: 'shop_update_order_status',
      status: 'SUCCESS',
      sanitizedOutput: { orderId: 'ord_12345', newStatus: 'FULFILLED', updatedCount: 1 },
      executionProvenanceHash: execHash,
      executedAt: new Date().toISOString(),
      durationMs: 42,
      externalUntrusted: true,
      ...overrides,
    };
    return Object.freeze(result);
  }

  // Helper to create an authoritative task
  function createAuthoritativeTask(overrides?: Partial<AgentTask>): AgentTask {
    const task: AgentTask = {
      taskId: 'task_alpha_01',
      tenantId: 'tenant_bow_01',
      userId: 'user_boss_01',
      title: 'Fulfill customer order',
      prompt: 'Check order status and fulfill',
      state: 'EXECUTING',
      version: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenanceChainHash: 'prov_task_' + crypto.randomBytes(16).toString('hex'),
      ...overrides,
    };
    return Object.freeze(task);
  }

  // Helper to create valid reality evidence
  function createValidEvidence(overrides?: Partial<RealityEvidence>): RealityEvidence {
    const now = new Date().toISOString();
    const item: RealityEvidence = {
      evidenceId: 'ev_' + crypto.randomBytes(6).toString('hex'),
      source: 'READ_AFTER_WRITE',
      path: 'order.status',
      observedValue: 'FULFILLED',
      expectedValue: 'FULFILLED',
      matched: true,
      timestamp: now,
      confidence: 0.98,
      tenantId: 'tenant_bow_01',
      taskId: 'task_alpha_01',
      executionId: 'exec_test_01',
      evidenceHash: crypto.randomBytes(32).toString('hex'),
      ...overrides,
    };
    return Object.freeze(item);
  }

  try {
    // =========================================================================
    // SECTION 1: Constants, Bounds, and Error Hierarchy
    // =========================================================================
    console.log('--- Section 1: Types, Bounds, and Error Hierarchy ---');
    testAssert(REALITY_VERIFICATION_VERSION === '4.0.0', 'Version is 4.0.0');
    testAssert(REALITY_VERIFICATION_AUDIT_DOMAIN === 'agent_reality_verification', 'Audit domain correct');
    testAssert(REALITY_VERIFICATION_BOUNDS.MAX_PAYLOAD_BYTES === 65536, 'Max payload is 64KB');
    testAssert(REALITY_VERIFICATION_BOUNDS.MAX_DEPTH === 10, 'Max depth is 10');
    testAssert(REALITY_VERIFICATION_BOUNDS.DEFAULT_MAX_AGE_MS === 60000, 'Default TTL is 60s');

    // Error hierarchy checks
    const abortErr = new VerificationAbortedError('Aborted by user', { checkpoint: 'GATE_1' });
    testAssert(abortErr.code === 'VERIFICATION_ABORTED', 'Abort error code correct');
    testAssert(abortErr.details?.checkpoint === 'GATE_1', 'Abort error details preserved');

    const validErr = new VerificationValidationError('Validation failed');
    testAssert(validErr.code === 'VERIFICATION_VALIDATION_ERROR', 'Validation error code correct');

    const tenantErr = new CrossTenantVerificationError('Tenant mismatch');
    testAssert(tenantErr.code === 'CROSS_TENANT_VERIFICATION_ERROR', 'Tenant error code correct');

    const staleErr = new StaleTaskVerificationError('Stale version');
    testAssert(staleErr.code === 'STALE_TASK_VERIFICATION_ERROR', 'Stale error code correct');

    const contraErr = new ContradictoryEvidenceError('Contradictory evidence');
    testAssert(contraErr.code === 'CONTRADICTORY_EVIDENCE_ERROR', 'Contradictory error code correct');

    const secErr = new VerificationSecurityViolationError('Security violation');
    testAssert(secErr.code === 'VERIFICATION_SECURITY_VIOLATION', 'Security error code correct');

    // =========================================================================
    // SECTION 2: RealityEvidenceCollector Validation & Sanitization
    // =========================================================================
    console.log('--- Section 2: RealityEvidenceCollector Validation & Sanitization ---');
    const collector = new RealityEvidenceCollector({ sanitizer });

    // 2.1 Extract from ToolAdapterResult
    const baseAdapterRes = createValidAdapterResult();
    const collectedFromAdapter = collector.collectEvidence(baseAdapterRes);
    testAssert(collectedFromAdapter.length >= 1, 'Collector extracts evidence from adapter result');
    testAssert(collectedFromAdapter[0].source === 'ADAPTER_OBSERVATION', 'Evidence source is ADAPTER_OBSERVATION');
    testAssert(collectedFromAdapter[0].tenantId === baseAdapterRes.tenantId, 'TenantId correctly bound');
    testAssert(collectedFromAdapter[0].taskId === baseAdapterRes.taskId, 'TaskId correctly bound');
    testAssert(collectedFromAdapter[0].executionId === baseAdapterRes.executionId, 'ExecutionId correctly bound');
    testAssert(typeof collectedFromAdapter[0].evidenceHash === 'string', 'Evidence hash computed');

    // 2.2 Consume external read-after-write evidence
    const readAfterWriteEv = createValidEvidence({
      source: 'READ_AFTER_WRITE',
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
    });
    const combinedCollected = collector.collectEvidence(baseAdapterRes, [readAfterWriteEv]);
    testAssert(
      combinedCollected.some(e => e.source === 'ADAPTER_OBSERVATION') &&
      combinedCollected.some(e => e.source === 'READ_AFTER_WRITE'),
      'Both adapter observation and external evidence collected'
    );

    // 2.3 Prototype pollution rejection
    const protoPollutionPayloads = [
      { '__proto__': { admin: true } },
      { 'constructor': { prototype: { hacked: true } } },
      { 'prototype': { poll: true } },
    ];
    for (const badPayload of protoPollutionPayloads) {
      assert.throws(() => {
        collector.collectEvidence(createValidAdapterResult({ sanitizedOutput: badPayload }));
      }, VerificationSecurityViolationError);
      testAssert(true, 'Rejects prototype pollution in adapter output');
    }

    // 2.4 Null-byte injection rejection
    const nullBytePayload = { key: 'safe\0malicious' };
    assert.throws(() => {
      collector.collectEvidence(createValidAdapterResult({ sanitizedOutput: nullBytePayload }));
    }, VerificationSecurityViolationError);
    testAssert(true, 'Rejects null-byte injection');

    // 2.5 Oversized payload rejection (> 64KB)
    const giantPayload = { data: 'A'.repeat(70000) };
    assert.throws(() => {
      collector.collectEvidence(createValidAdapterResult({ sanitizedOutput: giantPayload }));
    }, VerificationSecurityViolationError);
    testAssert(true, 'Rejects oversized evidence payload');

    // 2.6 Excessive nesting depth rejection (> 10 levels)
    let deeplyNested: any = { leaf: 'deep' };
    for (let i = 0; i < 12; i++) {
      deeplyNested = { nest: deeplyNested };
    }
    assert.throws(() => {
      collector.collectEvidence(createValidAdapterResult({ sanitizedOutput: deeplyNested }));
    }, VerificationSecurityViolationError);
    testAssert(true, 'Rejects excessively nested payload');

    // 2.7 Secret scrubbing in evidence
    const payloadWithSecret = {
      orderId: 'ord_99',
      apiKey: 'sk-live-secret-key-1234567890',
      password: 'SuperSecretPassword123!',
      nested: { token: 'bearer-tok-abc-xyz' },
    };
    const sanitizedEv = collector.collectEvidence(createValidAdapterResult({ sanitizedOutput: payloadWithSecret }));
    const observedStr = JSON.stringify(sanitizedEv[0].observedValue);
    testAssert(!observedStr.includes('sk-live-secret-key-1234567890'), 'API key scrubbed from evidence');
    testAssert(!observedStr.includes('SuperSecretPassword123!'), 'Password scrubbed from evidence');
    testAssert(!observedStr.includes('bearer-tok-abc-xyz'), 'Bearer token scrubbed from evidence');

    // 2.8 Freshness TTL check
    const staleEv = createValidEvidence({
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
      timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes old (max 60s)
    });
    assert.throws(() => {
      collector.collectEvidence(baseAdapterRes, [staleEv]);
    }, VerificationValidationError);
    testAssert(true, 'Rejects stale evidence older than TTL');

    // 2.9 Confidence normalization bounds (0 <= confidence <= 1)
    const invalidConfidenceEv1 = createValidEvidence({
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
      confidence: 1.5,
    });
    assert.throws(() => {
      collector.collectEvidence(baseAdapterRes, [invalidConfidenceEv1]);
    }, VerificationValidationError);
    testAssert(true, 'Rejects confidence > 1.0');

    const invalidConfidenceEv2 = createValidEvidence({
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
      confidence: -0.1,
    });
    assert.throws(() => {
      collector.collectEvidence(baseAdapterRes, [invalidConfidenceEv2]);
    }, VerificationValidationError);
    testAssert(true, 'Rejects confidence < 0.0');

    // 2.10 Evidence replay defense
    const freshCollector = new RealityEvidenceCollector();
    const replayEv = createValidEvidence({
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
    });
    freshCollector.collectEvidence(baseAdapterRes, [replayEv]);
    assert.throws(() => {
      // Replaying the exact same external evidence with identical hash
      freshCollector.collectEvidence(baseAdapterRes, [replayEv]);
    }, VerificationValidationError);
    testAssert(true, 'Rejects replayed external evidence with duplicate hash');

    // 2.11 Contradictory evidence detection
    const conflictingEv1 = createValidEvidence({
      path: 'order.status',
      observedValue: 'COMPLETED',
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
    });
    const conflictingEv2 = createValidEvidence({
      path: 'order.status',
      observedValue: 'CANCELLED',
      taskId: baseAdapterRes.taskId,
      tenantId: baseAdapterRes.tenantId,
      executionId: baseAdapterRes.executionId,
    });
    assert.throws(() => {
      new RealityEvidenceCollector().collectEvidence(baseAdapterRes, [conflictingEv1, conflictingEv2]);
    }, ContradictoryEvidenceError);
    testAssert(true, 'Detects contradictory evidence on identical path with conflicting values');

    // =========================================================================
    // SECTION 3: PostconditionVerificationOracle Deterministic Evaluation
    // =========================================================================
    console.log('--- Section 3: PostconditionVerificationOracle Deterministic Evaluation ---');
    const oracle = new PostconditionVerificationOracle();

    // 3.1 All required postconditions pass -> VERIFIED
    const postconditionsPass: Postcondition[] = [
      {
        id: 'post_1',
        description: 'Order status must equal FULFILLED',
        target: 'order.status',
        predicate: 'EQUALS',
        expected: 'FULFILLED',
        priority: 'CRITICAL',
        required: true,
      },
      {
        id: 'post_2',
        description: 'Updated count must be positive',
        target: 'updatedCount',
        predicate: 'GREATER_THAN',
        expected: 0,
        priority: 'HIGH',
        required: true,
      },
    ];
    const passEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'order.status', observedValue: 'FULFILLED', matched: true }),
      createValidEvidence({ path: 'updatedCount', observedValue: 1, matched: true }),
    ];
    const oraclePass = oracle.evaluateInvariants({
      postconditions: postconditionsPass,
      evidence: passEvidence,
      executionSucceeded: true,
    });
    testAssert(oraclePass.status === 'VERIFIED', 'All required invariants pass -> VERIFIED');
    testAssert(oraclePass.summary.allRequiredPassed === true, 'allRequiredPassed is true');
    testAssert(oraclePass.summary.passedCount === 2, 'Passed count is 2');
    testAssert(oraclePass.summary.failedCount === 0, 'Failed count is 0');
    testAssert(oraclePass.recommendation === 'NONE', 'Recommendation is NONE on VERIFIED');

    // 3.2 Required postcondition fails -> NOT_VERIFIED
    const postconditionsFail: Postcondition[] = [
      {
        id: 'post_fail',
        description: 'Order status must equal FULFILLED',
        target: 'order.status',
        predicate: 'EQUALS',
        expected: 'FULFILLED',
        priority: 'CRITICAL',
        required: true,
      },
    ];
    const failEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'order.status', observedValue: 'PENDING', matched: false }),
    ];
    const oracleFail = oracle.evaluateInvariants({
      postconditions: postconditionsFail,
      evidence: failEvidence,
      executionSucceeded: true,
    });
    testAssert(oracleFail.status === 'NOT_VERIFIED', 'Required invariant failure -> NOT_VERIFIED');
    testAssert(oracleFail.summary.failedCount === 1, 'Failed count is 1');
    testAssert(oracleFail.failure !== undefined, 'Failure object is present');
    testAssert(oracleFail.recommendation === 'MANUAL_INSPECTION', 'Critical failure recommends MANUAL_INSPECTION');

    // 3.3 Missing required evidence -> UNKNOWN
    const oracleMissing = oracle.evaluateInvariants({
      postconditions: postconditionsPass,
      evidence: [], // zero evidence provided
      executionSucceeded: true,
    });
    testAssert(oracleMissing.status === 'UNKNOWN', 'Missing evidence for required postconditions -> UNKNOWN');
    testAssert(oracleMissing.summary.unknownCount === 2, 'Unknown count is 2');
    testAssert(oracleMissing.recommendation === 'CLARIFICATION_REQUIRED', 'Missing evidence recommends CLARIFICATION_REQUIRED');

    // 3.4 Optional LOW priority postcondition failure -> NOT_VERIFIED (per spec 3.5: no partial success)
    const postconditionsPartial: Postcondition[] = [
      {
        id: 'post_req',
        description: 'Order fulfilled',
        target: 'order.status',
        predicate: 'EQUALS',
        expected: 'FULFILLED',
        priority: 'CRITICAL',
        required: true,
      },
      {
        id: 'post_opt',
        description: 'Telemetry log recorded',
        target: 'telemetry.logged',
        predicate: 'EQUALS',
        expected: true,
        priority: 'LOW',
        required: false,
      },
    ];
    const partialEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'order.status', observedValue: 'FULFILLED', matched: true }),
      createValidEvidence({ path: 'telemetry.logged', observedValue: false, matched: false }),
    ];
    const oraclePartial = oracle.evaluateInvariants({
      postconditions: postconditionsPartial,
      evidence: partialEvidence,
      executionSucceeded: true,
    });
    testAssert(oraclePartial.status === 'NOT_VERIFIED', 'Optional LOW invariant failure -> NOT_VERIFIED (no partial success)');
    testAssert(oraclePartial.summary.failedCount === 1, 'Summary reflects 1 failure');
    testAssert(oraclePartial.recommendation === 'RETRY_RECOMMENDED', 'Low priority non-critical failure recommends RETRY_RECOMMENDED');

    // 3.5 Predicate safety (zero dynamic code / eval)
    const safePredicates: Postcondition[] = [
      { id: 'p_ex', description: 'check exists', target: 'order.status', predicate: 'EXISTS', priority: 'HIGH', required: true },
      { id: 'p_ne', description: 'check not equals', target: 'order.status', predicate: 'NOT_EQUALS', expected: 'CANCELLED', priority: 'HIGH', required: true },
    ];
    const oracleSafe = oracle.evaluateInvariants({
      postconditions: safePredicates,
      evidence: passEvidence,
      executionSucceeded: true,
    });
    testAssert(oracleSafe.status === 'VERIFIED', 'Safe predicates evaluated without dynamic eval');

    // 3.6 Adapter executionSucceeded === false fails closed immediately
    const oracleExecFailed = oracle.evaluateInvariants({
      postconditions: postconditionsPass,
      evidence: passEvidence,
      executionSucceeded: false,
    });
    testAssert(oracleExecFailed.status === 'NOT_VERIFIED', 'Execution failure forces NOT_VERIFIED');
    testAssert(oracleExecFailed.recommendation === 'MANUAL_INSPECTION', 'Recommends MANUAL_INSPECTION');

    // =========================================================================
    // SECTION 4: VerificationExecutionGate 4 Synchronous Checkpoints
    // =========================================================================
    console.log('--- Section 4: VerificationExecutionGate 4 USER_STOP Checkpoints ---');

    let simulatedUserStop = false;
    let simulatedReason: string | undefined = undefined;
    const gate = new VerificationExecutionGate({
      isUserStopActive: () => simulatedUserStop,
      getUserStopReason: () => simulatedReason,
    });

    // 4.0 Gate passes when USER_STOP inactive
    simulatedUserStop = false;
    assert.doesNotThrow(() => {
      gate.assertVerificationPermitted('GATE_1_BEFORE_REQUEST_ACCEPTANCE');
      gate.assertVerificationPermitted('GATE_2_BEFORE_EVIDENCE_COLLECTION');
      gate.assertVerificationPermitted('GATE_3_BEFORE_ORACLE_EVALUATION');
      gate.assertVerificationPermitted('GATE_4_BEFORE_RESULT_EMISSION');
    }, 'All 4 checkpoints pass when USER_STOP is false');

    // 4.1 Gate 1 checkpoint aborts
    simulatedUserStop = true;
    simulatedReason = 'Halt order processing emergency';
    try {
      gate.assertVerificationPermitted('GATE_1_BEFORE_REQUEST_ACCEPTANCE');
      testAssert(false, 'Gate 1 should have thrown');
    } catch (e: any) {
      testAssert(e instanceof VerificationAbortedError, 'Gate 1 throws VerificationAbortedError');
      testAssert(e.details?.checkpoint === 'GATE_1_BEFORE_REQUEST_ACCEPTANCE', 'Gate 1 checkpoint recorded in error');
    }

    // 4.2 Gate 2 checkpoint aborts
    try {
      gate.assertVerificationPermitted('GATE_2_BEFORE_EVIDENCE_COLLECTION');
      testAssert(false, 'Gate 2 should have thrown');
    } catch (e: any) {
      testAssert(e instanceof VerificationAbortedError, 'Gate 2 throws VerificationAbortedError');
      testAssert(e.details?.checkpoint === 'GATE_2_BEFORE_EVIDENCE_COLLECTION', 'Gate 2 checkpoint recorded in error');
    }

    // 4.3 Gate 3 checkpoint aborts
    try {
      gate.assertVerificationPermitted('GATE_3_BEFORE_ORACLE_EVALUATION');
      testAssert(false, 'Gate 3 should have thrown');
    } catch (e: any) {
      testAssert(e instanceof VerificationAbortedError, 'Gate 3 throws VerificationAbortedError');
      testAssert(e.details?.checkpoint === 'GATE_3_BEFORE_ORACLE_EVALUATION', 'Gate 3 checkpoint recorded in error');
    }

    // 4.4 Gate 4 checkpoint aborts
    try {
      gate.assertVerificationPermitted('GATE_4_BEFORE_RESULT_EMISSION');
      testAssert(false, 'Gate 4 should have thrown');
    } catch (e: any) {
      testAssert(e instanceof VerificationAbortedError, 'Gate 4 throws VerificationAbortedError');
      testAssert(e.details?.checkpoint === 'GATE_4_BEFORE_RESULT_EMISSION', 'Gate 4 checkpoint recorded in error');
    }

    // =========================================================================
    // SECTION 5: RealityVerificationRuntime Master Pipeline & Invariants
    // =========================================================================
    console.log('--- Section 5: RealityVerificationRuntime Pipeline & Invariants ---');

    let runtimeUserStop = false;
    let runtimeUserStopReason: string | undefined = undefined;
    const testGate = new VerificationExecutionGate({
      isUserStopActive: () => runtimeUserStop,
      getUserStopReason: () => runtimeUserStopReason,
    });

    const runtime = new RealityVerificationRuntime({
      collector,
      oracle,
      gate: testGate,
      auditLedger,
      sanitizer,
    });

    // 5.1 Valid execution + valid evidence -> VERIFIED
    const validTask = createAuthoritativeTask({ version: 5 });
    const validAdapter = createValidAdapterResult({ taskId: validTask.taskId, tenantId: validTask.tenantId });
    const validRawEv = createValidEvidence({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      executionId: validAdapter.executionId,
      path: 'order.status',
      observedValue: 'FULFILLED',
      matched: true,
    });

    const verifyReq: RealityVerificationRequest = {
      executionResult: validAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      postconditions: [
        {
          id: 'post_status',
          description: 'order status fulfilled',
          target: 'order.status',
          predicate: 'EQUALS',
          expected: 'FULFILLED',
          priority: 'CRITICAL',
          required: true,
        },
      ],
      externalEvidence: [validRawEv],
    };

    const verifyResult = await runtime.verifyReality(verifyReq);
    testAssert(verifyResult.status === 'VERIFIED', 'Valid execution + matching evidence -> VERIFIED');
    testAssert(verifyResult.taskId === validTask.taskId, 'Result taskId bound');
    testAssert(verifyResult.tenantId === validTask.tenantId, 'Result tenantId bound');
    testAssert(verifyResult.executionId === validAdapter.executionId, 'Result executionId bound');
    testAssert(verifyResult.stepId === validAdapter.stepId, 'Result stepId bound');
    testAssert(verifyResult.toolName === validAdapter.toolName, 'Result toolName bound');
    testAssert(verifyResult.confidence >= 0.9, 'High confidence on verified');
    testAssert(typeof verifyResult.verificationProvenanceHash === 'string', 'Provenance hash generated');
    testAssert(verifyResult.verificationProvenanceHash.length === 64, 'Provenance hash is SHA-256 (64 hex chars)');

    // 5.2 ToolAdapterResult.status === 'TIMED_OUT' -> UNKNOWN (never inferred as success)
    const timedOutAdapter = createValidAdapterResult({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      status: 'TIMED_OUT',
      error: 'Gateway timeout after 30000ms',
    });
    const timedOutReq: RealityVerificationRequest = {
      executionResult: timedOutAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
    };
    const timedOutResult = await runtime.verifyReality(timedOutReq);
    testAssert(timedOutResult.status === 'UNKNOWN', 'TIMED_OUT adapter result classified as UNKNOWN');
    testAssert(timedOutResult.recommendation === 'MANUAL_INSPECTION', 'TIMED_OUT recommends MANUAL_INSPECTION');
    testAssert(timedOutResult.confidence <= 0.3, 'Confidence low for timed out operation');

    // 5.3 Stale task version -> STALE
    const staleTask = createAuthoritativeTask({ version: 7 }); // authoritative is version 7, expected is 5
    const staleReq: RealityVerificationRequest = {
      executionResult: validAdapter,
      authoritativeTask: staleTask,
      expectedTaskVersion: 5,
    };
    const staleResult = await runtime.verifyReality(staleReq);
    testAssert(staleResult.status === 'STALE', 'Task version mismatch -> STALE');
    testAssert(staleResult.failure?.category === 'STALE_TASK_VERSION', 'Failure category is STALE_TASK_VERSION');
    testAssert(staleResult.recommendation === 'ABORT', 'Stale task recommends ABORT');

    // 5.4 Cross-tenant mismatch (result.tenantId !== task.tenantId) -> CrossTenantVerificationError
    const foreignAdapter = createValidAdapterResult({
      taskId: validTask.taskId,
      tenantId: 'tenant_attacker_666',
    });
    const crossTenantReq: RealityVerificationRequest = {
      executionResult: foreignAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
    };
    await assert.rejects(async () => {
      await runtime.verifyReality(crossTenantReq);
    }, CrossTenantVerificationError);
    testAssert(true, 'Cross-tenant execution result rejects with CrossTenantVerificationError');

    // 5.5 Evidence cross-tenant mismatch -> CrossTenantVerificationError
    const foreignEvidence = createValidEvidence({
      taskId: validTask.taskId,
      tenantId: 'tenant_other_99',
      executionId: validAdapter.executionId,
    });
    const crossTenantEvReq: RealityVerificationRequest = {
      executionResult: validAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      externalEvidence: [foreignEvidence],
    };
    await assert.rejects(async () => {
      await runtime.verifyReality(crossTenantEvReq);
    }, CrossTenantVerificationError);
    testAssert(true, 'Cross-tenant evidence rejects with CrossTenantVerificationError');

    // 5.6 TaskId mismatch -> VerificationValidationError
    const mismatchedTaskIdAdapter = createValidAdapterResult({
      taskId: 'task_completely_different',
      tenantId: validTask.tenantId,
    });
    const taskMismatchReq: RealityVerificationRequest = {
      executionResult: mismatchedTaskIdAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
    };
    await assert.rejects(async () => {
      await runtime.verifyReality(taskMismatchReq);
    }, VerificationValidationError);
    testAssert(true, 'TaskId mismatch rejects with VerificationValidationError');

    // 5.7 ExecutionId binding mismatch in evidence
    const mismatchedExecIdEvidence = createValidEvidence({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      executionId: 'exec_unrelated_123',
    });
    const execMismatchReq: RealityVerificationRequest = {
      executionResult: validAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      externalEvidence: [mismatchedExecIdEvidence],
    };
    await assert.rejects(async () => {
      await runtime.verifyReality(execMismatchReq);
    }, VerificationValidationError);
    testAssert(true, 'Evidence executionId mismatch rejects with VerificationValidationError');

    // 5.8 Contradictory evidence handling in runtime -> CONTRADICTORY
    const contrEv1 = createValidEvidence({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      executionId: validAdapter.executionId,
      path: 'order.status',
      observedValue: 'FULFILLED',
    });
    const contrEv2 = createValidEvidence({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      executionId: validAdapter.executionId,
      path: 'order.status',
      observedValue: 'REFUNDED',
    });
    const contraRuntimeReq: RealityVerificationRequest = {
      executionResult: validAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      externalEvidence: [contrEv1, contrEv2],
    };
    const contraResult = await runtime.verifyReality(contraRuntimeReq);
    testAssert(contraResult.status === 'CONTRADICTORY', 'Conflicting evidence sources -> CONTRADICTORY');
    testAssert(contraResult.recommendation === 'MANUAL_INSPECTION', 'Contradictory evidence recommends MANUAL_INSPECTION');

    // 5.9 Eventual consistency handling: adapter SUCCESS + no read-back evidence -> PENDING_VERIFICATION
    const noReadbackAdapter = createValidAdapterResult({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      sanitizedOutput: null, // no immediate observation available
    });
    const pendingReq: RealityVerificationRequest = {
      executionResult: noReadbackAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      allowPendingVerification: true,
      postconditions: [
        {
          id: 'post_eventual',
          description: 'Record must appear in replica',
          targetPath: 'replica.synced',
          operator: 'EQUALS',
          expectedValue: true,
          priority: 'HIGH',
          required: true,
        },
      ],
    };
    const pendingResult = await runtime.verifyReality(pendingReq);
    testAssert(pendingResult.status === 'PENDING_VERIFICATION', 'Temporarily missing observation -> PENDING_VERIFICATION');
    testAssert(pendingResult.recommendation === 'NONE', 'Eventual consistency has advisory recommendation NONE');

    // 5.10 USER_STOP at runtime level triggers immediate abort and throws VerificationAbortedError
    runtimeUserStop = true;
    runtimeUserStopReason = 'Immediate security freeze';
    await assert.rejects(async () => {
      await runtime.verifyReality(verifyReq);
    }, VerificationAbortedError);
    testAssert(true, 'Runtime throws VerificationAbortedError when USER_STOP active');
    runtimeUserStop = false; // Reset

    // 5.11 Cryptographic Provenance Determinism
    // Same canonical inputs -> identical SHA-256 verificationProvenanceHash
    const fixedTime = '2026-09-13T12:00:00.000Z';
    const reqDet1: RealityVerificationRequest = {
      executionResult: createValidAdapterResult({
        executionId: 'exec_fixed_01',
        taskId: 'task_fixed',
        tenantId: 'tenant_fixed',
        stepId: 'step_fixed',
        toolName: 'shop_tool',
        status: 'SUCCESS',
        sanitizedOutput: { count: 10 },
        executionProvenanceHash: 'a'.repeat(64),
      }),
      authoritativeTask: createAuthoritativeTask({ taskId: 'task_fixed', tenantId: 'tenant_fixed', version: 1 }),
      expectedTaskVersion: 1,
    };
    const resDet1 = await runtime.verifyReality(reqDet1, fixedTime);
    const resDet2 = await runtime.verifyReality(reqDet1, fixedTime);
    testAssert(resDet1.verificationProvenanceHash === resDet2.verificationProvenanceHash, 'Identical inputs produce identical provenance hash');

    // 5.12 Cryptographic Provenance Tamper Detection
    const reqTampered: RealityVerificationRequest = {
      ...reqDet1,
      executionResult: {
        ...reqDet1.executionResult,
        executionProvenanceHash: 'b'.repeat(64), // Tampered upstream hash
      },
    };
    const resTampered = await runtime.verifyReality(reqTampered, fixedTime);
    testAssert(resDet1.verificationProvenanceHash !== resTampered.verificationProvenanceHash, 'Tampering upstream provenance changes verification hash');

    // 5.13 Malformed executionResult rejection
    const malformedReq: RealityVerificationRequest = {
      executionResult: {
        ...validAdapter,
        taskId: '', // Empty taskId
      },
      expectedTaskVersion: 5,
    };
    await assert.rejects(async () => {
      await runtime.verifyReality(malformedReq);
    }, VerificationValidationError);
    testAssert(true, 'Rejects empty taskId in execution result');

    const malformedHashReq: RealityVerificationRequest = {
      executionResult: {
        ...validAdapter,
        executionProvenanceHash: 'invalid-non-hex', // Malformed hash
      },
      expectedTaskVersion: 5,
    };
    await assert.rejects(async () => {
      await runtime.verifyReality(malformedHashReq);
    }, VerificationValidationError);
    testAssert(true, 'Rejects non-hex execution provenance hash');

    // 5.14 Audit logging completeness
    const auditEntries = auditLedger.getTrail({ domain: 'agent_reality_verification' });
    testAssert(auditEntries.length >= 10, 'Audit ledger records multiple reality verification lifecycle events');
    const eventTypes = new Set(auditEntries.map((e: any) => e.classification));
    testAssert(eventTypes.has('REALITY_VERIFICATION_REQUESTED'), 'Audit contains REALITY_VERIFICATION_REQUESTED');
    testAssert(eventTypes.has('REALITY_EVIDENCE_COLLECTED'), 'Audit contains REALITY_EVIDENCE_COLLECTED');
    testAssert(eventTypes.has('REALITY_VERIFICATION_PASSED'), 'Audit contains REALITY_VERIFICATION_PASSED');
    testAssert(eventTypes.has('REALITY_VERIFICATION_STALE'), 'Audit contains REALITY_VERIFICATION_STALE');
    testAssert(eventTypes.has('REALITY_TENANT_VIOLATION'), 'Audit contains REALITY_TENANT_VIOLATION');
    testAssert(eventTypes.has('REALITY_USER_STOP_ABORTED'), 'Audit contains REALITY_USER_STOP_ABORTED');

    // 5.15 Audit payloads must not contain secrets
    const auditFileContent = fs.readFileSync(auditPath, 'utf8');
    testAssert(!auditFileContent.includes('sk-live-secret-key-1234567890'), 'Audit log contains zero API keys');
    testAssert(!auditFileContent.includes('SuperSecretPassword123!'), 'Audit log contains zero passwords');
    testAssert(!auditFileContent.includes('bearer-tok-abc-xyz'), 'Audit log contains zero bearer tokens');

    // 5.16 Invariant: Zero task mutation
    const freshEvForMutationTest = createValidEvidence({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      executionId: validAdapter.executionId,
      path: 'order.status',
      observedValue: 'FULFILLED',
    });
    const freshMutationReq: RealityVerificationRequest = {
      ...verifyReq,
      externalEvidence: [freshEvForMutationTest],
    };
    const preVerificationTaskJson = JSON.stringify(validTask);
    await runtime.verifyReality(freshMutationReq);
    const postVerificationTaskJson = JSON.stringify(validTask);
    testAssert(preVerificationTaskJson === postVerificationTaskJson, 'Authoritative task remains completely unmutated');

    // 5.17 Invariant: Adapter output cannot directly produce VERIFIED without invariant evaluation
    const adapterSuccessOnlyReq: RealityVerificationRequest = {
      executionResult: createValidAdapterResult({
        taskId: validTask.taskId,
        tenantId: validTask.tenantId,
        status: 'SUCCESS',
        sanitizedOutput: { result: 'ok' },
      }),
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      postconditions: [
        {
          id: 'post_unmet',
          description: 'Must have created invoice',
          targetPath: 'invoice.id',
          operator: 'EXISTS',
          priority: 'CRITICAL',
          required: true,
        },
      ],
    };
    const adapterOnlyResult = await runtime.verifyReality(adapterSuccessOnlyReq);
    testAssert(adapterOnlyResult.status !== 'VERIFIED', 'Adapter SUCCESS alone cannot produce VERIFIED when invariants unmet');
    testAssert(adapterOnlyResult.status === 'NOT_VERIFIED', 'Unmet required invoice invariant results in NOT_VERIFIED');

    // 5.18 Invariant: Zero tool execution / zero mutating adapters inside verifier
    testAssert(typeof (runtime as any).executeTool === 'undefined', 'Verifier has no tool execution method');
    testAssert(typeof (collector as any).execute === 'undefined', 'Collector has no execute method');
    testAssert(typeof (oracle as any).execute === 'undefined', 'Oracle has no execute method');

    // 5.19 Invariant: Zero authorization capability inside verifier
    testAssert(typeof (runtime as any).issueToken === 'undefined', 'Verifier cannot issue execution tokens');
    testAssert(typeof (runtime as any).approve === 'undefined', 'Verifier cannot approve proposals');
    testAssert(typeof (runtime as any).permit === 'undefined', 'Verifier cannot PERMIT actions');

    // 5.20 Recommendation classification consistency
    testAssert(verifyResult.recommendation === 'NONE', 'VERIFIED status maps to NONE recommendation');
    testAssert(timedOutResult.recommendation === 'MANUAL_INSPECTION', 'TIMED_OUT status maps to MANUAL_INSPECTION');
    testAssert(staleResult.recommendation === 'ABORT', 'STALE status maps to ABORT recommendation');

    // =========================================================================
    // SECTION 6: Additional Rigorous Edge Cases & Bounds Verification
    // =========================================================================
    console.log('--- Section 6: Additional Edge Cases & Bounds ---');

    // 6.1 Empty postconditions with successful execution defaults to VERIFIED
    const emptyPostconditionsReq: RealityVerificationRequest = {
      executionResult: createValidAdapterResult({
        taskId: validTask.taskId,
        tenantId: validTask.tenantId,
      }),
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
      postconditions: [],
    };
    const emptyPostResult = await runtime.verifyReality(emptyPostconditionsReq);
    testAssert(emptyPostResult.status === 'VERIFIED', 'Empty postconditions with successful execution produces VERIFIED');
    testAssert(emptyPostResult.summary.totalInvariants === 0, 'Total invariants is 0');

    // 6.2 Null and undefined sanitized output handled gracefully
    const nullOutputAdapter = createValidAdapterResult({
      taskId: validTask.taskId,
      tenantId: validTask.tenantId,
      sanitizedOutput: null,
    });
    const nullOutputReq: RealityVerificationRequest = {
      executionResult: nullOutputAdapter,
      authoritativeTask: validTask,
      expectedTaskVersion: 5,
    };
    const nullOutputResult = await runtime.verifyReality(nullOutputReq);
    testAssert(nullOutputResult.status === 'VERIFIED', 'Null output with zero postconditions handled safely');

    // 6.3 Deeply nested object extraction
    const deepObj = { a: { b: { c: { d: 'target_value' } } } };
    const deepCollector = new RealityEvidenceCollector();
    const deepCollected = deepCollector.collectEvidence(createValidAdapterResult({ sanitizedOutput: deepObj }));
    testAssert(deepCollected.length >= 1, 'Deeply nested object normalized into evidence');

    // 6.4 Missing expectedTaskVersion validation
    await assert.rejects(async () => {
      await runtime.verifyReality({
        executionResult: validAdapter,
        expectedTaskVersion: -1, // Negative version
      });
    }, VerificationValidationError);
    testAssert(true, 'Rejects negative expectedTaskVersion');

    // 6.5 String timestamp validation on evidence
    assert.throws(() => {
      new RealityEvidenceCollector().collectEvidence(validAdapter, [
        createValidEvidence({
          taskId: validAdapter.taskId,
          tenantId: validAdapter.tenantId,
          executionId: validAdapter.executionId,
          timestamp: 'invalid-date',
        }),
      ]);
    }, VerificationValidationError);
    testAssert(true, 'Rejects invalid timestamp string in evidence');

    // 6.6 Non-string path in evidence
    assert.throws(() => {
      new RealityEvidenceCollector().collectEvidence(validAdapter, [
        createValidEvidence({
          taskId: validAdapter.taskId,
          tenantId: validAdapter.tenantId,
          executionId: validAdapter.executionId,
          path: '', // Empty path
        }),
      ]);
    }, VerificationValidationError);
    testAssert(true, 'Rejects empty path in evidence');

    // 6.7 Number predicate operations
    const numericInvariants: Postcondition[] = [
      { id: 'num_1', description: 'count > 5', targetPath: 'itemCount', operator: 'GREATER_THAN', expectedValue: 5, priority: 'HIGH', required: true },
      { id: 'num_2', description: 'count < 20', targetPath: 'itemCount', operator: 'LESS_THAN', expectedValue: 20, priority: 'HIGH', required: true },
      { id: 'num_3', description: 'price >= 100', targetPath: 'price', operator: 'GREATER_OR_EQUAL', expectedValue: 100, priority: 'HIGH', required: true },
      { id: 'num_4', description: 'price <= 100', targetPath: 'price', operator: 'LESS_OR_EQUAL', expectedValue: 100, priority: 'HIGH', required: true },
    ];
    const numEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'itemCount', observedValue: 10 }),
      createValidEvidence({ path: 'price', observedValue: 100 }),
    ];
    const numOracleResult = oracle.evaluateInvariants({
      postconditions: numericInvariants,
      evidence: numEvidence,
      executionSucceeded: true,
    });
    testAssert(numOracleResult.status === 'VERIFIED', 'Numeric inequality predicates verified');
    testAssert(numOracleResult.summary.passedCount === 4, 'All 4 numeric invariants passed');

    // 6.8 Membership and Boolean predicates
    const membershipInvariants: Postcondition[] = [
      { id: 'mem_1', description: 'status in allowed states', targetPath: 'status', operator: 'IN', expectedValue: ['PENDING', 'ACTIVE', 'DONE'], priority: 'MEDIUM', required: true },
      { id: 'mem_2', description: 'status not in forbidden states', targetPath: 'status', operator: 'NOT_IN', expectedValue: ['BANNED', 'DELETED'], priority: 'MEDIUM', required: true },
      { id: 'mem_3', description: 'active is true', targetPath: 'isActive', operator: 'BOOLEAN_TRUE', priority: 'MEDIUM', required: true },
      { id: 'mem_4', description: 'deleted is false', targetPath: 'isDeleted', operator: 'BOOLEAN_FALSE', priority: 'MEDIUM', required: true },
    ];
    const memEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'status', observedValue: 'ACTIVE' }),
      createValidEvidence({ path: 'isActive', observedValue: true }),
      createValidEvidence({ path: 'isDeleted', observedValue: false }),
    ];
    const memOracleResult = oracle.evaluateInvariants({
      postconditions: membershipInvariants,
      evidence: memEvidence,
      executionSucceeded: true,
    });
    testAssert(memOracleResult.status === 'VERIFIED', 'Membership and boolean predicates verified');
    testAssert(memOracleResult.summary.passedCount === 4, 'All 4 membership and boolean invariants passed');

    // 6.9 Array ALL and ANY predicates
    const arrayInvariants: Postcondition[] = [
      { id: 'arr_1', description: 'any item is active', targetPath: 'itemStatuses', operator: 'ANY', expectedValue: 'ACTIVE', priority: 'LOW', required: true },
      { id: 'arr_2', description: 'all items are verified', targetPath: 'verificationFlags', operator: 'ALL', expectedValue: true, priority: 'LOW', required: true },
    ];
    const arrEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'itemStatuses', observedValue: ['INACTIVE', 'ACTIVE', 'PENDING'] }),
      createValidEvidence({ path: 'verificationFlags', observedValue: [true, true, true] }),
    ];
    const arrOracleResult = oracle.evaluateInvariants({
      postconditions: arrayInvariants,
      evidence: arrEvidence,
      executionSucceeded: true,
    });
    testAssert(arrOracleResult.status === 'VERIFIED', 'Array ALL and ANY predicates verified');
    testAssert(arrOracleResult.summary.passedCount === 2, 'All 2 array invariants passed');

    // 6.10 Non-existent path evaluates to NOT_EXISTS
    const notExistsInvariant: Postcondition[] = [
      { id: 'ne_1', description: 'error must not exist', target: 'error', predicate: 'NOT_EXISTS', priority: 'HIGH', required: true },
    ];
    const neEvidence: RealityEvidence[] = [
      createValidEvidence({ path: 'data.ready', observedValue: true }),
    ];
    const neOracleResult = oracle.evaluateInvariants({
      postconditions: notExistsInvariant,
      evidence: neEvidence,
      executionSucceeded: true,
    });
    testAssert(neOracleResult.status === 'VERIFIED', 'NOT_EXISTS invariant correctly verified when target absent');

    // Clean up test data dir
    fs.rmSync(testDataDir, { recursive: true, force: true });

    console.log(`\nREALITY GATE COMPLETE: All ${passedAssertions} assertions PASSED with ZERO errors!`);
    console.log('MS-1.4.07 Empirical Reality Verification Engine: FULLY VERIFIED.');
  } catch (err) {
    // Clean up test data dir on error
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch {}
    console.error('Test suite encountered an unhandled error:', err);
    process.exit(1);
  }
}

runRealityTests().catch(err => {
  console.error('Fatal error running reality tests:', err);
  process.exit(1);
});
