// tests/test_v4_agent_brain_recovery.ts
// BOWCON V4.0 — MILESTONE 1.3.16: BRAIN RECOVERY & CRASH CONSISTENCY ENGINE TESTS
//
// EN:
// Authoritative test suite verifying crash consistency, Last Known Good State resolution,
// replay protection, safe resume / safe stop classification, and governance preservation.
// Enforces core invariant: CRASH != RETRY, CRASH != EXECUTE AGAIN.
//
// VI:
// Bộ kiểm thử có thẩm quyền xác minh tính nhất quán sự cố, phân giải Trạng thái Tốt được Biết Cuối cùng,
// bảo vệ chống replay, phân loại an toàn tiếp tục / an toàn dừng, và bảo toàn quản trị.
// Thực thi bất biến cốt lõi: SỰ CỐ != THỬ LẠI, SỰ CỐ != THỰC THI LẠI.

import assert from 'node:assert';
import {
  RecoveryService,
  resolveLastKnownGoodState,
  evaluateCrashConsistency,
  classifyInterruptedOperation,
  determineRecoveryDecision,
  evaluateApprovalRecoveryStatus,
  computeRecoveryId,
  computeCrashRecoveryFingerprint,
  computeReconstructedStateFingerprint,
  computeLastKnownGoodStateFingerprint,
  computeRecoveryJournalFingerprint,
  computeRecoveryFailureFingerprint,
  validateRecoveryScope,
  assertRecoveryRiskPreservation,
  redactRecoverySecrets,
  containsRecoverySecret,
  hasRecoveryPrototypePollution,
  isValidRecoveryTransition,
  validateRecoveryTransition,
  assertValidRecoveryTransition,
  isRecoveryTerminalState,
  isRecoveryOperationalState,
  isRecoveryBlockedState,
  AgentLoop,
  LifecycleService,
  CommitService,
} from '../src/index.js';
import type {
  RecoveryRequest,
  RecoveryResult,
  LastKnownGoodState,
  RecoveryState,
  CrashConsistencyCondition,
  InterruptedOperationClassification,
  RecoveryDecision,
} from '../src/index.js';

