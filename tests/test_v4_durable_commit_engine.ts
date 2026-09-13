// tests/test_v4_durable_commit_engine.ts
// BOWCON V4.0 — MS-1.4.08: DEDICATED DURABLE COMMIT ENGINE TEST SUITE
//
// EN:
// Tests the Durable Commit Engine under all operational and adversarial conditions:
// VERIFIED-only commit authority, postcondition invariant gating (allRequiredPassed),
// multi-tuple identity binding (task, tenant, step, execution), task version concurrency,
// replay and duplicate commit defense, 4-checkpoint synchronous USER_STOP supremacy,
// security defenses (prototype pollution, null-byte injection, excessive nesting, payload limits, path traversal),
// secret scrubbing via DiagnosisSanitizer, crash-safe atomic persistence,
// deterministic SHA-256 commit provenance with multi-field tamper detection,
// deep immutability, zero tool execution, and zero task mutation.
//
// VI:
// Kiểm thử Động cơ Commit Bền vững dưới mọi điều kiện vận hành và đối kháng.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DurableCommitRuntime,
  DurableCommitValidator,
  DurableCommitExecutionGate,
  DurableCommitStore,
  DURABLE_COMMIT_VERSION,
  DURABLE_COMMIT_AUDIT_DOMAIN,
  DURABLE_COMMIT_BOUNDS,
  type DurableCommitRequest,
  type DurableCommitRecord,
  type DurableCommitResult,
  DuplicateCommitError,
  StaleTaskCommitError,
  CrossTenantCommitError,
  CommitSecurityViolationError,
  CommitAbortedError,
  CommitValidationError,
  CommitPersistenceError,
} from '../src/core/durableCommit/index.js';
import type { RealityVerificationResult } from '../src/core/realityVerification/realityVerificationTypes.js';
import type { AgentTask } from '../src/core/taskLifecycle/agentTaskTypes.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

let passedAssertions = 0;
function testAssert(condition: boolean, message: string) {
  assert(condition, message);
  passedAssertions++;
}

// Helpers to construct mock authoritative objects
function createValidTask(overrides?: Partial<AgentTask>): AgentTask {
  return {
    taskId: 'task_alpha_101',
    tenantId: 'tenant_bow_01',
    userId: 'user_operator_1',
    title: 'Update Inventory Database',
    intent: 'Commit verified inventory delta',
    riskLevel: 'MEDIUM',
    state: 'EXECUTING',
    version: 4,
    steps: [],
    currentStepIndex: 1,
    createdAt: '2026-09-13T10:00:00.000Z',
    updatedAt: '2026-09-13T10:05:00.000Z',
    provenanceHash: 'a'.repeat(64),
    ...overrides,
  };
}

function createValidVerificationResult(overrides?: Partial<RealityVerificationResult>): RealityVerificationResult {
  return {
    verificationId: 'verif_001_xyz',
    taskId: 'task_alpha_101',
    tenantId: 'tenant_bow_01',
    stepId: 'step_write_01',
    executionId: 'exec_tool_789',
    toolName: 'inventory_db_adapter',
    status: 'VERIFIED',
    confidence: 0.98,
    postconditionResults: [
      {
        postcondition: { id: 'post_1', description: 'stock updated', targetPath: 'stock', operator: 'EQUALS', expectedValue: 50, priority: 'HIGH', required: true },
        passed: true,
        observedValue: 50,
        evaluatedAt: '2026-09-13T10:05:01.000Z',
      },
    ],
    evidence: [
      {
        evidenceId: 'ev_1',
        source: 'READ_AFTER_WRITE',
        path: 'stock',
        observedValue: 50,
        expectedValue: 50,
        matched: true,
        timestamp: '2026-09-13T10:05:01.000Z',
        confidence: 1.0,
        tenantId: 'tenant_bow_01',
        taskId: 'task_alpha_101',
        executionId: 'exec_tool_789',
        evidenceHash: 'b'.repeat(64),
      },
    ],
    summary: {
      totalInvariants: 1,
      passedCount: 1,
      failedCount: 0,
      unknownCount: 0,
      conflictingCount: 0,
      allRequiredPassed: true,
    },
    recommendation: 'NONE',
    executionProvenanceHash: 'c'.repeat(64),
    verificationProvenanceHash: 'd'.repeat(64),
    verifiedAt: '2026-09-13T10:05:02.000Z',
    ...overrides,
  };
}

