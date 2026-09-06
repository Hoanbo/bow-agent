// tests/test_v4_agent_action_orchestration.ts
// BOWCON V4.0 — MILESTONE 1.3.11: AGENT ACTION ORCHESTRATION & GOVERNED EXECUTION BRIDGE TESTS
//
// EN:
// Authoritative test suite verifying deterministic action orchestration,
// risk preservation, governance bridge boundaries, and fail-closed gate evaluation
// without direct tool execution, PDP bypass, or memory mutation.
//
// VI:
// Bộ kiểm thử có thẩm quyền xác minh điều phối hành động tất định,
// bảo tồn rủi ro, ranh giới cầu nối quản trị, và đánh giá cổng fail-closed
// mà không thực thi công cụ trực tiếp, bỏ qua PDP hay thay đổi bộ nhớ.

import assert from 'node:assert';
import {
  IntentService,
  PlanningService,
  createDecisionContext,
  DecisionService,
  ActionOrchestrator,
  createExecutionIntent,
  createExecutionRequest,
  evaluateExecutionGate,
  getPolicyRulesForRisk,
  assertRiskNotDowngraded,
  computeDeterministicExecutionFingerprint,
  validateOrchestrationInput,
  validateParameters,
  AgentLoop,
} from '../src/index.js';
import type { DecisionInput, DecisionResult } from '../src/index.js';

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`PASS ${name}`);
};

const intentService = new IntentService();
const planningService = new PlanningService();
const decisionService = new DecisionService();
const orchestrator = new ActionOrchestrator();

function createTestDecision(
  text: string,
  turns: any[] = [],
  userId = 'user_test',
  sessionId = 'session_test',
): { decision: DecisionResult; input: DecisionInput } {
  const baseInput = {
    userId,
    sessionId,
    userText: text,
    context: { recentTurns: turns },
    workingMemory: turns,
  };
  const semanticIntent = intentService.interpret(baseInput);
  const plan = planningService.plan(baseInput, semanticIntent);
  const context = createDecisionContext(baseInput, semanticIntent);
  const input: DecisionInput = { context, plan };
  const decision = decisionService.decide(input);
  return { decision, input };
}

// =========================================================================
// TEST SECTIONS 01 - 40
// =========================================================================

// --- 1. IDENTITY & ISOLATION ---

// 01 ExecutionIntent identity
test('01 ExecutionIntent identity', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const result = orchestrator.orchestrate(decision);
  assert.equal(result.success, true);
  assert.ok(result.executionIntent !== undefined);
  assert.equal(result.executionIntent?.userId, 'user_test');
  assert.equal(result.executionIntent?.sessionId, 'session_test');
  assert.equal(result.executionIntent?.actionType, 'CANCEL_REQUEST');
  assert.equal(result.executionIntent?.targetDomain, 'orders');
  assert.ok(result.executionIntent?.actionId.startsWith('act_'));
});

// 02 User isolation
test('02 User isolation', () => {
  const { decision: decA } = createTestDecision('hủy đơn #1234', [], 'user_alice', 'session_1');
  const { decision: decB } = createTestDecision('hủy đơn #1234', [], 'user_bob', 'session_1');
  const resA = orchestrator.orchestrate(decA);
  const resB = orchestrator.orchestrate(decB);
  assert.equal(resA.executionIntent?.userId, 'user_alice');
  assert.equal(resB.executionIntent?.userId, 'user_bob');
  assert.notEqual(resA.fingerprint, resB.fingerprint);

  // Unauthenticated user scope rejected fail-closed
  const invalidUserDec: DecisionResult = {
    ...decA,
    userId: 'anonymous',
  };
  const blocked = orchestrator.orchestrate(invalidUserDec);
  assert.equal(blocked.success, false);
  assert.equal(blocked.status, 'BLOCKED');
});

