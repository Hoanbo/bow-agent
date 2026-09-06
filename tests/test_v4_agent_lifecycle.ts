// tests/test_v4_agent_lifecycle.ts
// BOWCON V4.0 — MILESTONE 1.3.13: AGENT STATE & LIFECYCLE MANAGEMENT TESTS
//
// EN:
// Authoritative test suite verifying deterministic agent lifecycle states,
// validated state transitions, checkpoints, failure classification, recovery descriptors,
// and invariant boundaries (INV-STATE-01 through INV-STATE-15).
//
// VI:
// Bộ kiểm thử có thẩm quyền xác minh các trạng thái vòng đời agent tất định,
// chuyển đổi trạng thái đã xác thực, checkpoint, phân loại lỗi, bộ mô tả phục hồi,
// và các ranh giới bất biến (từ INV-STATE-01 đến INV-STATE-15).

import assert from 'node:assert';
import {
  LifecycleService,
  isValidTransition,
  validateStateTransition,
  assertValidTransition,
  isTerminalState,
  isOperationalState,
  isControlledExitState,
  mapStateToStage,
  computeStateFingerprint,
  computeTransitionFingerprint,
  computeCheckpointFingerprint,
  computeFailureFingerprint,
  computeRecoveryFingerprint,
  createFailureMetadata,
  createRecoveryMetadata,
  createLifecycleCheckpoint,
  validateScope,
  validateSafeMetadata,
  assertRiskPreservation,
  assertGovernancePreservation,
  redactLifecycleSecrets,
  AgentLoop,
} from '../src/index.js';
import type {
  LifecycleState,
  AgentLifecycleState,
} from '../src/index.js';