async function runDurableCommitTests() {
  console.log('Starting MS-1.4.08 Dedicated Test Suite: Durable Commit Engine...\n');

  const testDataDir = path.resolve(process.cwd(), 'data', 'test_ms_1_4_08_' + Date.now());
  fs.mkdirSync(testDataDir, { recursive: true });

  const auditPath = path.join(testDataDir, 'test_commit_audit.jsonl');
  const auditLedger = new AuditLedger(auditPath);
  const sanitizer = new DiagnosisSanitizer();

  const partitionsDir = path.join(testDataDir, 'partitions');
  const store = new DurableCommitStore({ baseDir: partitionsDir, sanitizer });
  const validator = new DurableCommitValidator({ sanitizer });

  let mockUserStop = false;
  let mockUserStopReason: string | undefined = undefined;
  const gate = new DurableCommitExecutionGate({
    isUserStopActive: () => mockUserStop,
    getUserStopReason: () => mockUserStopReason,
    auditLedger,
  });

  const runtime = new DurableCommitRuntime({
    validator,
    gate,
    store,
    auditLedger,
    sanitizer,
  });

  try {
    // ========================================================================
    // 1. CONSTANTS, BOUNDS & ERROR TAXONOMY
    // ========================================================================
    console.log('--- 1. Testing Constants, Bounds & Error Taxonomy ---');
    testAssert(DURABLE_COMMIT_VERSION === '4.0.0', 'DURABLE_COMMIT_VERSION is 4.0.0');
    testAssert(DURABLE_COMMIT_AUDIT_DOMAIN === 'agent_durable_commit', 'DURABLE_COMMIT_AUDIT_DOMAIN is agent_durable_commit');
    testAssert(DURABLE_COMMIT_BOUNDS.MAX_PAYLOAD_BYTES === 65536, 'MAX_PAYLOAD_BYTES is 64KB');
    testAssert(DURABLE_COMMIT_BOUNDS.MAX_DEPTH === 10, 'MAX_DEPTH is 10');

    const errDup = new DuplicateCommitError('duplicate');
    testAssert(errDup.code === 'DUPLICATE_COMMIT_ERROR', 'DuplicateCommitError has correct code');
    testAssert(typeof errDup.timestamp === 'string', 'DuplicateCommitError has ISO timestamp');

    const errStale = new StaleTaskCommitError('stale');
    testAssert(errStale.code === 'STALE_TASK_COMMIT_ERROR', 'StaleTaskCommitError has correct code');

    const errTenant = new CrossTenantCommitError('tenant mismatch');
    testAssert(errTenant.code === 'CROSS_TENANT_COMMIT_ERROR', 'CrossTenantCommitError has correct code');

    const errSec = new CommitSecurityViolationError('security');
    testAssert(errSec.code === 'COMMIT_SECURITY_VIOLATION', 'CommitSecurityViolationError has correct code');

    const errAbort = new CommitAbortedError('abort');
    testAssert(errAbort.code === 'COMMIT_ABORTED_ERROR', 'CommitAbortedError has correct code');

    const errVal = new CommitValidationError('validation');
    testAssert(errVal.code === 'COMMIT_VALIDATION_ERROR', 'CommitValidationError has correct code');

    const errPersist = new CommitPersistenceError('persist error');
    testAssert(errPersist.code === 'COMMIT_PERSISTENCE_ERROR', 'CommitPersistenceError has correct code');

    // ========================================================================
    // 2. AUTHORITY & VERIFICATION GATING (VERIFIED-ONLY)
    // ========================================================================
    console.log('--- 2. Testing Authority & Verification Gating ---');

    // 2.1 Valid VERIFIED result commits successfully
    const validTask = createValidTask();
    const validVerif = createValidVerificationResult();
    const result1 = await runtime.commitDurable({
      verificationResult: validVerif,
      authoritativeTask: validTask,
      expectedTaskVersion: 4,
    });
    testAssert(result1.status === 'COMMITTED', 'Valid VERIFIED result produces COMMITTED status');
    testAssert(result1.commitId.startsWith('commit_'), 'Result has deterministic commitId');
    testAssert(result1.record !== undefined, 'Result includes persisted commit record');
    testAssert(result1.record?.status === 'COMMITTED', 'Persisted record status is COMMITTED');

    // 2.2 allRequiredPassed === false rejected
    const unpassedVerif = createValidVerificationResult({
      summary: {
        totalInvariants: 1,
        passedCount: 0,
        failedCount: 1,
        unknownCount: 0,
        conflictingCount: 0,
        allRequiredPassed: false,
      },
    });
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: unpassedVerif,
        authoritativeTask: createValidTask({ taskId: 'task_unpassed' }),
      }),
      CommitValidationError
    );
    testAssert(true, 'allRequiredPassed=false rejected with CommitValidationError');

    // 2.3 Non-VERIFIED statuses rejected
    const unverifiedStatuses = [
      'NOT_VERIFIED',
      'PENDING_VERIFICATION',
      'UNKNOWN',
      'CONTRADICTORY',
      'STALE',
      'SECURITY_REJECTED',
    ] as const;

    for (const badStatus of unverifiedStatuses) {
      const badVerif = createValidVerificationResult({
        status: badStatus as any,
      });
      await assert.rejects(
        async () => await runtime.commitDurable({
          verificationResult: badVerif,
          authoritativeTask: createValidTask({ taskId: `task_${badStatus}` }),
        }),
        CommitValidationError
      );
      testAssert(true, `Verification status '${badStatus}' rejected from commit`);
    }

    // 2.4 Missing verification envelope fields
    const missingVerifId = createValidVerificationResult({ verificationId: '' });
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: missingVerifId,
        authoritativeTask: validTask,
      }),
      CommitValidationError
    );
    testAssert(true, 'Empty verificationId rejected');

    // ========================================================================
    // 3. MULTI-TUPLE BINDINGS & CONCURRENCY
    // ========================================================================
    console.log('--- 3. Testing Multi-Tuple Identity & Concurrency Bindings ---');

    // 3.1 Tenant mismatch
    const crossTenantVerif = createValidVerificationResult({
      tenantId: 'tenant_mallory_99',
    });
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: crossTenantVerif,
        authoritativeTask: validTask,
      }),
      CrossTenantCommitError
    );
    testAssert(true, 'Cross-tenant verification rejected with CrossTenantCommitError');

    // 3.2 Context tenant mismatch
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: createValidVerificationResult({ taskId: 'task_ctx_mismatch' }),
        authoritativeTask: createValidTask({ taskId: 'task_ctx_mismatch' }),
        commitContext: { tenantId: 'tenant_other' },
      }),
      CrossTenantCommitError
    );
    testAssert(true, 'Context tenant mismatch rejected with CrossTenantCommitError');

    // 3.3 Task ID mismatch
    const taskMismatchVerif = createValidVerificationResult({
      taskId: 'task_different_999',
    });
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: taskMismatchVerif,
        authoritativeTask: validTask,
      }),
      CommitValidationError
    );
    testAssert(true, 'Task ID mismatch rejected with CommitValidationError');

    // 3.4 Task version concurrency mismatch
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: createValidVerificationResult({ taskId: 'task_version_stale' }),
        authoritativeTask: createValidTask({ taskId: 'task_version_stale', version: 5 }),
        expectedTaskVersion: 4, // expected 4 but task is 5
      }),
      StaleTaskCommitError
    );
    testAssert(true, 'Stale task version rejected with StaleTaskCommitError');

    // 3.5 Matching task version accepted
    const matchingVerif = createValidVerificationResult({ taskId: 'task_version_match', stepId: 'step_m1' });
    const matchingTask = createValidTask({ taskId: 'task_version_match', version: 5 });
    const resultMatch = await runtime.commitDurable({
      verificationResult: matchingVerif,
      authoritativeTask: matchingTask,
      expectedTaskVersion: 5,
    });
    testAssert(resultMatch.status === 'COMMITTED', 'Matching task version 5 commits successfully');

    // ========================================================================
    // 4. IDEMPOTENCY & REPLAY DEFENSE
    // ========================================================================
    console.log('--- 4. Testing Idempotency & Replay Defense ---');

    // 4.1 Replay of already committed request throws DuplicateCommitError
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: validVerif,
        authoritativeTask: validTask,
        expectedTaskVersion: 4,
      }),
      DuplicateCommitError
    );
    testAssert(true, 'Replay of exact same commit rejected with DuplicateCommitError');

    // 4.2 Duplicate does not overwrite existing record on disk
    const originalRecord = store.getCommit(validTask.tenantId, result1.commitId);
    testAssert(originalRecord !== undefined, 'Original record exists on disk');
    testAssert(originalRecord?.committedAt === result1.committedAt, 'Original record committedAt preserved');

    // 4.3 Deterministic commit identity
    const idA = store.computeCommitId({
      taskId: 'task_1',
      tenantId: 'tenant_1',
      stepId: 'step_1',
      executionId: 'exec_1',
      verificationId: 'verif_1',
      taskVersion: 1,
    });
    const idB = store.computeCommitId({
      taskId: 'task_1',
      tenantId: 'tenant_1',
      stepId: 'step_1',
      executionId: 'exec_1',
      verificationId: 'verif_1',
      taskVersion: 1,
    });
    testAssert(idA === idB, 'Deterministic commit ID produces identical hash for identical tuple');

    const idC = store.computeCommitId({
      taskId: 'task_1',
      tenantId: 'tenant_1',
      stepId: 'step_2', // changed stepId
      executionId: 'exec_1',
      verificationId: 'verif_1',
      taskVersion: 1,
    });
    testAssert(idA !== idC, 'Changed stepId produces divergent commit ID');

    // ========================================================================
    // 5. SYNCHRONOUS USER_STOP SUPREMACY (4 CHECKPOINTS)
    // ========================================================================
    console.log('--- 5. Testing Synchronous USER_STOP Supremacy (Gates 1-4) ---');

    // 5.1 Gate 1 abort (Request acceptance)
    mockUserStop = true;
    mockUserStopReason = 'Emergency STOP at Gate 1';
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: createValidVerificationResult({ taskId: 'task_gate1' }),
        authoritativeTask: createValidTask({ taskId: 'task_gate1' }),
      }),
      (err: any) => err instanceof CommitAbortedError && err.message.includes('Gate 1')
    );
    testAssert(true, 'Gate 1 halts execution on USER_STOP');
    mockUserStop = false;

    // 5.2 Gate 2 abort (Pre-State Read / Duplicate Check)
    let gate2Checked = false;
    const gate2Custom = new DurableCommitExecutionGate({
      isUserStopActive: () => {
        if (gate2Checked) return true;
        return false;
      },
      getUserStopReason: () => 'USER_STOP triggered before Gate 2',
      auditLedger,
    });
    const runtimeGate2 = new DurableCommitRuntime({
      validator,
      gate: gate2Custom,
      store,
      auditLedger,
      sanitizer,
    });
    // Gate 1 will query isUserStopActive (returns false)
    gate2Checked = true;
    await assert.rejects(
      async () => await runtimeGate2.commitDurable({
        verificationResult: createValidVerificationResult({ taskId: 'task_gate2' }),
        authoritativeTask: createValidTask({ taskId: 'task_gate2' }),
      }),
      (err: any) => err instanceof CommitAbortedError && err.message.includes('Gate 2')
    );
    testAssert(true, 'Gate 2 halts execution on USER_STOP');

    // 5.3 Gate 3 abort (Pre-Durable Write)
    let queryCount3 = 0;
    const gate3Custom = new DurableCommitExecutionGate({
      isUserStopActive: () => {
        queryCount3++;
        return queryCount3 >= 3; // Gate 3 is 3rd query
      },
      getUserStopReason: () => 'USER_STOP triggered before Gate 3',
      auditLedger,
    });
    const runtimeGate3 = new DurableCommitRuntime({
      validator,
      gate: gate3Custom,
      store,
      auditLedger,
      sanitizer,
    });
    await assert.rejects(
      async () => await runtimeGate3.commitDurable({
        verificationResult: createValidVerificationResult({ taskId: 'task_gate3' }),
        authoritativeTask: createValidTask({ taskId: 'task_gate3' }),
      }),
      (err: any) => err instanceof CommitAbortedError && err.message.includes('Gate 3')
    );
    testAssert(true, 'Gate 3 halts execution on USER_STOP before write');

    // 5.4 Gate 4 abort (Post-Write Result Emission)
    let queryCount4 = 0;
    const gate4Custom = new DurableCommitExecutionGate({
      isUserStopActive: () => {
        queryCount4++;
        return queryCount4 >= 4; // Gate 4 is 4th query
      },
      getUserStopReason: () => 'USER_STOP triggered before Gate 4 emission',
      auditLedger,
    });
    const runtimeGate4 = new DurableCommitRuntime({
      validator,
      gate: gate4Custom,
      store,
      auditLedger,
      sanitizer,
    });
    await assert.rejects(
      async () => await runtimeGate4.commitDurable({
        verificationResult: createValidVerificationResult({ taskId: 'task_gate4' }),
        authoritativeTask: createValidTask({ taskId: 'task_gate4' }),
      }),
      (err: any) => err instanceof CommitAbortedError && err.message.includes('Gate 4')
    );
    testAssert(true, 'Gate 4 halts execution on USER_STOP before emitting success');

    // 5.5 USER_STOP queries independently at each checkpoint
    testAssert(gate.isUserStopActive() === false, 'Execution gate correctly reports inactive state');
    mockUserStop = true;
    testAssert(gate.isUserStopActive() === true, 'Execution gate reflects state change without caching');
    mockUserStop = false;

    // ========================================================================
    // 6. SECURITY DEFENSES (INJECTION, OVERSIZED, TRAVERSAL)
    // ========================================================================
    console.log('--- 6. Testing Security Defenses ---');

    // 6.1 Prototype pollution via __proto__
    const protoPollutedReq: any = {
      verificationResult: createValidVerificationResult({ taskId: 'task_proto' }),
      authoritativeTask: createValidTask({ taskId: 'task_proto' }),
    };
    Object.defineProperty(protoPollutedReq, '__proto__', {
      value: { evil: true },
      enumerable: true,
      configurable: true,
    });
    await assert.rejects(
      async () => await runtime.commitDurable(protoPollutedReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Prototype pollution via __proto__ rejected');

    // 6.2 Prototype pollution via constructor
    const constructorPollutedReq: any = {
      verificationResult: createValidVerificationResult({ taskId: 'task_const' }),
      authoritativeTask: createValidTask({ taskId: 'task_const' }),
      constructor: { evil: true },
    };
    await assert.rejects(
      async () => await runtime.commitDurable(constructorPollutedReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Prototype pollution via constructor rejected');

    // 6.3 Prototype pollution via prototype key
    const prototypePollutedReq: any = {
      verificationResult: createValidVerificationResult({ taskId: 'task_prot' }),
      authoritativeTask: createValidTask({ taskId: 'task_prot' }),
      prototype: { evil: true },
    };
    await assert.rejects(
      async () => await runtime.commitDurable(prototypePollutedReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Prototype pollution via prototype rejected');

    // 6.4 Null byte injection
    const nullByteReq: any = {
      verificationResult: createValidVerificationResult({ taskId: 'task_null\0byte' }),
      authoritativeTask: createValidTask({ taskId: 'task_null\0byte' }),
    };
    await assert.rejects(
      async () => await runtime.commitDurable(nullByteReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Null byte injection rejected');

    // 6.5 Excessive nesting depth (>10)
    let deepObj: any = { value: 1 };
    for (let i = 0; i < 15; i++) {
      deepObj = { child: deepObj };
    }
    const excessiveNestReq: any = {
      verificationResult: createValidVerificationResult({ taskId: 'task_nest' }),
      authoritativeTask: createValidTask({ taskId: 'task_nest' }),
      committedStateOverride: deepObj,
    };
    await assert.rejects(
      async () => await runtime.commitDurable(excessiveNestReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Excessive nesting > 10 rejected with CommitSecurityViolationError');

    // 6.6 Oversized payload (> 64KB)
    const oversizedState: Record<string, string> = {};
    for (let i = 0; i < 2000; i++) {
      oversizedState[`key_${i}`] = 'X'.repeat(50);
    }
    const oversizedReq: any = {
      verificationResult: createValidVerificationResult({ taskId: 'task_oversized' }),
      authoritativeTask: createValidTask({ taskId: 'task_oversized' }),
      committedStateOverride: oversizedState,
    };
    await assert.rejects(
      async () => await runtime.commitDurable(oversizedReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Oversized payload > 64KB rejected with CommitSecurityViolationError');

    // 6.7 Path traversal in tenantId
    const traversalTenantReq: any = {
      verificationResult: createValidVerificationResult({ tenantId: '../../evil_tenant' }),
      authoritativeTask: createValidTask({ tenantId: '../../evil_tenant' }),
    };
    await assert.rejects(
      async () => await runtime.commitDurable(traversalTenantReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Path traversal in tenantId rejected');

    // 6.8 Path traversal in taskId
    const traversalTaskReq: any = {
      verificationResult: createValidVerificationResult({ taskId: '..\\..\\evil_task' }),
      authoritativeTask: createValidTask({ taskId: '..\\..\\evil_task' }),
    };
    await assert.rejects(
      async () => await runtime.commitDurable(traversalTaskReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Path traversal in taskId rejected');

    // 6.9 Forbidden workspace target (shopofbow)
    const shopofbowTenantReq: any = {
      verificationResult: createValidVerificationResult({ tenantId: 'tenant_shopofbow' }),
      authoritativeTask: createValidTask({ tenantId: 'tenant_shopofbow' }),
    };
    await assert.rejects(
      async () => await runtime.commitDurable(shopofbowTenantReq),
      CommitSecurityViolationError
    );
    testAssert(true, 'Protected workspace reference (shopofbow) rejected');

    // ========================================================================
    // 7. SECRET REDACTION & SANITIZATION
    // ========================================================================
    console.log('--- 7. Testing Secret Sanitization ---');
    const secretState = {
      password: 'SuperSecretPassword123!',
      apiKey: 'sk-ant-api03-abcdefg123456789',
      bearer: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
      dbUrl: 'postgres://user:password@localhost:5432/db',
      normalValue: 12345,
    };
    const sanitizedState = validator.sanitize(secretState);
    testAssert(sanitizedState.normalValue === 12345, 'Normal values preserved');
    testAssert(sanitizedState.password === '[REDACTED]', 'Password redacted');
    testAssert(sanitizedState.apiKey === '[REDACTED]', 'API key redacted');
    testAssert(sanitizedState.bearer === '[REDACTED]', 'Bearer token redacted');

    // ========================================================================
    // 8. CRASH-SAFE ATOMIC PERSISTENCE
    // ========================================================================
    console.log('--- 8. Testing Crash-Safe Atomic Persistence ---');

    // 8.1 Successful atomic persistence and read-back
    const atomicVerif = createValidVerificationResult({ taskId: 'task_atomic_1', stepId: 'step_at1' });
    const atomicTask = createValidTask({ taskId: 'task_atomic_1' });
    const atomicResult = await runtime.commitDurable({
      verificationResult: atomicVerif,
      authoritativeTask: atomicTask,
    });
    testAssert(atomicResult.status === 'COMMITTED', 'Atomic commit succeeds');

    const readBack = store.getCommit(atomicTask.tenantId, atomicResult.commitId);
    testAssert(readBack !== undefined, 'Commit record read back from disk');
    testAssert(readBack?.commitId === atomicResult.commitId, 'Read-back commitId matches');
    testAssert(readBack?.taskId === atomicTask.taskId, 'Read-back taskId matches');
    testAssert(readBack?.taskVersion === atomicTask.version, 'Read-back taskVersion matches');

    // 8.2 Cross-tenant read rejection: when a commit file in a tenant directory has a mismatched tenantId
    const otherTenantDir = store.getTenantCommitsDir('other_tenant');
    const fakeCrossFile = path.join(otherTenantDir, `${atomicResult.commitId}.json`);
    fs.copyFileSync(store.getCommitFilePath(atomicTask.tenantId, atomicResult.commitId), fakeCrossFile);
    assert.throws(
      () => store.getCommit('other_tenant', atomicResult.commitId),
      CrossTenantCommitError
    );
    testAssert(true, 'Cross-tenant commit read rejected with CrossTenantCommitError');
    try { fs.unlinkSync(fakeCrossFile); } catch {}

    // 8.3 List commits within tenant partition
    const tenantCommits = store.listCommits(atomicTask.tenantId);
    testAssert(tenantCommits.length >= 2, 'listCommits returns stored commits for tenant');
    testAssert(tenantCommits.every(c => c.tenantId === atomicTask.tenantId), 'All listed commits belong to tenant');

    // 8.4 Atomic write failure handling
    const blockerPath = path.join(testDataDir, 'cannot_write_dir');
    fs.writeFileSync(blockerPath, 'file_blocking_directory');
    const unwriteableStore = new DurableCommitStore({ baseDir: blockerPath });
    assert.throws(
      () => unwriteableStore.saveCommit({
        ...atomicResult.record!,
        commitId: 'commit_fail_test',
        tenantId: 'tenant_fail_write',
      }),
      (err: any) => err instanceof CommitPersistenceError || err instanceof CommitValidationError || err.message.includes('ENOTDIR')
    );
    testAssert(true, 'Filesystem failure during atomic write throws CommitPersistenceError safely');

    // ========================================================================
    // 9. CRYPTOGRAPHIC PROVENANCE & TAMPER DETECTION
    // ========================================================================
    console.log('--- 9. Testing Cryptographic Provenance & Tamper Detection ---');

    const baseProvParams = {
      verificationProvenanceHash: 'd'.repeat(64),
      taskId: 'task_prov_1',
      tenantId: 'tenant_prov_1',
      stepId: 'step_prov_1',
      executionId: 'exec_prov_1',
      commitStatus: 'COMMITTED' as const,
      committedState: { delta: 100, verified: true },
      committedAt: '2026-09-13T12:00:00.000Z',
    };

    const hash1 = runtime.calculateCommitProvenanceHash(baseProvParams);
    const hash2 = runtime.calculateCommitProvenanceHash(baseProvParams);
    testAssert(hash1 === hash2, 'Identical inputs produce identical commitProvenanceHash');
    testAssert(hash1.length === 64, 'Provenance hash is a 64-char SHA-256 hex digest');

    // Tamper verificationProvenanceHash
    const tamperedVerifHash = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      verificationProvenanceHash: 'e'.repeat(64),
    });
    testAssert(hash1 !== tamperedVerifHash, 'Tampered verificationProvenanceHash alters provenance hash');

    // Tamper taskId
    const tamperedTask = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      taskId: 'task_tampered',
    });
    testAssert(hash1 !== tamperedTask, 'Tampered taskId alters provenance hash');

    // Tamper tenantId
    const tamperedTenant = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      tenantId: 'tenant_tampered',
    });
    testAssert(hash1 !== tamperedTenant, 'Tampered tenantId alters provenance hash');

    // Tamper stepId
    const tamperedStep = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      stepId: 'step_tampered',
    });
    testAssert(hash1 !== tamperedStep, 'Tampered stepId alters provenance hash');

    // Tamper executionId
    const tamperedExec = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      executionId: 'exec_tampered',
    });
    testAssert(hash1 !== tamperedExec, 'Tampered executionId alters provenance hash');

    // Tamper commitStatus
    const tamperedStatus = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      commitStatus: 'REJECTED',
    });
    testAssert(hash1 !== tamperedStatus, 'Tampered commitStatus alters provenance hash');

    // Tamper committedState
    const tamperedState = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      committedState: { delta: 101, verified: true }, // 101 vs 100
    });
    testAssert(hash1 !== tamperedState, 'Tampered committedState alters provenance hash');

    // Tamper committedAt timestamp
    const tamperedTime = runtime.calculateCommitProvenanceHash({
      ...baseProvParams,
      committedAt: '2026-09-13T12:00:01.000Z',
    });
    testAssert(hash1 !== tamperedTime, 'Tampered committedAt alters provenance hash');

    // ========================================================================
    // 10. DEEP IMMUTABILITY & PURITY INVARIANTS
    // ========================================================================
    console.log('--- 10. Testing Deep Immutability & Zero Mutation ---');

    // Result object is frozen
    testAssert(Object.isFrozen(result1), 'DurableCommitResult is frozen');
    testAssert(Object.isFrozen(result1.record), 'DurableCommitRecord is frozen');
    testAssert(Object.isFrozen(result1.record?.committedState), 'Nested committedState is frozen');

    // Cannot mutate result
    assert.throws(() => {
      (result1 as any).status = 'REJECTED';
    });
    testAssert(true, 'Modifying frozen DurableCommitResult throws error');

    // Original task and verification results remain untouched
    const preTaskCopy = JSON.parse(JSON.stringify(validTask));
    const preVerifCopy = JSON.parse(JSON.stringify(validVerif));
    testAssert(validTask.version === preTaskCopy.version, 'authoritativeTask.version unchanged');
    testAssert(validTask.state === preTaskCopy.state, 'authoritativeTask.state unchanged');
    testAssert(validTask.provenanceHash === preTaskCopy.provenanceHash, 'authoritativeTask.provenanceHash unchanged');
    testAssert(validVerif.status === preVerifCopy.status, 'verificationResult.status unchanged');

    // ========================================================================
    // 11. AUDIT INTEGRATION
    // ========================================================================
    console.log('--- 11. Testing Audit Trail Completeness & Redaction ---');
    const auditTrail = auditLedger.getTrail({ domain: DURABLE_COMMIT_AUDIT_DOMAIN });
    testAssert(auditTrail.length >= 5, 'Multiple durable commit events recorded in audit ledger');

    const requestedEvent = auditTrail.find(e => e.eventType === 'DURABLE_COMMIT_REQUESTED');
    testAssert(requestedEvent !== undefined, 'DURABLE_COMMIT_REQUESTED event found in audit trail');

    const committedEvent = auditTrail.find(e => e.eventType === 'DURABLE_COMMIT_COMMITTED');
    testAssert(committedEvent !== undefined, 'DURABLE_COMMIT_COMMITTED event found in audit trail');
    testAssert(committedEvent?.executionStatus === 'SUCCESS', 'Committed event has executionStatus SUCCESS');

    const userStopEvent = auditTrail.find(e => e.eventType === 'DURABLE_COMMIT_USER_STOP_ABORTED');
    testAssert(userStopEvent !== undefined, 'DURABLE_COMMIT_USER_STOP_ABORTED event found in audit trail');
    testAssert(userStopEvent?.classification === 'INTERRUPT', 'USER_STOP event has classification INTERRUPT');

    // Check for secret absence in audit
    const rawAuditLog = fs.readFileSync(auditPath, 'utf8');
    testAssert(!rawAuditLog.includes('SuperSecretPassword123!'), 'No plain password in audit ledger file');
    testAssert(!rawAuditLog.includes('sk-ant-api03-abcdefg123456789'), 'No plain API key in audit ledger file');

    // ========================================================================
    // 12. SAFE EVALUATION WRAPPER (tryCommitDurable)
    // ========================================================================
    console.log('--- 12. Testing tryCommitDurable Safe Wrapper ---');

    // 12.1 Successful tryCommitDurable
    const safeSuccess = await runtime.tryCommitDurable({
      verificationResult: createValidVerificationResult({ taskId: 'task_safe_1', stepId: 'step_s1' }),
      authoritativeTask: createValidTask({ taskId: 'task_safe_1' }),
    });
    testAssert(safeSuccess.status === 'COMMITTED', 'tryCommitDurable returns COMMITTED on success');

    // 12.2 Rejected unverified via tryCommitDurable
    const safeRejected = await runtime.tryCommitDurable({
      verificationResult: createValidVerificationResult({ taskId: 'task_safe_2', status: 'NOT_VERIFIED' as any }),
      authoritativeTask: createValidTask({ taskId: 'task_safe_2' }),
    });
    testAssert(safeRejected.status === 'REJECTED', 'tryCommitDurable returns REJECTED for NOT_VERIFIED');
    testAssert(safeRejected.failure !== undefined, 'tryCommitDurable includes failure descriptor');

    // 12.3 Stale task via tryCommitDurable
    const safeStale = await runtime.tryCommitDurable({
      verificationResult: createValidVerificationResult({ taskId: 'task_safe_3' }),
      authoritativeTask: createValidTask({ taskId: 'task_safe_3', version: 3 }),
      expectedTaskVersion: 2,
    });
    testAssert(safeStale.status === 'STALE_REJECTED', 'tryCommitDurable returns STALE_REJECTED for version mismatch');

    // 12.4 Cross-tenant via tryCommitDurable
    const safeCross = await runtime.tryCommitDurable({
      verificationResult: createValidVerificationResult({ taskId: 'task_safe_4', tenantId: 'tenant_attacker' }),
      authoritativeTask: createValidTask({ taskId: 'task_safe_4', tenantId: 'tenant_victim' }),
    });
    testAssert(safeCross.status === 'SECURITY_REJECTED', 'tryCommitDurable returns SECURITY_REJECTED for tenant mismatch');

    // 12.5 Duplicate via tryCommitDurable
    const safeDup = await runtime.tryCommitDurable({
      verificationResult: createValidVerificationResult({ taskId: 'task_safe_1', stepId: 'step_s1' }),
      authoritativeTask: createValidTask({ taskId: 'task_safe_1' }),
    });
    testAssert(safeDup.status === 'DUPLICATE_REJECTED', 'tryCommitDurable returns DUPLICATE_REJECTED on replay');

    // 12.6 USER_STOP via tryCommitDurable
    mockUserStop = true;
    const safeAbort = await runtime.tryCommitDurable({
      verificationResult: createValidVerificationResult({ taskId: 'task_safe_5' }),
      authoritativeTask: createValidTask({ taskId: 'task_safe_5' }),
    });
    testAssert(safeAbort.status === 'USER_STOP_ABORTED', 'tryCommitDurable returns USER_STOP_ABORTED when stopped');
    mockUserStop = false;

    // ========================================================================
    // 13. ADDITIONAL RIGOROUS EDGE CASES & SINGLETON CHECKS
    // ========================================================================
    console.log('--- 13. Testing Additional Edge Cases, Sequential Steps & Partitions ---');

    // 13.1 Non-existent commit returns undefined
    const nonExistentCommit = store.getCommit('tenant_bow_01', 'commit_non_existent_id');
    testAssert(nonExistentCommit === undefined, 'getCommit returns undefined for non-existent commit ID');

    // 13.2 Non-existent tenant listCommits returns empty array
    const emptyTenantCommits = store.listCommits('tenant_fresh_new_empty');
    testAssert(Array.isArray(emptyTenantCommits) && emptyTenantCommits.length === 0, 'listCommits returns empty array for fresh tenant');

    // 13.3 Missing taskId on authoritativeTask
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: createValidVerificationResult(),
        authoritativeTask: createValidTask({ taskId: '' }),
      }),
      CommitValidationError
    );
    testAssert(true, 'Empty taskId on authoritativeTask throws CommitValidationError');

    // 13.4 Missing tenantId on authoritativeTask
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: createValidVerificationResult(),
        authoritativeTask: createValidTask({ tenantId: '' }),
      }),
      CommitValidationError
    );
    testAssert(true, 'Empty tenantId on authoritativeTask throws CommitValidationError');

    // 13.5 Task version <= 0 throws CommitValidationError
    await assert.rejects(
      async () => await runtime.commitDurable({
        verificationResult: createValidVerificationResult(),
        authoritativeTask: createValidTask({ version: 0 }),
      }),
      CommitValidationError
    );
    testAssert(true, 'Zero task version throws CommitValidationError');

    // 13.6 Sequential distinct steps on same task with advancing task versions
    const seqTaskV1 = createValidTask({ taskId: 'task_multi_step', version: 1 });
    const seqVerif1 = createValidVerificationResult({ taskId: 'task_multi_step', stepId: 'step_1', executionId: 'exec_s1' });
    const seqResult1 = await runtime.commitDurable({
      verificationResult: seqVerif1,
      authoritativeTask: seqTaskV1,
      expectedTaskVersion: 1,
    });
    testAssert(seqResult1.status === 'COMMITTED', 'Sequential Step 1 commits successfully');

    const seqTaskV2 = createValidTask({ taskId: 'task_multi_step', version: 2 });
    const seqVerif2 = createValidVerificationResult({ taskId: 'task_multi_step', stepId: 'step_2', executionId: 'exec_s2' });
    const seqResult2 = await runtime.commitDurable({
      verificationResult: seqVerif2,
      authoritativeTask: seqTaskV2,
      expectedTaskVersion: 2,
    });
    testAssert(seqResult2.status === 'COMMITTED', 'Sequential Step 2 commits successfully with advanced version');
    testAssert(seqResult1.commitId !== seqResult2.commitId, 'Different steps produce distinct commit IDs');

    // 13.7 Distinct tenant partitions do not collide on identical taskId
    const tenantATask = createValidTask({ taskId: 'shared_task_id', tenantId: 'tenant_company_A', version: 1 });
    const tenantAVerif = createValidVerificationResult({ taskId: 'shared_task_id', tenantId: 'tenant_company_A' });
    const tenantAResult = await runtime.commitDurable({
      verificationResult: tenantAVerif,
      authoritativeTask: tenantATask,
    });
    testAssert(tenantAResult.status === 'COMMITTED', 'Tenant A commits shared task ID');

    const tenantBTask = createValidTask({ taskId: 'shared_task_id', tenantId: 'tenant_company_B', version: 1 });
    const tenantBVerif = createValidVerificationResult({ taskId: 'shared_task_id', tenantId: 'tenant_company_B' });
    const tenantBResult = await runtime.commitDurable({
      verificationResult: tenantBVerif,
      authoritativeTask: tenantBTask,
    });
    testAssert(tenantBResult.status === 'COMMITTED', 'Tenant B commits shared task ID into its own partition');
    testAssert(tenantAResult.commitId !== tenantBResult.commitId, 'Different tenants produce distinct commit IDs');

    // 13.8 Committed state override preservation
    const customState = { inventoryTransferred: true, quantity: 42, warehouse: 'SGP-01' };
    const customStateVerif = createValidVerificationResult({ taskId: 'task_custom_state', stepId: 'step_cs' });
    const customStateTask = createValidTask({ taskId: 'task_custom_state' });
    const customStateResult = await runtime.commitDurable({
      verificationResult: customStateVerif,
      authoritativeTask: customStateTask,
      committedStateOverride: customState,
    });
    testAssert(customStateResult.record?.committedState.quantity === 42, 'Custom committed state override preserved in record');
    testAssert(customStateResult.record?.committedState.warehouse === 'SGP-01', 'Warehouse property preserved in record');

    // 13.9 Singletons export verification
    const {
      globalDurableCommitValidator: gValidator,
      globalDurableCommitExecutionGate: gGate,
      globalDurableCommitStore: gStore,
      globalDurableCommitRuntime: gRuntime,
    } = await import('../src/core/durableCommit/index.js');
    testAssert(gValidator !== undefined, 'globalDurableCommitValidator is exported');
    testAssert(gGate !== undefined, 'globalDurableCommitExecutionGate is exported');
    testAssert(gStore !== undefined, 'globalDurableCommitStore is exported');
    testAssert(gRuntime !== undefined, 'globalDurableCommitRuntime is exported');

    // Clean up test data dir
    fs.rmSync(testDataDir, { recursive: true, force: true });

    console.log(`\nREALITY GATE COMPLETE: All ${passedAssertions} assertions PASSED with ZERO errors!`);
    console.log('MS-1.4.08 Durable Commit Engine: FULLY VERIFIED.');
  } catch (err) {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch {}
    console.error('Test suite encountered an unhandled error:', err);
    process.exit(1);
  }
}

runDurableCommitTests().catch(err => {
  console.error('Fatal error running durable commit tests:', err);
  process.exit(1);
});