// 03 Session isolation
test('03 Session isolation', () => {
  const { decision: decS1 } = createTestDecision('hủy đơn #1234', [], 'user_alice', 'sess_alpha');
  const { decision: decS2 } = createTestDecision('hủy đơn #1234', [], 'user_alice', 'sess_beta');
  const resS1 = orchestrator.orchestrate(decS1);
  const resS2 = orchestrator.orchestrate(decS2);
  assert.equal(resS1.executionIntent?.sessionId, 'sess_alpha');
  assert.equal(resS2.executionIntent?.sessionId, 'sess_beta');
  assert.notEqual(resS1.fingerprint, resS2.fingerprint);

  // Cross-context scope mismatch detection
  const { input: inputContext } = createTestDecision('hủy đơn #1234', [], 'user_alice', 'sess_other');
  const mismatched = orchestrator.orchestrate(decS1, inputContext.context);
  assert.equal(mismatched.success, false);
  assert.equal(mismatched.status, 'BLOCKED');
});

// 04 Immutable intent
test('04 Immutable intent', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const result = orchestrator.orchestrate(decision);
  assert.ok(result.executionIntent !== undefined);
  assert.equal(Object.isFrozen(result.executionIntent), true);
  assert.equal(Object.isFrozen(result.executionIntent?.parameters), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.reasons), true);
});

// --- 2. DECISION STATE MAPPING ---

// 05 NO_ACTION
test('05 NO_ACTION', () => {
  const gate = evaluateExecutionGate('NO_ACTION', 'LOW', false);
  assert.equal(gate.status, 'NO_ACTION');
  assert.equal(gate.canProceedToGovernance, false);

  const { decision } = createTestDecision('kiểm tra đơn #1234');
  const noActionDec: DecisionResult = { ...decision, state: 'NO_ACTION', selectedAction: undefined };
  const res = orchestrator.orchestrate(noActionDec);
  assert.equal(res.status, 'NO_ACTION');
  assert.equal(res.executionIntent, undefined);
  assert.equal(res.executionRequest, undefined);
});

// 06 RESPOND
test('06 RESPOND', () => {
  const gate = evaluateExecutionGate('RESPOND', 'LOW', false);
  assert.equal(gate.status, 'NO_ACTION');
  assert.equal(gate.canProceedToGovernance, false);

  const { decision } = createTestDecision('giải thích idempotency');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.status, 'NO_ACTION');
  assert.equal(res.executionRequest, undefined);
});

// 07 CLARIFY
test('07 CLARIFY', () => {
  const { decision } = createTestDecision('hủy đơn'); // Missing order parameter
  assert.equal(decision.state, 'CLARIFY');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.status, 'CLARIFICATION_REQUIRED');
  assert.equal(res.requiresClarification, true);
  assert.equal(res.executionRequest, undefined);
});

// 08 PROPOSE_ACTION
test('08 PROPOSE_ACTION', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  assert.equal(decision.state, 'PROPOSE_ACTION');
  const res = orchestrator.orchestrate(decision);
  assert.ok(res.status === 'READY' || res.status === 'WAITING_APPROVAL');
  assert.ok(res.executionIntent !== undefined);
  assert.ok(res.executionRequest !== undefined);
  assert.equal(res.executionRequest?.toolName, 'cancel_order');
});

// 09 DEFER
test('09 DEFER', () => {
  const gate = evaluateExecutionGate('DEFER', 'LOW', false);
  assert.equal(gate.status, 'DEFERRED');
  assert.equal(gate.canProceedToGovernance, false);

  const { decision } = createTestDecision('kiểm tra đơn #1234');
  const deferDec: DecisionResult = { ...decision, state: 'DEFER' };
  const res = orchestrator.orchestrate(deferDec);
  assert.equal(res.status, 'DEFERRED');
  assert.equal(res.executionRequest, undefined);
});

// 10 BLOCK
test('10 BLOCK', () => {
  const gate = evaluateExecutionGate('BLOCK', 'CRITICAL', false);
  assert.equal(gate.status, 'BLOCKED');
  assert.equal(gate.canProceedToGovernance, false);

  const { decision } = createTestDecision('kiểm tra đơn #1234');
  const blockDec: DecisionResult = { ...decision, state: 'BLOCK' };
  const res = orchestrator.orchestrate(blockDec);
  assert.equal(res.status, 'BLOCKED');
  assert.equal(res.success, false);
});