let passed = 0;
const test = (name: string, fn: () => void | Promise<void>) => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        passed++;
        console.log(`PASS ${name}`);
      }).catch((err) => {
        console.error(`FAIL ${name}:`, err);
        throw err;
      });
    }
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}:`, err);
    throw err;
  }
};

async function runTests() {
  console.log('Starting MS-1.3.13 Agent State & Lifecycle Management Test Suite...\n');

  // 01 Lifecycle identity
  await test('01 Lifecycle identity', () => {
    const service = new LifecycleService();
    const state = service.getOrCreateSession('user_alice', 'sess_001', 'READY');
    assert.ok(state.stateId.startsWith('state_'));
    assert.equal(state.userId, 'user_alice');
    assert.equal(state.sessionId, 'sess_001');
    assert.equal(state.currentState, 'READY');
    assert.equal(state.sequence, 1);
    assert.equal(state.version, '4.0.0');
    assert.ok(state.fingerprint.startsWith('state_'));
  });

  // 02 User isolation
  await test('02 User isolation', () => {
    const service = new LifecycleService();
    const aliceState = service.getOrCreateSession('user_alice', 'shared_sess', 'READY');
    const bobState = service.getOrCreateSession('user_bob', 'shared_sess', 'READY');

    assert.notEqual(aliceState.userId, bobState.userId);
    assert.notEqual(aliceState.fingerprint, bobState.fingerprint);

    service.transition('user_alice', 'shared_sess', 'RECEIVING', 'User query received');
    const aliceAfter = service.getState('user_alice', 'shared_sess');
    const bobAfter = service.getState('user_bob', 'shared_sess');

    assert.equal(aliceAfter.currentState, 'RECEIVING');
    assert.equal(bobAfter.currentState, 'READY', 'Bob state must NOT change when Alice transitions');
  });

  // 03 Session isolation
  await test('03 Session isolation', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_boss', 'sess_alpha', 'READY');
    service.getOrCreateSession('user_boss', 'sess_beta', 'READY');

    service.transition('user_boss', 'sess_alpha', 'RECEIVING', 'Alpha query');
    const alphaState = service.getState('user_boss', 'sess_alpha');
    const betaState = service.getState('user_boss', 'sess_beta');

    assert.equal(alphaState.currentState, 'RECEIVING');
    assert.equal(betaState.currentState, 'READY', 'Beta session must remain untouched');
  });

  // 04 State immutability
  await test('04 State immutability', () => {
    const service = new LifecycleService();
    const state = service.getOrCreateSession('user_boss', 'sess_mut', 'READY');
    assert.ok(Object.isFrozen(state), 'State must be frozen');

    assert.throws(() => {
      (state as any).currentState = 'COMPLETED';
    }, /Cannot assign to read only property/);
  });

  // 05 Nested immutability
  await test('05 Nested immutability', () => {
    const service = new LifecycleService();
    const state = service.getOrCreateSession('user_boss', 'sess_nest', 'READY', {
      safeMetadata: { traceId: 'trace_101', tags: ['v4', 'audit'] },
    });

    assert.ok(Object.isFrozen(state.safeMetadata), 'safeMetadata must be frozen');
    assert.throws(() => {
      (state.safeMetadata as any).traceId = 'tampered';
    }, /Cannot assign to read only property/);
  });

  // 06 Initial state
  await test('06 Initial state', () => {
    const service = new LifecycleService();
    const state = service.getOrCreateSession('user_init', 'sess_init', 'INITIALIZING');
    assert.equal(state.currentState, 'INITIALIZING');
    assert.equal(state.stage, 'INITIALIZATION');
  });

  // 07 READY transition
  await test('07 READY transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'INITIALIZING');
    const state = service.transition('user_1', 's_1', 'READY', 'Bootstrap complete');
    assert.equal(state.currentState, 'READY');
    assert.equal(state.previousState, 'INITIALIZING');
  });

  // 08 RECEIVING transition
  await test('08 RECEIVING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'READY');
    const state = service.transition('user_1', 's_1', 'RECEIVING', 'HTTP packet received');
    assert.equal(state.currentState, 'RECEIVING');
    assert.equal(state.previousState, 'READY');
    assert.equal(state.stage, 'CONTEXT');
  });

  // 09 CONTEXT_LOADING transition
  await test('09 CONTEXT_LOADING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'RECEIVING');
    const state = service.transition('user_1', 's_1', 'CONTEXT_LOADING', 'Loading session context');
    assert.equal(state.currentState, 'CONTEXT_LOADING');
    assert.equal(state.stage, 'CONTEXT');
  });

  // 10 UNDERSTANDING transition
  await test('10 UNDERSTANDING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'CONTEXT_LOADING');
    const state = service.transition('user_1', 's_1', 'UNDERSTANDING', 'Classifying intent');
    assert.equal(state.currentState, 'UNDERSTANDING');
    assert.equal(state.stage, 'INTENT');
  });

  // 11 PLANNING transition
  await test('11 PLANNING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'UNDERSTANDING');
    const state = service.transition('user_1', 's_1', 'PLANNING', 'Synthesizing candidate plan');
    assert.equal(state.currentState, 'PLANNING');
    assert.equal(state.stage, 'PLANNING');
  });

  // 12 DECIDING transition
  await test('12 DECIDING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'PLANNING');
    const state = service.transition('user_1', 's_1', 'DECIDING', 'Scoring candidate actions');
    assert.equal(state.currentState, 'DECIDING');
    assert.equal(state.stage, 'DECISION');
  });

  // 13 ORCHESTRATING transition
  await test('13 ORCHESTRATING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'DECIDING');
    const state = service.transition('user_1', 's_1', 'ORCHESTRATING', 'Bridging decision to execution request');
    assert.equal(state.currentState, 'ORCHESTRATING');
    assert.equal(state.stage, 'ORCHESTRATION');
  });

  // 14 AWAITING_APPROVAL transition
  await test('14 AWAITING_APPROVAL transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'ORCHESTRATING');
    const state = service.transition('user_1', 's_1', 'AWAITING_APPROVAL', 'High risk action demanded operator confirmation', {
      riskLevel: 'HIGH',
      approvalRequired: true,
    });
    assert.equal(state.currentState, 'AWAITING_APPROVAL');
    assert.equal(state.stage, 'APPROVAL');
    assert.equal(state.approvalRequired, true);
  });

  // 15 EXECUTING transition
  await test('15 EXECUTING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'ORCHESTRATING');
    const state = service.transition('user_1', 's_1', 'EXECUTING', 'Authorized capability dispatched to ToolExecutor');
    assert.equal(state.currentState, 'EXECUTING');
    assert.equal(state.stage, 'EXECUTION');
  });

  // 16 VERIFYING transition
  await test('16 VERIFYING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'EXECUTING');
    const state = service.transition('user_1', 's_1', 'VERIFYING', 'Auditing execution results against expected schema');
    assert.equal(state.currentState, 'VERIFYING');
    assert.equal(state.stage, 'VERIFICATION');
  });

  // 17 COMMITTING transition
  await test('17 COMMITTING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'VERIFYING');
    const state = service.transition('user_1', 's_1', 'COMMITTING', 'Committing turn update to session working memory');
    assert.equal(state.currentState, 'COMMITTING');
    assert.equal(state.stage, 'COMMIT');
  });

  // 18 RESPONDING transition
  await test('18 RESPONDING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'COMMITTING');
    const state = service.transition('user_1', 's_1', 'RESPONDING', 'Formatting natural language response');
    assert.equal(state.currentState, 'RESPONDING');
    assert.equal(state.stage, 'RESPONSE');
  });

  // 19 VOICE_PENDING transition
  await test('19 VOICE_PENDING transition', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'RESPONDING');
    const state = service.transition('user_1', 's_1', 'VOICE_PENDING', 'Synthesizing TTS audio stream');
    assert.equal(state.currentState, 'VOICE_PENDING');
    assert.equal(state.stage, 'VOICE');
  });

  // 20 COMPLETED terminal state
  await test('20 COMPLETED terminal state', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'VOICE_PENDING');
    const state = service.transition('user_1', 's_1', 'COMPLETED', 'Lifecycle cycle successfully ended');
    assert.equal(state.currentState, 'COMPLETED');
    assert.ok(isTerminalState(state.currentState));
  });

  // 21 Invalid transition rejection
  await test('21 Invalid transition rejection', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'UNDERSTANDING');

    assert.throws(() => {
      service.transition('user_1', 's_1', 'COMPLETED', 'Illegal jump');
    }, /ILLEGAL_TRANSITION/);
  });

  // 22 Arbitrary jump rejection
  await test('22 Arbitrary jump rejection', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'INITIALIZING');

    // INITIALIZING -> EXECUTING must be strictly forbidden (INV-STATE-05)
    assert.throws(() => {
      service.transition('user_1', 's_1', 'EXECUTING', 'Bypassing pipeline');
    }, /ILLEGAL_TRANSITION/);
  });

  // 23 Terminal state protection
  await test('23 Terminal state protection', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'VOICE_PENDING');
    service.transition('user_1', 's_1', 'COMPLETED', 'Finished');

    // Terminal state cannot transition to anything (INV-STATE-06)
    assert.throws(() => {
      service.transition('user_1', 's_1', 'EXECUTING', 'Cannot restart from terminal');
    }, /TERMINAL_STATE_LOCKED/);
  });

  // 24 BLOCKED state behavior
  await test('24 BLOCKED state behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'ORCHESTRATING');
    const state = service.transition('user_1', 's_1', 'BLOCKED', 'Blocked by policy gate');
    assert.equal(state.currentState, 'BLOCKED');
    assert.ok(isTerminalState('BLOCKED'));

    assert.throws(() => {
      service.transition('user_1', 's_1', 'EXECUTING', 'Cannot execute from blocked');
    }, /TERMINAL_STATE_LOCKED/);
  });

  // 25 REJECTED state behavior
  await test('25 REJECTED state behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'AWAITING_APPROVAL');
    const state = service.transition('user_1', 's_1', 'REJECTED', 'Operator explicitly rejected request');
    assert.equal(state.currentState, 'REJECTED');
    assert.ok(isTerminalState('REJECTED'));
  });

  // 26 CANCELLED state behavior
  await test('26 CANCELLED state behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'RECEIVING');
    const state = service.transition('user_1', 's_1', 'CANCELLED', 'Client disconnected');
    assert.equal(state.currentState, 'CANCELLED');
    assert.ok(isTerminalState('CANCELLED'));
  });

  // 27 CLARIFICATION_REQUIRED behavior
  await test('27 CLARIFICATION_REQUIRED behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'UNDERSTANDING');
    const state = service.transition('user_1', 's_1', 'CLARIFICATION_REQUIRED', 'Ambiguous reference detected');
    assert.equal(state.currentState, 'CLARIFICATION_REQUIRED');
    assert.ok(isControlledExitState('CLARIFICATION_REQUIRED'));

    // Can transition to COMPLETED or return to READY
    const next = service.transition('user_1', 's_1', 'COMPLETED', 'Clarification sent');
    assert.equal(next.currentState, 'COMPLETED');
  });

  // 28 DEFERRED behavior
  await test('28 DEFERRED behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'PLANNING');
    const state = service.transition('user_1', 's_1', 'DEFERRED', 'Waiting on external prerequisite');
    assert.equal(state.currentState, 'DEFERRED');
    assert.ok(isControlledExitState('DEFERRED'));
  });

  // 29 FAILED state behavior
  await test('29 FAILED state behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'EXECUTING');
    const state = service.recordFailure(
      'user_1',
      's_1',
      'Underlying tool handler crashed',
      'EXECUTION_FAILURE',
      false,
    );
    assert.equal(state.currentState, 'FAILED');
    assert.ok(state.failure !== undefined);
    assert.equal(state.failure?.category, 'EXECUTION_FAILURE');
    assert.equal(state.failure?.recoverable, false);
  });

  // 30 RECOVERABLE state behavior
  await test('30 RECOVERABLE state behavior', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_1', 's_1', 'EXECUTING');
    const state = service.recordFailure(
      'user_1',
      's_1',
      'Transient rate limit encountered',
      'EXECUTION_FAILURE',
      true,
    );
    assert.equal(state.currentState, 'RECOVERABLE');
    assert.equal(state.failure?.recoverable, true);
  });

  // 31 Recovery metadata immutability
  await test('31 Recovery metadata immutability', () => {
    const recovery = createRecoveryMetadata({
      userId: 'user_boss',
      sessionId: 'sess_1',
      recoverable: true,
      failedState: 'EXECUTING',
      recoveryState: 'READY',
      attemptNumber: 1,
      maxAttempts: 3,
    });
    assert.ok(Object.isFrozen(recovery));
    assert.throws(() => {
      (recovery as any).retryAllowed = false;
    }, /Cannot assign to read only property/);
  });

  // 32 Recovery cannot execute anything
  await test('32 Recovery cannot execute anything', () => {
    const recovery = createRecoveryMetadata({
      userId: 'user_boss',
      sessionId: 'sess_1',
      recoverable: true,
      failedState: 'EXECUTING',
      recoveryState: 'READY',
    });
    assert.equal(typeof (recovery as any).execute, 'undefined');
    assert.equal(typeof (recovery as any).retry, 'undefined');
    assert.equal(typeof (recovery as any).run, 'undefined');
  });

  // 33 Checkpoint immutability
  await test('33 Checkpoint immutability', () => {
    const chk = createLifecycleCheckpoint({
      userId: 'user_boss',
      sessionId: 'sess_chk',
      state: 'PLANNING',
      stage: 'PLANNING',
      sequence: 5,
    });
    assert.ok(Object.isFrozen(chk));
    assert.throws(() => {
      (chk as any).state = 'COMPLETED';
    }, /Cannot assign to read only property/);
  });

  // 34 Deterministic checkpoint fingerprint
  await test('34 Deterministic checkpoint fingerprint', () => {
    const fp1 = computeCheckpointFingerprint('user_1', 'sess_1', 'DECIDING', 7, 'corr_101');
    const fp2 = computeCheckpointFingerprint('user_1', 'sess_1', 'DECIDING', 7, 'corr_101');
    assert.equal(fp1, fp2, 'Fingerprints with identical inputs must match exactly');
  });

  // 35 Deterministic transition fingerprint
  await test('35 Deterministic transition fingerprint', () => {
    const fp1 = computeTransitionFingerprint('u1', 's1', 'READY', 'RECEIVING', 2, 'query');
    const fp2 = computeTransitionFingerprint('u1', 's1', 'READY', 'RECEIVING', 2, 'query');
    assert.equal(fp1, fp2);
  });

  // 36 Risk preservation
  await test('36 Risk preservation', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_boss', 'sess_risk', 'READY', { riskLevel: 'HIGH' });

    // Attempting to downgrade HIGH -> LOW must throw (INV-STATE-07)
    assert.throws(() => {
      service.transition('user_boss', 'sess_risk', 'RECEIVING', 'Process query', {
        riskLevel: 'LOW',
      });
    }, /RISK_DOWNGRADE_FORBIDDEN/);
  });

  // 37 Governance metadata preservation
  await test('37 Governance metadata preservation', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_boss', 'sess_gov', 'READY', { governanceRequired: true });

    // Clearing governanceRequired must throw (INV-STATE-08)
    assert.throws(() => {
      service.transition('user_boss', 'sess_gov', 'RECEIVING', 'Incoming request', {
        governanceRequired: false,
      });
    }, /GOVERNANCE_DOWNGRADE_FORBIDDEN/);
  });

  // 38 Approval metadata preservation
  await test('38 Approval metadata preservation', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_boss', 'sess_appr', 'READY', { approvalRequired: true });

    // Clearing approvalRequired must throw (INV-STATE-09)
    assert.throws(() => {
      service.transition('user_boss', 'sess_appr', 'RECEIVING', 'Incoming request', {
        approvalRequired: false,
      });
    }, /APPROVAL_REMOVAL_FORBIDDEN/);
  });

  // 39 Secret rejection
  await test('39 Secret rejection', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_boss', 'sess_secret', 'READY');

    assert.throws(() => {
      service.transition('user_boss', 'sess_secret', 'RECEIVING', 'Normal transition', {
        safeMetadata: { apiKey: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token' },
      });
    }, /SECRET_LEAKAGE_DETECTED/);
  });

  // 40 Prototype pollution defense
  await test('40 Prototype pollution defense', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('user_boss', 'sess_proto', 'READY');

    const maliciousPayload = JSON.parse('{"__proto__": {"injected": true}}');
    assert.throws(() => {
      service.transition('user_boss', 'sess_proto', 'RECEIVING', 'Normal transition', {
        safeMetadata: maliciousPayload,
      });
    }, /PROTOTYPE_POLLUTION_DETECTED/);
  });

  // 41 Null byte defense
  await test('41 Null byte defense', () => {
    const service = new LifecycleService();
    assert.throws(() => {
      service.getOrCreateSession('user_boss\0evil', 'sess_null', 'READY');
    }, /NULL_BYTE_DETECTED/);

    assert.throws(() => {
      service.getOrCreateSession('user_boss', 'sess_\0evil', 'READY');
    }, /NULL_BYTE_DETECTED/);
  });

  // 42 Scope mismatch rejection
  await test('42 Scope mismatch rejection', () => {
    const service = new LifecycleService();
    assert.throws(() => {
      service.getOrCreateSession('anonymous', 'sess_valid', 'READY');
    }, /DISALLOWED_USER_SCOPE/);

    assert.throws(() => {
      service.getOrCreateSession('', 'sess_valid', 'READY');
    }, /INVALID_USER_ID/);
  });

  // 43 Determinism
  await test('43 Determinism', () => {
    const service1 = new LifecycleService();
    const service2 = new LifecycleService();

    const s1 = service1.getOrCreateSession('u1', 's1', 'READY', { timestamp: 1000 });
    const s2 = service2.getOrCreateSession('u1', 's1', 'READY', { timestamp: 1000 });

    assert.equal(s1.fingerprint, s2.fingerprint);
    assert.equal(s1.stateId, s2.stateId);
  });

  // 44 No external side effects
  await test('44 No external side effects', () => {
    const service = new LifecycleService();
    const state = service.getOrCreateSession('u1', 's1', 'READY');
    service.createCheckpoint('u1', 's1');

    // Verify service exposes no network or mutation handles
    assert.equal(typeof (service as any).fetch, 'undefined');
    assert.equal(typeof (service as any).send, 'undefined');
    assert.equal(typeof (service as any).execute, 'undefined');
  });

  // 45 No ToolRegistry invocation
  await test('45 No ToolRegistry invocation', () => {
    const service = new LifecycleService();
    assert.equal(typeof (service as any).toolRegistry, 'undefined');
    assert.equal(typeof (service as any).executeTool, 'undefined');
  });

  // 46 No PDP invocation
  await test('46 No PDP invocation', () => {
    const service = new LifecycleService();
    assert.equal(typeof (service as any).evaluatePolicy, 'undefined');
    assert.equal(typeof (service as any).pdp, 'undefined');
  });

  // 47 No ApprovalService invocation
  await test('47 No ApprovalService invocation', () => {
    const service = new LifecycleService();
    assert.equal(typeof (service as any).generateApprovalToken, 'undefined');
    assert.equal(typeof (service as any).approvalService, 'undefined');
  });

  // 48 No IdempotencyStore invocation
  await test('48 No IdempotencyStore invocation', () => {
    const service = new LifecycleService();
    assert.equal(typeof (service as any).idempotencyStore, 'undefined');
    assert.equal(typeof (service as any).claimReservation, 'undefined');
  });

  // 49 Voice boundary
  await test('49 Voice boundary', () => {
    const service = new LifecycleService();
    service.getOrCreateSession('u1', 's1', 'RESPONDING');
    const state = service.transition('u1', 's1', 'VOICE_PENDING', 'Awaiting voice output');
    assert.equal(state.currentState, 'VOICE_PENDING');
    // Does NOT generate audio bytes
    assert.equal(typeof (state as any).audioBuffer, 'undefined');
    assert.equal(typeof (state as any).speak, 'undefined');
  });

  // 50 Memory boundary
  await test('50 Memory boundary', () => {
    const service = new LifecycleService();
    assert.equal(typeof (service as any).durableStore, 'undefined');
    assert.equal(typeof (service as any).writeMemory, 'undefined');
    assert.equal(typeof (service as any).saveProfile, 'undefined');
  });

  // 51 AgentLoop integration contract
  await test('51 AgentLoop integration contract', async () => {
    const loop = new AgentLoop();
    assert.ok(typeof loop.getLifecycleService === 'function');
    const ls = loop.getLifecycleService();
    assert.ok(ls instanceof LifecycleService);

    // Verify AgentLoop executes smoothly with LifecycleService integrated
    const result = await loop.execute({
      userId: 'boss_user',
      sessionId: 'sess_lifecycle_contract_test',
      userText: 'xin chào',
      actor: {
        userId: 'boss_user',
        role: 'owner',
        channel: 'web',
        isOwner: true,
      },
    });

    assert.equal(result.orchestrationResult?.success, true);
    assert.ok(result.response !== undefined);
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n============================================================`);
  console.log(`MS-1.3.13 lifecycle: ${passed}/51 PASS`);
  console.log(`============================================================\n`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
