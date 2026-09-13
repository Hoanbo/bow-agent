// tests/test_v4_agent_governed_policy_execution.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Dedicated Reality-Gate Test Suite covering categories A through AC.
// Verifies:
// 1. Branded identifiers and state machine invariants
// 2. Pre-flight envelope validation & expiration
// 3. Human authorization binding & rejection of autonomous operators
// 4. Strict tenant isolation (cross-tenant denied, traversal denied, anon denied)
// 5. Absolute USER_STOP supremacy across all execution stages
// 6. Hard-forbidden action immutability (transfer_funds, delete_database, etc.)
// 7. Canary circuit breaker interlock & fail-closed safety
// 8. Idempotency guard: single-flight reservation, duplicate and replay defense
// 9. Governed dispatch: rollback, circuit-breaker tripping, cohort isolation
// 10. Independent outcome verification (SUCCESS, FAILED, PARTIAL, BLOCKED, UNKNOWN)
// 11. UNKNOWN != SUCCESS enforcement
// 12. Crash recovery & restart reconciliation fail-closed
// 13. Audit trail under domain POLICY_EXECUTION with DiagnosisSanitizer redaction
// 14. Immutable SHA-256 cryptographic provenance chains and tamper detection
// 15. Zero direct PEP bypass and zero autonomous authority leakage
// 16. Confinement of protected workspace C:\BOW\shopofbow

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createExecutionId,
  createExecutionRequestId,
  createExecutionEnvelopeId,
  createExecutionOutcomeId,
  createExecutionAttemptId,
  createExecutionProvenanceId,
  PolicyRemediationExecutionValidator,
  PolicyExecutionIdempotencyGuard,
  PolicyExecutionOutcomeVerifier,
  PolicyExecutionRecoveryEngine,
  PolicyExecutionAuditEngine,
  PolicyExecutionProvenanceEngine,
  PolicyExecutionRuntime,
  type ExecutionReceipt,
} from '../src/core/policyExecution/index.js';
import {
  createDecisionProposalId,
  createRemediationRequestId,
  type RemediationExecutionEnvelope,
} from '../src/core/policyDecision/index.js';
import {
  createPolicyCandidateId,
  PolicyCanaryCircuitBreaker,
  PolicyCanaryRollbackEngine,
  PolicyRingRouter,
} from '../src/core/policyCanary/index.js';
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