// --- 3. RISK & GOVERNANCE PRESERVATION ---

// 11 LOW risk
test('11 LOW risk', () => {
  const rules = getPolicyRulesForRisk('LOW');
  assert.equal(rules.governanceRequired, false);
  assert.equal(rules.approvalRequired, false);

  const { decision } = createTestDecision('kiểm tra đơn #1234');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.riskLevel, 'LOW');
  assert.equal(res.governanceRequired, false);
  assert.equal(res.approvalRequired, false);
});

// 12 MEDIUM risk
test('12 MEDIUM risk', () => {
  const rules = getPolicyRulesForRisk('MEDIUM');
  assert.equal(rules.governanceRequired, true);
  assert.equal(rules.approvalRequired, false);

  const { decision } = createTestDecision('hủy đơn #1234');
  const medDec: DecisionResult = { ...decision, riskLevel: 'MEDIUM' };
  const res = orchestrator.orchestrate(medDec);
  assert.equal(res.riskLevel, 'MEDIUM');
  assert.equal(res.governanceRequired, true);
  assert.equal(res.approvalRequired, false);
  assert.equal(res.status, 'READY');
});

// 13 HIGH risk
test('13 HIGH risk', () => {
  const rules = getPolicyRulesForRisk('HIGH');
  assert.equal(rules.governanceRequired, true);
  assert.equal(rules.approvalRequired, true);

  const { decision } = createTestDecision('hủy đơn #1234');
  assert.equal(decision.riskLevel, 'HIGH');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.riskLevel, 'HIGH');
  assert.equal(res.governanceRequired, true);
  assert.equal(res.approvalRequired, true);
  assert.equal(res.status, 'WAITING_APPROVAL');
});

// 14 CRITICAL risk
test('14 CRITICAL risk', () => {
  const rules = getPolicyRulesForRisk('CRITICAL');
  assert.equal(rules.governanceRequired, true);
  assert.equal(rules.approvalRequired, true);
  assert.equal(rules.destructiveProtection, true);

  const { decision } = createTestDecision('xóa #1234');
  assert.equal(decision.riskLevel, 'CRITICAL');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.riskLevel, 'CRITICAL');
  assert.equal(res.governanceRequired, true);
  assert.equal(res.approvalRequired, true);
  assert.equal(res.status, 'WAITING_APPROVAL');
});

// 15 Risk downgrade rejection
test('15 Risk downgrade rejection', () => {
  assert.equal(assertRiskNotDowngraded('CRITICAL', 'LOW').valid, false);
  assert.equal(assertRiskNotDowngraded('CRITICAL', 'HIGH').valid, false);
  assert.equal(assertRiskNotDowngraded('HIGH', 'MEDIUM').valid, false);
  assert.equal(assertRiskNotDowngraded('MEDIUM', 'LOW').valid, false);
  assert.equal(assertRiskNotDowngraded('LOW', 'HIGH').valid, true); // Escalation allowed
  assert.equal(assertRiskNotDowngraded('HIGH', 'HIGH').valid, true); // Preservation allowed
});

// 16 Governance preservation
test('16 Governance preservation', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.governanceRequired, true);
  assert.equal(res.executionRequest?.metadata.governed, true);
});

// 17 Approval preservation
test('17 Approval preservation', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.approvalRequired, true);
  assert.equal(res.executionRequest?.metadata.approvalDemanded, true);
});

// --- 4. PARAMETER SAFETY & VALIDATION ---

// 18 Required parameter validation
test('18 Required parameter validation', () => {
  const params = { orderId: '1234', amount: 50000 };
  const check = validateParameters(params);
  assert.equal(check.valid, true);
  assert.equal(check.errors.length, 0);
});