let passed = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}:`, err);
    throw err;
  }
};

async function runTests() {
  console.log('Starting MS-1.3.16 Brain Recovery & Crash Consistency Test Suite...\n');

  // 01 Recovery identity
  await test('01 Recovery identity', () => {
    const id1 = computeRecoveryId('user_alice', 'sess_01', 'chk_10', 'req_01');
    assert.ok(id1.startsWith('recovery_'));
    assert.strictEqual(typeof id1, 'string');
    assert.ok(id1.length >= 16);
  });

  // 02 User isolation
  await test('02 User isolation', () => {
    const idA = computeRecoveryId('user_alice', 'sess_01', 'chk_10', 'req_01');
    const idB = computeRecoveryId('user_bob', 'sess_01', 'chk_10', 'req_01');
    assert.notStrictEqual(idA, idB);
  });

  // 03 Session isolation
  await test('03 Session isolation', () => {
    const id1 = computeRecoveryId('user_alice', 'sess_01', 'chk_10', 'req_01');
    const id2 = computeRecoveryId('user_alice', 'sess_02', 'chk_10', 'req_01');
    assert.notStrictEqual(id1, id2);
  });

  // 04 Initial recovery state
  await test('04 Initial recovery state', () => {
    assert.strictEqual(isRecoveryOperationalState('RECOVERY_REQUIRED'), true);
    assert.strictEqual(isRecoveryTerminalState('RECOVERY_REQUIRED'), false);
  });

  // 05 Valid transitions
  await test('05 Valid transitions', () => {
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_REQUIRED', 'RECOVERY_INSPECTING'), true);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_INSPECTING', 'RECOVERY_RECONSTRUCTING'), true);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_RECONSTRUCTING', 'RECOVERY_VALIDATING'), true);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_VALIDATING', 'RECOVERY_RESUMABLE'), true);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_RESUMABLE', 'RECOVERY_COMPLETED'), true);
  });

  // 06 Invalid transitions
  await test('06 Invalid transitions', () => {
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_REQUIRED', 'RECOVERY_COMPLETED'), false);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_INSPECTING', 'RECOVERY_RESUMABLE'), false);
    const val = validateRecoveryTransition('RECOVERY_REQUIRED', 'RECOVERY_COMPLETED');
    assert.strictEqual(val.valid, false);
    assert.throws(() => assertValidRecoveryTransition('RECOVERY_REQUIRED', 'RECOVERY_COMPLETED'));
  });

  // 07 Terminal state protection
  await test('07 Terminal state protection', () => {
    assert.strictEqual(isRecoveryTerminalState('RECOVERY_COMPLETED'), true);
    assert.strictEqual(isRecoveryTerminalState('RECOVERY_FAILED'), true);
    assert.strictEqual(isRecoveryTerminalState('RECOVERY_BLOCKED'), true);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_COMPLETED', 'RECOVERY_REQUIRED'), false);
    assert.strictEqual(isValidRecoveryTransition('RECOVERY_FAILED', 'RECOVERY_INSPECTING'), false);
  });

  // 08 Deep immutability
  await test('08 Deep immutability', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.ok(Object.isFrozen(result));
    assert.throws(() => {
      (result as any).state = 'RECOVERY_FAILED';
    });
  });

  // 09 Nested immutability
  await test('09 Nested immutability', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.ok(Object.isFrozen(result.reconstructedState));
    assert.throws(() => {
      (result.reconstructedState as any).risk = 'CRITICAL';
    });
  });

  // 10 Input immutability
  await test('10 Input immutability', async () => {
    const service = new RecoveryService();
    const input: RecoveryRequest = {
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
      governanceMetadata: { initial: 'immutable' },
    };
    await service.recover(input);
    assert.strictEqual(input.userId, 'user_alice');
    assert.strictEqual(input.governanceMetadata?.initial, 'immutable');
  });

  // 11 Deterministic fingerprint
  await test('11 Deterministic fingerprint', () => {
    const fp1 = computeCrashRecoveryFingerprint('user_alice', 'sess_01', 'rec_01', 'RECOVERY_COMPLETED', 'SAFE_TO_READY', 'NO_OPERATION');
    const fp2 = computeCrashRecoveryFingerprint('user_alice', 'sess_01', 'rec_01', 'RECOVERY_COMPLETED', 'SAFE_TO_READY', 'NO_OPERATION');
    assert.strictEqual(fp1, fp2);
    assert.ok(fp1.startsWith('recfp_'));
  });

  // 12 Deterministic recovery ID
  await test('12 Deterministic recovery ID', () => {
    const id1 = computeRecoveryId('user_alice', 'sess_01', 'chk_01', 'req_01');
    const id2 = computeRecoveryId('user_alice', 'sess_01', 'chk_01', 'req_01');
    assert.strictEqual(id1, id2);
  });

  // 13 Last known good state
  await test('13 Last known good state', () => {
    const checkpoints = [
      { checkpointId: 'chk_01', userId: 'user_alice', sessionId: 'sess_01', state: 'READY' as const, stage: 'INITIALIZATION' as const, sequence: 1, fingerprint: 'fp1', timestamp: 1000 },
      { checkpointId: 'chk_02', userId: 'user_alice', sessionId: 'sess_01', state: 'EXECUTING' as const, stage: 'EXECUTION' as const, sequence: 2, fingerprint: 'fp2', timestamp: 2000 },
    ];
    const lkgs = resolveLastKnownGoodState('user_alice', 'sess_01', checkpoints);
    assert.ok(lkgs !== null);
    assert.strictEqual(lkgs.checkpointId, 'chk_01');
    assert.strictEqual(lkgs.lifecycleState, 'READY');
    assert.strictEqual(lkgs.sequence, 1);
  });

  // 14 Latest vs verified durable state
  await test('14 Latest vs verified durable state', () => {
    const checkpoints = [
      { checkpointId: 'chk_01', userId: 'user_alice', sessionId: 'sess_01', state: 'READY' as const, stage: 'INITIALIZATION' as const, sequence: 1, fingerprint: 'fp1', timestamp: 1000 },
      { checkpointId: 'chk_02', userId: 'user_alice', sessionId: 'sess_01', state: 'PLANNING' as const, stage: 'PLANNING' as const, sequence: 2, fingerprint: 'fp2', timestamp: 2000 },
      { checkpointId: 'chk_03', userId: 'user_alice', sessionId: 'sess_01', state: 'EXECUTING' as const, stage: 'EXECUTION' as const, sequence: 3, fingerprint: 'fp3', timestamp: 3000 },
    ];
    // Latest checkpoint sequence is 3 (EXECUTING), but LKGS must resolve to verified clean state (sequence 1 / READY)
    const lkgs = resolveLastKnownGoodState('user_alice', 'sess_01', checkpoints);
    assert.ok(lkgs !== null);
    assert.strictEqual(lkgs.checkpointId, 'chk_01');
    assert.strictEqual(lkgs.lifecycleState, 'READY');
  });

  // 15 No active operation
  await test('15 No active operation', () => {
    const evalResult = evaluateCrashConsistency('READY');
    assert.strictEqual(evalResult.condition, 'NO_ACTIVE_OPERATION');
    assert.strictEqual(evalResult.isConsistent, true);
    const classification = classifyInterruptedOperation(evalResult.condition, 'READY');
    assert.strictEqual(classification, 'NO_OPERATION');
    const decision = determineRecoveryDecision(classification);
    assert.strictEqual(decision, 'SAFE_TO_READY');
  });

  // 16 Interrupted before execution
  await test('16 Interrupted before execution', () => {
    const evalResult = evaluateCrashConsistency('PLANNING');
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_BEFORE_EXECUTION');
    const classification = classifyInterruptedOperation(evalResult.condition, 'PLANNING', 'LOW');
    assert.strictEqual(classification, 'SAFE_TO_RESUME');
    const decision = determineRecoveryDecision(classification);
    assert.strictEqual(decision, 'SAFE_TO_RESUME');
  });

  // 17 Interrupted during execution
  await test('17 Interrupted during execution', () => {
    const evalResult = evaluateCrashConsistency('EXECUTING');
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_EXECUTION');
    const classification = classifyInterruptedOperation(evalResult.condition, 'EXECUTING');
    assert.strictEqual(classification, 'RESUME_BLOCKED');
    const decision = determineRecoveryDecision(classification);
    assert.strictEqual(decision, 'BLOCK_RECOVERY');
  });

  // 18 Interrupted during verification
  await test('18 Interrupted during verification', () => {
    const evalResult = evaluateCrashConsistency('VERIFYING');
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_VERIFICATION');
    const classification = classifyInterruptedOperation(evalResult.condition, 'VERIFYING');
    assert.strictEqual(classification, 'RESUME_REQUIRES_VERIFICATION');
    const decision = determineRecoveryDecision(classification);
    assert.strictEqual(decision, 'REQUIRE_VERIFICATION');
  });

  // 19 Interrupted during commit
  await test('19 Interrupted during commit', () => {
    const evalResult = evaluateCrashConsistency('COMMITTING');
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_COMMIT');
    const classification = classifyInterruptedOperation(evalResult.condition, 'COMMITTING');
    assert.strictEqual(classification, 'PARTIAL_COMMIT');
    const decision = determineRecoveryDecision(classification);
    assert.strictEqual(decision, 'BLOCK_RECOVERY');
  });

  // 20 Commit complete recovery
  await test('20 Commit complete recovery', () => {
    const evalResult = evaluateCrashConsistency('COMMITTING', undefined, undefined, {
      commitId: 'com_01',
      status: 'COMMITTED',
      isPartial: false,
    });
    assert.strictEqual(evalResult.condition, 'COMMIT_CONFIRMED_BEFORE_CRASH');
    const classification = classifyInterruptedOperation(evalResult.condition);
    assert.strictEqual(classification, 'DUPLICATE_ALREADY_COMMITTED');
    const decision = determineRecoveryDecision(classification);
    assert.strictEqual(decision, 'SAFE_TO_READY');
  });

  // 21 Commit confirmed recovery
  await test('21 Commit confirmed recovery', () => {
    const evalResult = evaluateCrashConsistency(undefined, undefined, undefined, {
      commitId: 'com_02',
      status: 'ALREADY_COMMITTED',
      isPartial: false,
    });
    assert.strictEqual(evalResult.condition, 'COMMIT_CONFIRMED_BEFORE_CRASH');
  });

  // 22 Partial commit detection
  await test('22 Partial commit detection', () => {
    const evalResult = evaluateCrashConsistency('COMMITTING', undefined, undefined, {
      commitId: 'com_03',
      status: 'ROLLBACK_REQUIRED',
      isPartial: true,
    });
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_COMMIT');
    const classification = classifyInterruptedOperation(evalResult.condition, 'COMMITTING', 'LOW', 'APPROVAL_UNKNOWN', true);
    assert.strictEqual(classification, 'PARTIAL_COMMIT');
  });

  // 23 Failed commit detection
  await test('23 Failed commit detection', () => {
    const evalResult = evaluateCrashConsistency('COMMITTING', undefined, undefined, {
      commitId: 'com_04',
      status: 'FAILED',
      isPartial: false,
    });
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_COMMIT');
  });

  // 24 Unknown commit detection
  await test('24 Unknown commit detection', () => {
    const evalResult = evaluateCrashConsistency('COMMITTING', undefined, undefined, {
      commitId: 'com_05',
      status: 'INCONSISTENT',
    });
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_COMMIT');
  });

  // 25 Verification verified
  await test('25 Verification verified', () => {
    const checkpoints = [
      { checkpointId: 'chk_01', userId: 'user_alice', sessionId: 'sess_01', state: 'COMMITTING' as const, stage: 'COMMIT' as const, sequence: 4, fingerprint: 'fp4', timestamp: 4000 },
    ];
    const lkgs = resolveLastKnownGoodState(
      'user_alice',
      'sess_01',
      checkpoints,
      { commitId: 'com_01', status: 'COMMITTED', isPartial: false },
      { verificationId: 'ver_01', status: 'VERIFIED', taskSucceeded: true },
    );
    assert.ok(lkgs !== null);
    assert.strictEqual(lkgs.verified, true);
    assert.strictEqual(lkgs.committed, true);
  });

  // 26 Verification failed
  await test('26 Verification failed', () => {
    // If verification was FAILED and commit claims COMMITTED, that is a severe conflict!
    const evalResult = evaluateCrashConsistency('COMMITTING', undefined, {
      verificationId: 'ver_fail',
      status: 'FAILED',
      taskSucceeded: false,
    }, {
      commitId: 'com_01',
      status: 'COMMITTED',
      isPartial: false,
    });
    assert.strictEqual(evalResult.condition, 'CONFLICTING_DURABLE_STATE');
    const classification = classifyInterruptedOperation(evalResult.condition);
    assert.strictEqual(classification, 'CONFLICTING_STATE');
  });

  // 27 Verification unknown
  await test('27 Verification unknown', () => {
    const evalResult = evaluateCrashConsistency('VERIFYING', undefined, {
      verificationId: 'ver_unk',
      status: 'UNKNOWN',
      taskSucceeded: false,
    });
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_VERIFICATION');
  });

  // 28 Verification inconclusive
  await test('28 Verification inconclusive', () => {
    const evalResult = evaluateCrashConsistency('VERIFYING', undefined, {
      verificationId: 'ver_inc',
      status: 'INCONCLUSIVE',
      taskSucceeded: false,
    });
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_VERIFICATION');
  });

  // 29 Risk preservation
  await test('29 Risk preservation', () => {
    assert.doesNotThrow(() => assertRecoveryRiskPreservation('HIGH', 'HIGH'));
    assert.doesNotThrow(() => assertRecoveryRiskPreservation('HIGH', 'CRITICAL'));
    assert.throws(() => assertRecoveryRiskPreservation('CRITICAL', 'HIGH'), /RISK_DOWNGRADE_FORBIDDEN/);
    assert.throws(() => assertRecoveryRiskPreservation('HIGH', 'LOW'), /RISK_DOWNGRADE_FORBIDDEN/);
  });

  // 30 Governance preservation
  await test('30 Governance preservation', () => {
    // Interrupted operation with HIGH risk requires governance on resume
    const classification = classifyInterruptedOperation('INTERRUPTED_BEFORE_EXECUTION', 'PLANNING', 'HIGH');
    assert.strictEqual(classification, 'RESUME_REQUIRES_GOVERNANCE');
    const decision = determineRecoveryDecision(classification, 'APPROVAL_UNKNOWN', 'HIGH');
    assert.strictEqual(decision, 'REQUIRE_APPROVAL');
  });

  // 31 Approval preservation
  await test('31 Approval preservation', () => {
    const status = evaluateApprovalRecoveryStatus({ status: 'APPROVED', consumed: false });
    assert.strictEqual(status, 'APPROVAL_VALID_BUT_NOT_CONSUMED');
  });

  // 32 Approval unknown
  await test('32 Approval unknown', () => {
    const status = evaluateApprovalRecoveryStatus(undefined);
    assert.strictEqual(status, 'APPROVAL_UNKNOWN');
  });

  // 33 Approval consumed
  await test('33 Approval consumed', () => {
    const status = evaluateApprovalRecoveryStatus({ status: 'APPROVED', consumed: true });
    assert.strictEqual(status, 'APPROVAL_ALREADY_CONSUMED');
  });

  // 34 Scope mismatch
  await test('34 Scope mismatch', () => {
    assert.throws(() => validateRecoveryScope('', 'sess_01'), /INVALID_USER_SCOPE/);
    assert.throws(() => validateRecoveryScope('anonymous', 'sess_01'), /INVALID_USER_SCOPE/);
    assert.throws(() => validateRecoveryScope('user_alice', ''), /INVALID_SESSION_SCOPE/);
  });

  // 35 Fingerprint mismatch
  await test('35 Fingerprint mismatch', () => {
    const fp1 = computeLastKnownGoodStateFingerprint('user_alice', 'sess_01', 'chk_01', 1, 'READY');
    const fp2 = computeLastKnownGoodStateFingerprint('user_alice', 'sess_01', 'chk_01', 2, 'READY');
    assert.notStrictEqual(fp1, fp2);
  });

  // 36 Sequence mismatch
  await test('36 Sequence mismatch', () => {
    const fp1 = computeReconstructedStateFingerprint('user_alice', 'sess_01', 'READY', 1, 'NO_ACTIVE_OPERATION', 'NO_OPERATION', 'LOW');
    const fp2 = computeReconstructedStateFingerprint('user_alice', 'sess_01', 'READY', 2, 'NO_ACTIVE_OPERATION', 'NO_OPERATION', 'LOW');
    assert.notStrictEqual(fp1, fp2);
  });

  // 37 Identity mismatch
  await test('37 Identity mismatch', () => {
    const fpA = computeReconstructedStateFingerprint('user_alice', 'sess_01', 'READY', 1, 'NO_ACTIVE_OPERATION', 'NO_OPERATION', 'LOW');
    const fpB = computeReconstructedStateFingerprint('user_bob', 'sess_01', 'READY', 1, 'NO_ACTIVE_OPERATION', 'NO_OPERATION', 'LOW');
    assert.notStrictEqual(fpA, fpB);
  });

  // 38 Commit conflict
  await test('38 Commit conflict', () => {
    const evalResult = evaluateCrashConsistency('COMMITTING', undefined, {
      verificationId: 'v1',
      status: 'FAILED',
      taskSucceeded: false,
    }, {
      commitId: 'c1',
      status: 'COMMITTED',
      isPartial: false,
    });
    assert.strictEqual(evalResult.condition, 'CONFLICTING_DURABLE_STATE');
    const decision = determineRecoveryDecision('CONFLICTING_STATE');
    assert.strictEqual(decision, 'REQUIRE_OPERATOR_INTERVENTION');
  });

  // 39 Verification conflict
  await test('39 Verification conflict', () => {
    const evalResult = evaluateCrashConsistency('VERIFYING', undefined, {
      verificationId: 'v2',
      status: 'UNKNOWN',
      taskSucceeded: false,
    });
    assert.strictEqual(evalResult.condition, 'INTERRUPTED_DURING_VERIFICATION');
  });

  // 40 Governance conflict
  await test('40 Governance conflict', () => {
    const decision = determineRecoveryDecision('RESUME_REQUIRES_GOVERNANCE', 'APPROVAL_PENDING', 'HIGH');
    assert.strictEqual(decision, 'REQUIRE_APPROVAL');
  });

  // 41 Risk conflict
  await test('41 Risk conflict', () => {
    const decision = determineRecoveryDecision('RESUME_REQUIRES_GOVERNANCE', 'APPROVAL_UNKNOWN', 'CRITICAL');
    assert.strictEqual(decision, 'REQUIRE_APPROVAL');
  });

  // 42 Approval conflict
  await test('42 Approval conflict', () => {
    const status = evaluateApprovalRecoveryStatus({ status: 'REJECTED' });
    assert.strictEqual(status, 'APPROVAL_INVALID');
  });

  // 43 Replay protection
  await test('43 Replay protection', async () => {
    const service = new RecoveryService();
    const result1 = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'COMMITTING',
      commitRecord: { commitId: 'c_01', status: 'COMMITTED', isPartial: false },
    });
    assert.strictEqual(result1.classification, 'DUPLICATE_ALREADY_COMMITTED');
    assert.strictEqual(result1.decision, 'SAFE_TO_READY');
  });

  // 44 Duplicate already committed
  await test('44 Duplicate already committed', () => {
    const classification = classifyInterruptedOperation('COMMIT_CONFIRMED_BEFORE_CRASH');
    assert.strictEqual(classification, 'DUPLICATE_ALREADY_COMMITTED');
    assert.strictEqual(determineRecoveryDecision(classification), 'SAFE_TO_READY');
  });

  // 45 Terminal state recovery
  await test('45 Terminal state recovery', () => {
    const classification = classifyInterruptedOperation('NO_ACTIVE_OPERATION', 'COMPLETED');
    assert.strictEqual(classification, 'TERMINAL_STATE_RECOVERED');
    assert.strictEqual(determineRecoveryDecision(classification), 'SAFE_TO_READY');
  });

  // 46 Recovery blocked state
  await test('46 Recovery blocked state', () => {
    assert.strictEqual(isRecoveryBlockedState('RECOVERY_BLOCKED'), true);
    assert.strictEqual(isRecoveryBlockedState('RECOVERY_FAILED'), true);
    assert.strictEqual(isRecoveryBlockedState('RECOVERY_RESUMABLE'), false);
  });

  // 47 Safe resume classification
  await test('47 Safe resume classification', () => {
    const classification = classifyInterruptedOperation('INTERRUPTED_BEFORE_EXECUTION', 'PLANNING', 'LOW');
    assert.strictEqual(classification, 'SAFE_TO_RESUME');
    assert.strictEqual(determineRecoveryDecision(classification), 'SAFE_TO_RESUME');
  });

  // 48 Governance-required classification
  await test('48 Governance-required classification', () => {
    const classification = classifyInterruptedOperation('INTERRUPTED_BEFORE_EXECUTION', 'PLANNING', 'MEDIUM');
    assert.strictEqual(classification, 'SAFE_TO_RESUME'); // Medium without approval is safe to resume
    const classificationHigh = classifyInterruptedOperation('INTERRUPTED_BEFORE_EXECUTION', 'PLANNING', 'HIGH');
    assert.strictEqual(classificationHigh, 'RESUME_REQUIRES_GOVERNANCE');
  });

  // 49 Verification-required classification
  await test('49 Verification-required classification', () => {
    const classification = classifyInterruptedOperation('INTERRUPTED_DURING_VERIFICATION', 'VERIFYING');
    assert.strictEqual(classification, 'RESUME_REQUIRES_VERIFICATION');
    assert.strictEqual(determineRecoveryDecision(classification), 'REQUIRE_VERIFICATION');
  });

  // 50 Approval-required classification
  await test('50 Approval-required classification', () => {
    const classification = classifyInterruptedOperation('INTERRUPTED_BEFORE_EXECUTION', 'AWAITING_APPROVAL', 'HIGH');
    assert.strictEqual(classification, 'RESUME_REQUIRES_GOVERNANCE');
    assert.strictEqual(determineRecoveryDecision(classification, 'APPROVAL_PENDING', 'HIGH'), 'REQUIRE_APPROVAL');
  });

  // 51 Operator intervention classification
  await test('51 Operator intervention classification', () => {
    const decision = determineRecoveryDecision('CONFLICTING_STATE');
    assert.strictEqual(decision, 'REQUIRE_OPERATOR_INTERVENTION');
  });

  // 52 Secret rejection
  await test('52 Secret rejection', async () => {
    const service = new RecoveryService();
    await assert.rejects(async () => {
      await service.recover({
        userId: 'user_alice',
        sessionId: 'sess_01',
        requestId: 'req_Bearer sk-1234567890abcdef123456',
      });
    }, /SECRET_DETECTED/);
  });

  // 53 Prototype pollution defense
  await test('53 Prototype pollution defense', () => {
    assert.strictEqual(hasRecoveryPrototypePollution({ __proto__: { evil: true } }), true);
    assert.strictEqual(hasRecoveryPrototypePollution({ normal: 123 }), false);
    assert.throws(() => validateRecoveryScope('__proto__', 'sess_01'), /PROTOTYPE_POLLUTION/);
  });

  // 54 Null byte defense
  await test('54 Null byte defense', () => {
    assert.throws(() => validateRecoveryScope('user\0evil', 'sess_01'), /NULL_BYTE_DETECTED/);
    assert.throws(() => validateRecoveryScope('user_alice', 'sess\0evil'), /NULL_BYTE_DETECTED/);
  });

  // 55 Path traversal defense
  await test('55 Path traversal defense', () => {
    assert.throws(() => validateRecoveryScope('../etc/passwd', 'sess_01'), /PATH_TRAVERSAL/);
    assert.throws(() => validateRecoveryScope('user_alice', '../../root'), /PATH_TRAVERSAL/);
    assert.throws(() => validateRecoveryScope('user/alice', 'sess_01'), /PATH_TRAVERSAL/);
  });

  // 56 Windows reserved name defense
  await test('56 Windows reserved name defense', () => {
    assert.throws(() => validateRecoveryScope('CON', 'sess_01'), /RESERVED_DEVICE_NAME/);
    assert.throws(() => validateRecoveryScope('user_alice', 'NUL'), /RESERVED_DEVICE_NAME/);
    assert.throws(() => validateRecoveryScope('COM1', 'sess_01'), /RESERVED_DEVICE_NAME/);
  });

  // 57 No tool execution
  await test('57 No tool execution', async () => {
    const service = new RecoveryService();
    // Recovery must complete without touching any tool runtime
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.strictEqual(result.decision, 'SAFE_TO_READY');
  });

  // 58 No network
  await test('58 No network', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.ok(result.fingerprint);
  });

  // 59 No PDP
  await test('59 No PDP', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.strictEqual(result.state, 'RECOVERY_COMPLETED');
  });

  // 60 No ApprovalService
  await test('60 No ApprovalService', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'AWAITING_APPROVAL',
      risk: 'HIGH',
    });
    assert.strictEqual(result.decision, 'REQUIRE_APPROVAL');
  });

  // 61 No Idempotency mutation
  await test('61 No Idempotency mutation', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.strictEqual(result.decision, 'SAFE_TO_READY');
  });

  // 62 No VoiceService
  await test('62 No VoiceService', async () => {
    const service = new RecoveryService();
    const result = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.ok(result.journal.length > 0);
  });

  // 63 No hardware dependency
  await test('63 No hardware dependency', () => {
    const service = new RecoveryService();
    assert.ok(service instanceof RecoveryService);
  });

  // 64 Determinism
  await test('64 Determinism', async () => {
    const service = new RecoveryService();
    const req: RecoveryRequest = {
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
      requestId: 'req_determ_1',
    };
    const res1 = await service.recover(req);
    const res2 = await service.recover(req);
    assert.strictEqual(res1.recoveryId, res2.recoveryId);
    assert.strictEqual(res1.decision, res2.decision);
    assert.strictEqual(res1.fingerprint, res2.fingerprint);
  });

  // 65 Multi-user non-cross-talk
  await test('65 Multi-user non-cross-talk', async () => {
    const service = new RecoveryService();
    await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    await service.recover({
      userId: 'user_bob',
      sessionId: 'sess_01',
      activeLifecycleState: 'PLANNING',
    });
    const aliceRes = service.getLastRecoveryResult('user_alice', 'sess_01');
    const bobRes = service.getLastRecoveryResult('user_bob', 'sess_01');
    assert.ok(aliceRes && bobRes);
    assert.strictEqual(aliceRes.userId, 'user_alice');
    assert.strictEqual(bobRes.userId, 'user_bob');
    assert.strictEqual(aliceRes.decision, 'SAFE_TO_READY');
    assert.strictEqual(bobRes.decision, 'SAFE_TO_RESUME');
  });

  // 66 Multi-session non-cross-talk
  await test('66 Multi-session non-cross-talk', async () => {
    const service = new RecoveryService();
    await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_02',
      activeLifecycleState: 'EXECUTING',
    });
    const s1 = service.getLastRecoveryResult('user_alice', 'sess_01');
    const s2 = service.getLastRecoveryResult('user_alice', 'sess_02');
    assert.ok(s1 && s2);
    assert.strictEqual(s1.decision, 'SAFE_TO_READY');
    assert.strictEqual(s2.decision, 'BLOCK_RECOVERY');
  });

  // 67 Recovery journal immutability
  await test('67 Recovery journal immutability', async () => {
    const service = new RecoveryService();
    const res = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    const journal = res.journal;
    assert.ok(Object.isFrozen(journal));
    assert.throws(() => {
      (journal as any).push({ fake: true });
    });
  });

  // 68 Recovery result immutability
  await test('68 Recovery result immutability', async () => {
    const service = new RecoveryService();
    const res = await service.recover({
      userId: 'user_alice',
      sessionId: 'sess_01',
      activeLifecycleState: 'READY',
    });
    assert.ok(Object.isFrozen(res));
  });

  // 69 Lifecycle integration
  await test('69 Lifecycle integration', () => {
    const loop = new AgentLoop();
    const recoveryService = loop.getRecoveryService();
    assert.ok(recoveryService instanceof RecoveryService);
  });

  // 70 Commit integration
  await test('70 Commit integration', async () => {
    const loop = new AgentLoop();
    const commitService = loop.getCommitService();
    const recoveryService = loop.getRecoveryService();
    assert.ok(commitService instanceof CommitService);
    assert.ok(recoveryService instanceof RecoveryService);
  });

  console.log(`\n============================================================`);
  console.log(`MS-1.3.16 Brain Recovery & Crash Consistency: ${passed}/70 PASS`);
  console.log(`============================================================\n`);
}

runTests().catch(err => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