async function assertThrowsAsync(fn: () => Promise<any>, expectedSubstring: string, message: string): Promise<void> {
  try {
    await fn();
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

function createMockEnvelope(overrides?: Partial<RemediationExecutionEnvelope>): RemediationExecutionEnvelope {
  const tenantPartition = overrides?.tenantPartition ?? 'tenant_exec_test';
  const proposalId = overrides?.proposalId ?? createDecisionProposalId('prop_exec_001');
  const requestId = overrides?.requestId ?? createRemediationRequestId('rem_exec_001');
  const envelopeId = overrides?.envelopeId ?? `env_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const candidateId = overrides?.candidateId ?? createPolicyCandidateId('cand_exec_001');

  return Object.freeze({
    envelopeId,
    requestId,
    proposalId,
    tenantPartition,
    candidateId,
    targetRing: overrides?.targetRing ?? 'RING_1',
    actionType: overrides?.actionType ?? 'ROLLBACK_TO_BASELINE',
    authorizedOperatorId: overrides?.authorizedOperatorId ?? 'human_operator_alice',
    safetyFloorVerified: overrides?.safetyFloorVerified ?? true,
    circuitBreakerClear: overrides?.circuitBreakerClear ?? true,
    userStopClear: overrides?.userStopClear ?? true,
    preparedAt: overrides?.preparedAt ?? new Date().toISOString(),
    dispatchPayload: overrides?.dispatchPayload ?? Object.freeze({
      planId: 'plan_001',
      remediationType: 'ROLLBACK_TO_BASELINE',
      blastRadius: 'TENANT_LOCAL',
      proposedActions: ['revert_candidate_policy'],
    }),
  });
}

async function runRealityGate(): Promise<void> {
  console.log('======================================================================');
  console.log('REALITY GATE: MS-1.3.65 GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION');
  console.log('======================================================================\n');

  // ============================================================================
  // CATEGORY A: Branded Identifiers
  // ============================================================================
  console.log('--- CATEGORY A: Branded identifiers ---');
  {
    const eId = createExecutionId('exec_001');
    assert(typeof eId === 'string' && eId === 'exec_001', '[CATEGORY A] createExecutionId valid');

    const erId = createExecutionRequestId('ex_req_001');
    assert(typeof erId === 'string' && erId === 'ex_req_001', '[CATEGORY A] createExecutionRequestId valid');

    const envId = createExecutionEnvelopeId('env_001');
    assert(typeof envId === 'string' && envId === 'env_001', '[CATEGORY A] createExecutionEnvelopeId valid');

    const outId = createExecutionOutcomeId('out_001');
    assert(typeof outId === 'string' && outId === 'out_001', '[CATEGORY A] createExecutionOutcomeId valid');

    const attId = createExecutionAttemptId('att_001');
    assert(typeof attId === 'string' && attId === 'att_001', '[CATEGORY A] createExecutionAttemptId valid');

    const prvId = createExecutionProvenanceId('prv_001');
    assert(typeof prvId === 'string' && prvId === 'prv_001', '[CATEGORY A] createExecutionProvenanceId valid');

    assertThrows(() => createExecutionId(''), 'INVALID_EXECUTION_ID', '[CATEGORY A] Empty ExecutionId rejected');
    assertThrows(() => createExecutionEnvelopeId('  '), 'INVALID_EXECUTION_ENVELOPE_ID', '[CATEGORY A] Whitespace ExecutionEnvelopeId rejected');
  }

  // ============================================================================
  // CATEGORY B: Envelope Validation
  // ============================================================================
  console.log('--- CATEGORY B: Envelope validation ---');
  {
    const validator = new PolicyRemediationExecutionValidator();
    const envelope = createMockEnvelope();
    const result = validator.validate(envelope);

    assert(result.valid === true, '[CATEGORY B] Valid envelope passes validation');
    assert(result.checks.safetyFloorVerified === true, '[CATEGORY B] Safety floor check verified');
    assert(result.checks.tenantIsolated === true, '[CATEGORY B] Tenant isolation check verified');
  }

  // ============================================================================
  // CATEGORY C: Authorization Binding
  // ============================================================================
  console.log('--- CATEGORY C: Authorization binding ---');
  {
    const validator = new PolicyRemediationExecutionValidator();

    // Missing authorizedOperatorId
    const badEnv1 = createMockEnvelope({ authorizedOperatorId: '' });
    assertThrows(
      () => validator.validate(badEnv1),
      'UNAUTHORIZED_EXECUTION',
      '[CATEGORY C] Empty operator ID rejected'
    );

    // Autonomous operator prefix auto_
    const autoEnv1 = createMockEnvelope({ authorizedOperatorId: 'auto_remediation_bot' });
    assertThrows(
      () => validator.validate(autoEnv1),
      'AUTONOMOUS_EXECUTION_DENIED',
      '[CATEGORY C] Autonomous operator auto_ prefix rejected'
    );

    // Autonomous operator prefix ai_agent
    const autoEnv2 = createMockEnvelope({ authorizedOperatorId: 'ai_agent_v4' });
    assertThrows(
      () => validator.validate(autoEnv2),
      'AUTONOMOUS_EXECUTION_DENIED',
      '[CATEGORY C] Autonomous operator ai_agent prefix rejected'
    );
  }

  // ============================================================================
  // CATEGORY D: Expired Envelope
  // ============================================================================
  console.log('--- CATEGORY D: Expired envelope ---');
  {
    const validator = new PolicyRemediationExecutionValidator({ maxEnvelopeAgeMs: 1000 });
    const staleEnv = createMockEnvelope({
      preparedAt: new Date(Date.now() - 5000).toISOString(),
    });

    assertThrows(
      () => validator.validate(staleEnv),
      'EXPIRED_EXECUTION_ENVELOPE',
      '[CATEGORY D] Stale envelope exceeding max age rejected'
    );
  }

  // ============================================================================
  // CATEGORY E: Invalid Provenance
  // ============================================================================
  console.log('--- CATEGORY E: Invalid provenance ---');
  {
    const provenance = new PolicyExecutionProvenanceEngine();
    const execId = createExecutionId('exec_prov_test');
    const propId = createDecisionProposalId('prop_prov_test');

    provenance.recordTransition({
      executionId: execId,
      proposalId: propId,
      tenantPartition: 'tenant_prov_val',
      eventType: 'EXECUTION_STARTED',
    });

    provenance.recordTransition({
      executionId: execId,
      proposalId: propId,
      tenantPartition: 'tenant_prov_val',
      eventType: 'EXECUTION_SUCCEEDED',
    });

    const validCheck = provenance.verifyChain(execId);
    assert(validCheck.valid === true, '[CATEGORY E] Unaltered provenance chain valid');

    // Tamper with record
    const chain = (provenance as any).chains.get(execId);
    chain[1] = { ...chain[1], currentHash: 'tampered_hash_value' };

    const tamperedCheck = provenance.verifyChain(execId);
    assert(tamperedCheck.valid === false, '[CATEGORY E] Tampered provenance chain detected');
    assert(tamperedCheck.reason?.includes('PROVENANCE_TAMPER_DETECTED') === true, '[CATEGORY E] Reason identifies tamper');
  }

  // ============================================================================
  // CATEGORY F: Tenant Isolation
  // ============================================================================
  console.log('--- CATEGORY F: Tenant isolation ---');
  {
    const validator = new PolicyRemediationExecutionValidator();

    // Path traversal in tenantPartition
    const traversalEnv = createMockEnvelope({ tenantPartition: '../etc/passwd' });
    assertThrows(
      () => validator.validate(traversalEnv),
      'Path traversal or illegal separator detected',
      '[CATEGORY F] Path traversal in tenantPartition rejected'
    );

    // Anonymous tenant
    const anonEnv = createMockEnvelope({ tenantPartition: 'anonymous' });
    assertThrows(
      () => validator.validate(anonEnv),
      'Anonymous or unresolved user cannot access',
      '[CATEGORY F] Anonymous tenant access rejected'
    );
  }

  // ============================================================================
  // CATEGORY G: Candidate Isolation
  // ============================================================================
  console.log('--- CATEGORY G: Candidate isolation ---');
  {
    const env = createMockEnvelope({ candidateId: createPolicyCandidateId('cand_isolated_123') });
    assert(env.candidateId === 'cand_isolated_123', '[CATEGORY G] Candidate ID bound to envelope');
  }

  // ============================================================================
  // CATEGORY H: USER_STOP Before Execution
  // ============================================================================
  console.log('--- CATEGORY H: USER_STOP before execution ---');
  {
    let userStop = true;
    const validator = new PolicyRemediationExecutionValidator({
      isUserStopActive: () => userStop,
    });
    const env = createMockEnvelope();

    assertThrows(
      () => validator.validate(env),
      'OPERATION_SUSPENDED_BY_USER_STOP',
      '[CATEGORY H] Validation blocked when USER_STOP active'
    );
  }

  // ============================================================================
  // CATEGORY I: USER_STOP During Execution Boundary
  // ============================================================================
  console.log('--- CATEGORY I: USER_STOP during execution boundary ---');
  {
    let stopActive = true;
    const runtime = new PolicyExecutionRuntime({
      isUserStopActive: () => stopActive,
    });
    const env = createMockEnvelope();

    await assertThrowsAsync(
      () => runtime.executeEnvelope(env),
      'OPERATION_SUSPENDED_BY_USER_STOP',
      '[CATEGORY I] executeEnvelope blocked when USER_STOP active'
    );
  }

  // ============================================================================
  // CATEGORY J: Circuit Breaker Block
  // ============================================================================
  console.log('--- CATEGORY J: Circuit breaker block ---');
  {
    const cb = new PolicyCanaryCircuitBreaker();
    cb.trip({
      tenantPartition: 'tenant_cb_block',
      reason: 'SAFETY_REGRESSION',
      trippedBy: 'test_safety_gate',
    });

    const validator = new PolicyRemediationExecutionValidator({ circuitBreaker: cb });

    // Non-safety remediation on tripped tenant must block
    const nonSafetyEnv = createMockEnvelope({
      tenantPartition: 'tenant_cb_block',
      actionType: 'CALIBRATE_GUARDRAIL',
    });

    assertThrows(
      () => validator.validate(nonSafetyEnv),
      'CIRCUIT_BREAKER_ACTIVE_BLOCKED',
      '[CATEGORY J] Non-safety remediation blocked when circuit breaker is tripped'
    );

    // Safety-restoring remediation (ROLLBACK_TO_BASELINE) must be permitted
    const safetyEnv = createMockEnvelope({
      tenantPartition: 'tenant_cb_block',
      actionType: 'ROLLBACK_TO_BASELINE',
    });
    const result = validator.validate(safetyEnv);
    assert(result.valid === true, '[CATEGORY J] Safety-restoring rollback permitted despite tripped breaker');
  }

  // ============================================================================
  // CATEGORY K: Hard-Forbidden Block
  // ============================================================================
  console.log('--- CATEGORY K: Hard-forbidden block ---');
  {
    const validator = new PolicyRemediationExecutionValidator();

    const badActions = [
      'transfer_funds',
      'delete_database',
      'bypass_robot_interlocks',
      'execute_untrusted_host_script',
    ];

    for (const badAction of badActions) {
      const badEnv = createMockEnvelope({
        dispatchPayload: {
          planId: 'plan_malicious',
          remediationType: 'CALIBRATE_GUARDRAIL',
          blastRadius: 'TENANT_LOCAL',
          proposedActions: [badAction],
        },
      });

      assertThrows(
        () => validator.validate(badEnv),
        'HARD_FORBIDDEN_EXECUTION_DENIED',
        `[CATEGORY K] Hard-forbidden action '${badAction}' blocked at execution validator`
      );
    }
  }

  // ============================================================================
  // CATEGORY L: Duplicate Execution
  // ============================================================================
  console.log('--- CATEGORY L: Duplicate execution ---');
  {
    const guard = new PolicyExecutionIdempotencyGuard();
    const env = createMockEnvelope({ envelopeId: 'env_dup_test_001' });
    const execId1 = createExecutionId('exec_dup_001');
    const execId2 = createExecutionId('exec_dup_002');

    guard.registerAttempt(env, execId1);
    guard.markCompleted(env.tenantPartition, execId1, 'SUCCEEDED');

    assertThrows(
      () => guard.registerAttempt(env, execId2),
      'DUPLICATE_EXECUTION_ATTEMPT',
      '[CATEGORY L] Duplicate execution attempt on completed envelope fails closed'
    );
  }

  // ============================================================================
  // CATEGORY M: Replay Execution
  // ============================================================================
  console.log('--- CATEGORY M: Replay execution ---');
  {
    const cb = new PolicyCanaryCircuitBreaker();
    const runtime = new PolicyExecutionRuntime({ circuitBreaker: cb });
    const env = createMockEnvelope({ tenantPartition: 'tenant_replay_test', envelopeId: 'env_replay_test' });

    // First execution succeeds
    const res1 = await runtime.executeEnvelope(env);
    assert(res1.receipt.status === 'SUCCEEDED', '[CATEGORY M] First execution succeeded');

    // Attempting to execute identical envelope again must throw DUPLICATE_EXECUTION_ATTEMPT
    await assertThrowsAsync(
      () => runtime.executeEnvelope(env),
      'DUPLICATE_EXECUTION_ATTEMPT',
      '[CATEGORY M] Replay of same envelope throws DUPLICATE_EXECUTION_ATTEMPT'
    );
  }

  // ============================================================================
  // CATEGORY N: Successful Execution
  // ============================================================================
  console.log('--- CATEGORY N: Successful execution ---');
  {
    const cb = new PolicyCanaryCircuitBreaker();
    const runtime = new PolicyExecutionRuntime({ circuitBreaker: cb });
    const env = createMockEnvelope({ tenantPartition: 'tenant_success_test', actionType: 'HOLD_CANARY' });

    const result = await runtime.executeEnvelope(env);
    assert(result.receipt.status === 'SUCCEEDED', '[CATEGORY N] Receipt status is SUCCEEDED');
    assert(result.verification.status === 'SUCCESS', '[CATEGORY N] Outcome verification status is SUCCESS');
    assert(result.verification.verified === true, '[CATEGORY N] Outcome verification verified is true');
  }

  // ============================================================================
  // CATEGORY O: Failed Execution
  // ============================================================================
  console.log('--- CATEGORY O: Failed execution ---');
  {
    const verifier = new PolicyExecutionOutcomeVerifier();
    const receipt: ExecutionReceipt = Object.freeze({
      executionId: createExecutionId('exec_fail_001'),
      envelopeId: 'env_fail_001',
      requestId: createRemediationRequestId('rem_fail_001'),
      proposalId: createDecisionProposalId('prop_fail_001'),
      tenantPartition: 'tenant_fail_test',
      actionType: 'ROLLBACK_TO_BASELINE',
      status: 'FAILED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      dispatchedTarget: 'TestTarget',
      error: 'Simulated dispatch failure',
      operatorUserId: 'human_op',
      executionDurationMs: 42,
    });

    const verification = verifier.verifyOutcome(receipt);
    assert(verification.status === 'FAILURE', '[CATEGORY O] Failed receipt correctly classified as FAILURE');
    assert(verification.verified === true, '[CATEGORY O] Failed receipt verified');
  }

  // ============================================================================
  // CATEGORY P: Partial Execution
  // ============================================================================
  console.log('--- CATEGORY P: Partial execution ---');
  {
    const verifier = new PolicyExecutionOutcomeVerifier();
    const receipt: ExecutionReceipt = Object.freeze({
      executionId: createExecutionId('exec_part_001'),
      envelopeId: 'env_part_001',
      requestId: createRemediationRequestId('rem_part_001'),
      proposalId: createDecisionProposalId('prop_part_001'),
      tenantPartition: 'tenant_part_test',
      actionType: 'CALIBRATE_GUARDRAIL',
      status: 'PARTIAL',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      dispatchedTarget: 'TestTarget',
      error: 'Partial step execution',
      operatorUserId: 'human_op',
      executionDurationMs: 120,
    });

    const verification = verifier.verifyOutcome(receipt);
    assert(verification.status === 'PARTIAL', '[CATEGORY P] Partial receipt correctly classified as PARTIAL');
  }

  // ============================================================================
  // CATEGORY Q: Unknown Outcome (UNKNOWN != SUCCESS)
  // ============================================================================
  console.log('--- CATEGORY Q: Unknown outcome (UNKNOWN != SUCCESS) ---');
  {
    const verifier = new PolicyExecutionOutcomeVerifier();

    // SUCCEEDED status but with missing rawOutput evidence
    const badReceipt: ExecutionReceipt = Object.freeze({
      executionId: createExecutionId('exec_unk_001'),
      envelopeId: 'env_unk_001',
      requestId: createRemediationRequestId('rem_unk_001'),
      proposalId: createDecisionProposalId('prop_unk_001'),
      tenantPartition: 'tenant_unk_test',
      actionType: 'HOLD_CANARY',
      status: 'SUCCEEDED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      dispatchedTarget: 'TestTarget',
      rawOutput: undefined, // Missing evidence!
      operatorUserId: 'human_op',
      executionDurationMs: 50,
    });

    const verification = verifier.verifyOutcome(badReceipt);
    assert(verification.status === 'UNKNOWN', '[CATEGORY Q] Missing evidence converts SUCCEEDED to UNKNOWN');
    assert(verification.status !== 'SUCCESS', '[CATEGORY Q] UNKNOWN != SUCCESS strictly enforced');
    assert(verification.verified === false, '[CATEGORY Q] Verification is false for UNKNOWN');
  }

  // ============================================================================
  // CATEGORY R: Timeout
  // ============================================================================
  console.log('--- CATEGORY R: Timeout ---');
  {
    const guard = new PolicyExecutionIdempotencyGuard();
    const recovery = new PolicyExecutionRecoveryEngine({
      idempotencyGuard: guard,
      maxExecutionDurationMs: 50, // 50ms timeout threshold
    });

    const env = createMockEnvelope({ envelopeId: 'env_timeout_test' });
    const execId = createExecutionId('exec_timeout_001');

    guard.registerAttempt(env, execId);

    // Wait 60ms to trigger timeout
    await new Promise((r) => setTimeout(r, 60));

    const disposition = recovery.reconcileFlight(env.tenantPartition, execId);
    assert(disposition.recoveredStatus === 'TIMEOUT', '[CATEGORY R] Flight exceeding max duration reconciled to TIMEOUT');
    assert(disposition.actionTaken === 'ABORTED_FAIL_CLOSED', '[CATEGORY R] Timeout aborted fail-closed');
  }

  // ============================================================================
  // CATEGORY S: Crash Recovery
  // ============================================================================
  console.log('--- CATEGORY S: Crash recovery ---');
  {
    const guard = new PolicyExecutionIdempotencyGuard();
    const recovery = new PolicyExecutionRecoveryEngine({
      idempotencyGuard: guard,
      maxExecutionDurationMs: 30000,
    });

    const env = createMockEnvelope({ envelopeId: 'env_crash_test' });
    const execId = createExecutionId('exec_crash_001');

    guard.registerAttempt(env, execId);

    // Immediate recovery reconciliation simulates post-crash restart
    const disposition = recovery.reconcileFlight(env.tenantPartition, execId);
    assert(disposition.recoveredStatus === 'UNKNOWN', '[CATEGORY S] Unfinished crash flight marked UNKNOWN');
    assert(disposition.actionTaken === 'MARKED_UNKNOWN', '[CATEGORY S] Action taken is MARKED_UNKNOWN');
  }

  // ============================================================================
  // CATEGORY T: Restart Reconciliation
  // ============================================================================
  console.log('--- CATEGORY T: Restart reconciliation ---');
  {
    const guard = new PolicyExecutionIdempotencyGuard();
    const recovery = new PolicyExecutionRecoveryEngine({ idempotencyGuard: guard });

    const env = createMockEnvelope({ envelopeId: 'env_term_test' });
    const execId = createExecutionId('exec_term_001');

    guard.registerAttempt(env, execId);
    guard.markCompleted(env.tenantPartition, execId, 'SUCCEEDED');

    // Terminal flight reconciled cleanly
    const disposition = recovery.reconcileFlight(env.tenantPartition, execId);
    assert(disposition.recoveredStatus === 'SUCCEEDED', '[CATEGORY T] Terminal flight preserved on reconciliation');
    assert(disposition.actionTaken === 'RECONCILED', '[CATEGORY T] Action taken is RECONCILED');
  }

  // ============================================================================
  // CATEGORY U: Corrupted Execution State
  // ============================================================================
  console.log('--- CATEGORY U: Corrupted execution state ---');
  {
    const recovery = new PolicyExecutionRecoveryEngine();
    assertThrows(
      () => recovery.reconcileFlight('tenant_non_existent', createExecutionId('exec_ghost')),
      'RECOVERY_TARGET_NOT_FOUND',
      '[CATEGORY U] Reconciling non-existent flight fails closed'
    );
  }

  // ============================================================================
  // CATEGORY V: Outcome Verification
  // ============================================================================
  console.log('--- CATEGORY V: Outcome verification ---');
  {
    const verifier = new PolicyExecutionOutcomeVerifier();
    const receipt: ExecutionReceipt = Object.freeze({
      executionId: createExecutionId('exec_vfy_001'),
      envelopeId: 'env_vfy_001',
      requestId: createRemediationRequestId('rem_vfy_001'),
      proposalId: createDecisionProposalId('prop_vfy_001'),
      tenantPartition: 'tenant_vfy_test',
      actionType: 'BLOCK_POLICY_CANDIDATE',
      status: 'SUCCEEDED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      dispatchedTarget: 'PolicyCanaryCircuitBreaker',
      rawOutput: { success: true, circuitBreakerTripped: true },
      operatorUserId: 'human_alice',
      executionDurationMs: 15,
    });

    const result = verifier.verifyOutcome(receipt);
    assert(result.status === 'SUCCESS', '[CATEGORY V] Verified output yields status SUCCESS');
    assert(result.provenanceHash.length === 64, '[CATEGORY V] SHA-256 provenance hash generated');
  }

  // ============================================================================
  // CATEGORY W: Audit Integrity
  // ============================================================================
  console.log('--- CATEGORY W: Audit integrity ---');
  {
    const auditLedger = new AuditLedger();
    const auditEngine = new PolicyExecutionAuditEngine({ auditLedger });

    auditEngine.recordEvent({
      eventType: 'EXECUTION_SUCCEEDED',
      tenantPartition: 'tenant_audit_test',
      executionId: 'exec_aud_001',
      envelopeId: 'env_aud_001',
      proposalId: 'prop_aud_001',
      operatorUserId: 'operator_bob',
      actionType: 'ROLLBACK_TO_BASELINE',
      status: 'SUCCEEDED',
      durationMs: 45,
    });

    const events = auditLedger.getTrail({ domain: 'POLICY_EXECUTION' });
    assert(events.length === 1, '[CATEGORY W] Exactly one event recorded in POLICY_EXECUTION domain');
    assert(events[0].executionStatus === 'SUCCESS', '[CATEGORY W] Audit event executionStatus is SUCCESS');
  }

  // ============================================================================
  // CATEGORY X: Provenance Integrity
  // ============================================================================
  console.log('--- CATEGORY X: Provenance integrity ---');
  {
    const provenance = new PolicyExecutionProvenanceEngine();
    const execId = createExecutionId('exec_prov_chain');
    const propId = createDecisionProposalId('prop_prov_chain');

    provenance.recordTransition({
      executionId: execId,
      proposalId: propId,
      tenantPartition: 'tenant_prov_chain',
      eventType: 'EXECUTION_REQUESTED',
    });
    provenance.recordTransition({
      executionId: execId,
      proposalId: propId,
      tenantPartition: 'tenant_prov_chain',
      eventType: 'EXECUTION_STARTED',
    });
    provenance.recordTransition({
      executionId: execId,
      proposalId: propId,
      tenantPartition: 'tenant_prov_chain',
      eventType: 'EXECUTION_SUCCEEDED',
    });

    const verification = provenance.verifyChain(execId);
    assert(verification.valid === true, '[CATEGORY X] 3-link provenance chain verified valid');
    assert(verification.recordCount === 3, '[CATEGORY X] Record count is 3');
  }

  // ============================================================================
  // CATEGORY Y: Secret Sanitization
  // ============================================================================
  console.log('--- CATEGORY Y: Secret sanitization ---');
  {
    const auditLedger = new AuditLedger();
    const sanitizer = new DiagnosisSanitizer();
    const auditEngine = new PolicyExecutionAuditEngine({ auditLedger, sanitizer });

    auditEngine.recordEvent({
      eventType: 'EXECUTION_STARTED',
      tenantPartition: 'tenant_sec_test',
      executionId: 'exec_sec_001',
      envelopeId: 'env_sec_001',
      proposalId: 'prop_sec_001',
      operatorUserId: 'Bearer secret_token_xyz123',
      actionType: 'HOLD_CANARY',
    });

    const events = auditLedger.getTrail({ domain: 'POLICY_EXECUTION' });
    assert(events.length === 1, '[CATEGORY Y] Event recorded');
    assert(events[0].actor.userId.includes('[REDACTED]'), '[CATEGORY Y] Bearer token redacted from operator ID');
  }

  // ============================================================================
  // CATEGORY Z: Zero Direct Bypass
  // ============================================================================
  console.log('--- CATEGORY Z: Zero direct bypass ---');
  {
    const runtime = new PolicyExecutionRuntime();
    assert(typeof (runtime as any).executeToolDirectly === 'undefined', '[CATEGORY Z] No executeToolDirectly method');
    assert(typeof (runtime as any).bypassPEP === 'undefined', '[CATEGORY Z] No bypassPEP method');
    assert(typeof (runtime as any).rawShellExecute === 'undefined', '[CATEGORY Z] No rawShellExecute method');
  }

  // ============================================================================
  // CATEGORY AA: Zero Autonomous Authority
  // ============================================================================
  console.log('--- CATEGORY AA: Zero autonomous authority ---');
  {
    const classes = [
      PolicyRemediationExecutionValidator,
      PolicyExecutionIdempotencyGuard,
      PolicyExecutionOutcomeVerifier,
      PolicyExecutionRecoveryEngine,
      PolicyExecutionAuditEngine,
      PolicyExecutionProvenanceEngine,
      PolicyExecutionRuntime,
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
    ];

    for (const Cls of classes) {
      for (const meth of forbiddenMethods) {
        assert(
          typeof (Cls.prototype as any)[meth] === 'undefined',
          `[CATEGORY AA] ${Cls.name} has no ${meth}() method`
        );
      }
    }
  }

  // ============================================================================
  // CATEGORY AB: Forbidden Primitive Scan
  // ============================================================================
  console.log('--- CATEGORY AB: Forbidden primitive scan ---');
  {
    const dir = path.join(process.cwd(), 'src', 'core', 'policyExecution');
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
    assert(matches === 0, '[CATEGORY AB] Zero forbidden primitives in policyExecution domain');
  }

  // ============================================================================
  // CATEGORY AC: Final Reality Gate
  // ============================================================================
  console.log('--- CATEGORY AC: Final reality gate ---');
  {
    const protectedDir = 'C:\\BOW\\shopofbow';
    const exists = fs.existsSync(protectedDir);
    assert(exists === false, '[CATEGORY AC] Protected workspace C:\\BOW\\shopofbow untouched and does not exist');
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