// 19 Invalid parameter rejection
test('19 Invalid parameter rejection', () => {
  assert.equal(validateParameters(null).valid, false);
  assert.equal(validateParameters('string_not_obj').valid, false);
  assert.equal(validateParameters([1, 2, 3]).valid, false);
});

// 20 Null byte rejection
test('20 Null byte rejection', () => {
  const nullByteParams = { orderId: '1234\0DROP_TABLE' };
  const check = validateParameters(nullByteParams);
  assert.equal(check.valid, false);
  assert.ok(check.errors.some(e => e.includes('UNSAFE_PARAMETER')));
});

// 21 Prototype pollution rejection
test('21 Prototype pollution rejection', () => {
  const pollutedParams = JSON.parse('{"__proto__":{"admin":true}}');
  const check = validateParameters(pollutedParams);
  assert.equal(check.valid, false);
  assert.ok(check.errors.includes('PROTOTYPE_POLLUTION_DETECTED'));

  const { decision } = createTestDecision('hủy đơn #1234');
  const pollutedDecision: DecisionResult = {
    ...decision,
    selectedAction: {
      intentType: 'CANCEL_REQUEST',
      parameters: pollutedParams,
    },
  };
  const res = orchestrator.orchestrate(pollutedDecision);
  assert.equal(res.status, 'BLOCKED');
  assert.equal(res.success, false);
});

// 22 Secret rejection
test('22 Secret rejection', () => {
  const secretParams = { token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret' };
  const check = validateParameters(secretParams);
  assert.equal(check.valid, false);
  assert.ok(check.errors.some(e => e.includes('UNSAFE_PARAMETER')));
});

// --- 5. GOVERNANCE & EXECUTION BOUNDARIES ---

// 23 Governance required
test('23 Governance required', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const intent = createExecutionIntent(decision, decision.selectedAction!);
  assert.equal(intent.governanceRequired, true);
});

// 24 Approval required
test('24 Approval required', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const intent = createExecutionIntent(decision, decision.selectedAction!);
  assert.equal(intent.approvalRequired, true);
});

// 25 Critical protection
test('25 Critical protection', () => {
  const { decision } = createTestDecision('xóa #1234');
  const res = orchestrator.orchestrate(decision);
  // Must be held in WAITING_APPROVAL, not directly EXECUTABLE
  assert.equal(res.status, 'WAITING_APPROVAL');
  assert.notEqual(res.status, 'EXECUTABLE');
});

// 26 PDP boundary
test('26 PDP boundary', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  // Orchestrator prepares the request for PDP, does NOT invoke or evaluate PDP itself
  assert.equal((res as any).policyDecision, undefined);
  assert.equal((res as any).allowed, undefined);
});

// 27 Approval boundary
test('27 Approval boundary', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  // Orchestrator does NOT issue, sign, or consume approval tokens
  assert.equal((res as any).executionToken, undefined);
  assert.equal((res as any).consumedToken, undefined);
});

// 28 ToolRegistry boundary
test('28 ToolRegistry boundary', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  // Orchestrator declares toolName but does NOT execute the tool
  assert.equal(res.executionRequest?.toolName, 'cancel_order');
  assert.equal((res as any).toolOutput, undefined);
  assert.equal((res as any).executionResult, undefined);
});

// --- 6. IDEMPOTENCY & DETERMINISM ---

// 29 Deterministic fingerprint
test('29 Deterministic fingerprint', () => {
  const fp1 = computeDeterministicExecutionFingerprint('u1', 's1', 'CANCEL', 'dec_123', { id: 1 });
  const fp2 = computeDeterministicExecutionFingerprint('u1', 's1', 'CANCEL', 'dec_123', { id: 1 });
  assert.equal(fp1, fp2);
  assert.ok(fp1.startsWith('exec_'));
});

// 30 Same-request identity
test('30 Same-request identity', () => {
  const { decision: dec1 } = createTestDecision('hủy đơn #1234');
  const { decision: dec2 } = createTestDecision('hủy đơn #1234');
  const res1 = orchestrator.orchestrate(dec1);
  const res2 = orchestrator.orchestrate(dec2);
  assert.equal(res1.fingerprint, res2.fingerprint);
  assert.equal(res1.executionRequest?.requestId, res2.executionRequest?.requestId);
});

// 31 Replay protection
test('31 Replay protection', () => {
  // Key permutation does not change fingerprint
  const fpA = computeDeterministicExecutionFingerprint('u', 's', 'ACT', 'dec_1', { a: 1, b: 2 });
  const fpB = computeDeterministicExecutionFingerprint('u', 's', 'ACT', 'dec_1', { b: 2, a: 1 });
  assert.equal(fpA, fpB);
});

// 32 User-scoped idempotency
test('32 User-scoped idempotency', () => {
  const fpUserA = computeDeterministicExecutionFingerprint('alice', 's', 'ACT', 'dec_1');
  const fpUserB = computeDeterministicExecutionFingerprint('bob', 's', 'ACT', 'dec_1');
  assert.notEqual(fpUserA, fpUserB);
});

// 33 Session-scoped identity
test('33 Session-scoped identity', () => {
  const fpSess1 = computeDeterministicExecutionFingerprint('u', 'sess_1', 'ACT', 'dec_1');
  const fpSess2 = computeDeterministicExecutionFingerprint('u', 'sess_2', 'ACT', 'dec_1');
  assert.notEqual(fpSess1, fpSess2);
});

// --- 7. EXECUTION SAFETY & AGENTLOOP CONTRACT ---

// 34 No direct tool execution
test('34 No direct tool execution', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  const keys = Object.keys(res);
  assert.ok(!keys.includes('toolOutput'));
  assert.ok(!keys.includes('executed'));
});

// 35 No PDP bypass
test('35 No PDP bypass', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.executionRequest?.metadata.governed, true);
  // Status is WAITING_APPROVAL, meaning PDP / approval must be invoked downstream
  assert.equal(res.status, 'WAITING_APPROVAL');
});

// 36 No approval bypass
test('36 No approval bypass', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  assert.equal(res.approvalRequired, true);
  assert.equal(res.status, 'WAITING_APPROVAL');
});

// 37 No idempotency bypass
test('37 No idempotency bypass', () => {
  const { decision } = createTestDecision('hủy đơn #1234');
  const res = orchestrator.orchestrate(decision);
  assert.ok(res.executionRequest?.executionFingerprint.startsWith('exec_'));
});

// 38 Fail-closed behavior
test('38 Fail-closed behavior', () => {
  const malformedInput: any = { userId: '', sessionId: '' };
  const res = orchestrator.orchestrate(malformedInput);
  assert.equal(res.success, false);
  assert.equal(res.status, 'BLOCKED');
});

// 39 Determinism
test('39 Determinism', () => {
  const { decision: dec1 } = createTestDecision('hủy đơn #1234');
  const { decision: dec2 } = createTestDecision('hủy đơn #1234');
  const res1 = orchestrator.orchestrate(dec1);
  const res2 = orchestrator.orchestrate(dec2);
  assert.deepEqual(res1, res2);
});

// 40 AgentLoop integration
test('40 AgentLoop integration', async () => {
  const loop = new AgentLoop();
  assert.equal(typeof (loop as any).actionOrchestrator, 'object');
  assert.equal(typeof (loop as any).actionOrchestrator.orchestrate, 'function');

  // Verify full loop execution attaches orchestrationResult
  const loopResult = await loop.execute({
    userId: 'boss_user',
    sessionId: 'session_orchestration_test',
    userText: 'kiểm tra đơn #1234',
    actor: {
      userId: 'boss_user',
      role: 'owner',
      channel: 'web',
      isOwner: true,
    },
  });

  assert.ok(loopResult.orchestrationResult !== undefined);
  assert.equal(loopResult.orchestrationResult?.success, true);
  assert.equal(typeof loopResult.orchestrationResult?.status, 'string');
});

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`MS-1.3.11 action orchestration: ${passed}/40 PASS`);
