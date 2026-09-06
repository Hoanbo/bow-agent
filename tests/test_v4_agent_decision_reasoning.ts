// tests/test_v4_agent_decision_reasoning.ts
// BOWCON V4.0 — MILESTONE 1.3.10: AGENT DECISION REASONING & ACTION SELECTION TESTS
//
// EN:
// Authoritative test suite verifying pure, deterministic, risk-preserving
// candidate action selection and decision reasoning without tool execution,
// PDP bypass, or memory mutation.
//
// VI:
// Bộ kiểm thử có thẩm quyền xác minh việc lựa chọn candidate action và suy luận quyết định
// một cách thuần túy, tất định, bảo tồn rủi ro mà không thực thi tool, bỏ qua PDP hay thay đổi bộ nhớ.

import assert from 'node:assert';
import {
  IntentService,
  PlanningService,
  createDecisionContext,
  DecisionService,
  validateDecisionInput,
  scoreCandidate,
  selectAction,
  preserveRisk,
  isGovernedRisk,
  isApprovalRequiredForRisk,
  classifyConfidence,
  bounded,
  DECISION_THRESHOLDS,
  AgentLoop,
} from '../src/index.js';
import type { DecisionInput, DecisionContext, ContextAwarePlan } from '../src/index.js';

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`PASS ${name}`);
};

const intentService = new IntentService();
const planningService = new PlanningService();
const decisionService = new DecisionService();

function createTestInput(
  text: string,
  turns: any[] = [],
  userId = 'user_test',
  sessionId = 'session_test',
): DecisionInput {
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
  return { context, plan };
}

// =========================================================================
// TEST SECTIONS 01 - 35
// =========================================================================

// 01 DecisionContext compatibility
test('01 DecisionContext compatibility', () => {
  const input = createTestInput('kiểm tra đơn #1234');
  const result = decisionService.decide(input);
  assert.equal(result.success, true);
  assert.equal(result.userId, 'user_test');
  assert.equal(result.sessionId, 'session_test');
});

// 02 Decision identity
test('02 Decision identity', () => {
  const input = createTestInput('kiểm tra đơn #1234');
  const result = decisionService.decide(input);
  assert.ok(result.deterministicFingerprint.startsWith('dec_'));
  assert.ok(typeof result.state === 'string');
  assert.equal(typeof result.confidence, 'number');
  assert.equal(result.intent.intentType, 'STATUS_REQUEST');
});

// 03 User isolation
test('03 User isolation', () => {
  const inputA = createTestInput('hủy đơn #1234', [], 'user_a', 'session_1');
  const inputB = createTestInput('hủy đơn #1234', [], 'user_b', 'session_1');
  const resA = decisionService.decide(inputA);
  const resB = decisionService.decide(inputB);
  assert.equal(resA.userId, 'user_a');
  assert.equal(resB.userId, 'user_b');
  assert.notEqual(resA.deterministicFingerprint, resB.deterministicFingerprint);

  // Scope mismatch defense: context for user_a passed with plan for user_b
  const mismatchedInput: DecisionInput = {
    context: inputA.context,
    plan: inputB.plan,
  };
  const blocked = decisionService.decide(mismatchedInput);
  assert.equal(blocked.success, false);
  assert.equal(blocked.state, 'BLOCK');
});

// 04 Session isolation
test('04 Session isolation', () => {
  const inputS1 = createTestInput('hủy đơn #1234', [], 'user_a', 'session_alpha');
  const inputS2 = createTestInput('hủy đơn #1234', [], 'user_a', 'session_beta');
  const resS1 = decisionService.decide(inputS1);
  const resS2 = decisionService.decide(inputS2);
  assert.equal(resS1.sessionId, 'session_alpha');
  assert.equal(resS2.sessionId, 'session_beta');
  assert.notEqual(resS1.deterministicFingerprint, resS2.deterministicFingerprint);

  // Cross-session mismatch defense
  const crossSessionInput: DecisionInput = {
    context: inputS1.context,
    plan: inputS2.plan,
  };
  const blocked = decisionService.decide(crossSessionInput);
  assert.equal(blocked.state, 'BLOCK');
});

// 05 Input immutability
test('05 Input immutability', () => {
  const input = createTestInput('hủy đơn #1234');
  const originalPlanId = input.plan.planId;
  const originalCandidateCount = input.context.candidateActions.length;
  const result = decisionService.decide(input);
  assert.equal(input.plan.planId, originalPlanId);
  assert.equal(input.context.candidateActions.length, originalCandidateCount);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.uncertainty), true);
  assert.equal(Object.isFrozen(result.candidates), true);
});

// 06 Intent alignment scoring
test('06 Intent alignment scoring', () => {
  const input = createTestInput('hủy đơn #1234');
  const alignedAction = { intentType: 'CANCEL_REQUEST', parameters: { orderId: '1234' } };
  const misalignedAction = { intentType: 'ORDER_QUERY', parameters: { orderId: '1234' } };
  const scoreAligned = scoreCandidate(alignedAction, input.context.semanticIntent, input.context);
  const scoreMisaligned = scoreCandidate(misalignedAction, input.context.semanticIntent, input.context);
  assert.ok(scoreAligned.score > scoreMisaligned.score);
  assert.ok(scoreAligned.factors.includes('intent_alignment'));
  assert.ok(!scoreMisaligned.factors.includes('intent_alignment'));
});

// 07 Context relevance scoring
test('07 Context relevance scoring', () => {
  const resolvedInput = createTestInput('hủy nó', [{ id: 't1', sender: 'user', content: 'đơn #1234 cần hủy' }]);
  const action = { intentType: 'CANCEL_REQUEST', parameters: { orderId: '1234' } };
  const candidate = scoreCandidate(action, resolvedInput.context.semanticIntent, resolvedInput.context);
  assert.ok(candidate.factors.includes('context_reference_resolved'));
});

// 08 Memory relevance scoring
test('08 Memory relevance scoring', () => {
  const inputWithMemory = createTestInput('hủy đơn #1234', [{ id: 'm1', sender: 'user', content: 'đơn #1234' }]);
  const action = { intentType: 'CANCEL_REQUEST', parameters: { orderId: '1234' } };
  const candidate = scoreCandidate(action, inputWithMemory.context.semanticIntent, inputWithMemory.context);
  assert.ok(candidate.factors.includes('memory_context_relevant'));
});

// 09 Candidate validation
test('09 Candidate validation', () => {
  const input = createTestInput('hủy đơn #1234');
  const validAction = { intentType: 'CANCEL_REQUEST', parameters: { orderId: '1234' } };
  const selection = selectAction([validAction], input.context.semanticIntent, input.context);
  assert.ok(selection.selected !== undefined);
  assert.equal(selection.selected?.action.intentType, 'CANCEL_REQUEST');
  assert.equal(selection.rejectedCandidates.length, 0);
});

// 10 Candidate rejection
test('10 Candidate rejection', () => {
  const input = createTestInput('hủy đơn #1234');
  const invalidCandidate = { intentType: '' }; // missing intentType
  const selection = selectAction([invalidCandidate as any], input.context.semanticIntent, input.context);
  assert.equal(selection.selected, undefined);
  assert.equal(selection.rejectedCandidates.length, 1);
  assert.equal(selection.rejectedCandidates[0].rejected, 'missing_intent_type');
});

// 11 Capability validation
test('11 Capability validation', () => {
  const input = createTestInput('hủy đơn #1234');
  const unknownAction = { intentType: 'NON_EXISTENT_FABRICATED_ACTION' };
  const selection = selectAction([unknownAction as any], input.context.semanticIntent, input.context);
  assert.equal(selection.selected, undefined);
  assert.equal(selection.rejectedCandidates.length, 1);
  assert.equal(selection.rejectedCandidates[0].rejected, 'unknown_capability');
});

// 12 Required field validation
test('12 Required field validation', () => {
  const completeInput = createTestInput('hủy đơn #1234');
  const incompleteInput = createTestInput('hủy đơn');
  const action = { intentType: 'CANCEL_REQUEST', parameters: {} };
  const candidateComplete = scoreCandidate(action, completeInput.context.semanticIntent, completeInput.context);
  const candidateIncomplete = scoreCandidate(action, incompleteInput.context.semanticIntent, incompleteInput.context);
  assert.ok(candidateComplete.factors.includes('required_fields_complete'));
  assert.ok(!candidateIncomplete.factors.includes('required_fields_complete'));
  assert.ok(candidateComplete.score > candidateIncomplete.score);
});

// 13 Confidence calculation
test('13 Confidence calculation', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  assert.ok(result.confidence > 0 && result.confidence <= 1.0);
  assert.equal(result.confidence, bounded(result.confidence));
});

// 14 Confidence bounds
test('14 Confidence bounds', () => {
  assert.equal(bounded(-0.5), 0);
  assert.equal(bounded(1.5), 1);
  assert.equal(bounded(NaN), 0);
  assert.equal(bounded(Infinity), 0);
  assert.equal(bounded(0.854321), 0.8543);
});

// 15 Low confidence behavior
test('15 Low confidence behavior', () => {
  const input = createTestInput('blorb glorp xyz');
  const result = decisionService.decide(input);
  assert.equal(result.state, 'CLARIFY');
  assert.equal(result.requiresClarification, true);
  assert.ok(result.uncertainty.some(u => u.reason === 'LOW_CONFIDENCE' || u.reason.includes('CLARIFICATION')));
});

// 16 High confidence behavior
test('16 High confidence behavior', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  assert.equal(result.state, 'PROPOSE_ACTION');
  assert.equal(result.requiresClarification, false);
  assert.equal(result.selectedAction?.intentType, 'CANCEL_REQUEST');
  assert.ok(result.confidence >= DECISION_THRESHOLDS.clarification);
});

// 17 Candidate ranking
test('17 Candidate ranking', () => {
  const input = createTestInput('hủy đơn #1234');
  const action1 = { intentType: 'CANCEL_REQUEST', parameters: { orderId: '1234' } };
  const action2 = { intentType: 'STATUS_REQUEST', parameters: { orderId: '1234' } };
  const selection = selectAction([action2, action1], input.context.semanticIntent, input.context);
  assert.equal(selection.candidates[0].action.intentType, 'CANCEL_REQUEST');
  assert.ok(selection.candidates[0].score >= selection.candidates[1].score);
});

// 18 Candidate tie detection
test('18 Candidate tie detection', () => {
  const input = createTestInput('xem thông tin');
  const action1 = { intentType: 'ORDER_QUERY', parameters: {} };
  const action2 = { intentType: 'PRODUCT_QUERY', parameters: {} };
  // Both have identical scores because neither aligns with 'STATUS_REQUEST'
  const selection = selectAction([action1, action2], input.context.semanticIntent, input.context);
  assert.equal(selection.tied, true);
  assert.equal(selection.selected, undefined);
  assert.equal(selection.tieCandidates.length, 2);
});

// 19 Clarification generation
test('19 Clarification generation', () => {
  const input = createTestInput('hủy đơn'); // missing order ID
  const result = decisionService.decide(input);
  assert.equal(result.state, 'CLARIFY');
  assert.equal(result.requiresClarification, true);
  assert.ok(result.clarification !== undefined);
  assert.ok(result.clarification?.missingFields.includes('order'));
});

// 20 Missing reference behavior
test('20 Missing reference behavior', () => {
  const input = createTestInput('hủy nó'); // "nó" has no prior turns to resolve
  const result = decisionService.decide(input);
  assert.equal(result.state, 'CLARIFY');
  assert.equal(result.requiresClarification, true);
  assert.ok(result.uncertainty.some(u => u.reason === 'UNRESOLVED_REFERENCE'));
});

// 21 Resolved reference behavior
test('21 Resolved reference behavior', () => {
  const input = createTestInput('hủy nó', [
    { id: 't1', sender: 'user', content: 'đơn #1234 cần xử lý ngay' },
  ]);
  const result = decisionService.decide(input);
  assert.equal(result.state, 'PROPOSE_ACTION');
  assert.equal(result.requiresClarification, false);
  assert.equal(result.selectedAction?.intentType, 'CANCEL_REQUEST');
});

// 22 Ambiguous reference behavior
test('22 Ambiguous reference behavior', () => {
  const input = createTestInput('hủy nó', [
    { id: 't1', sender: 'user', content: 'đơn #1234 cần kiểm tra' },
    { id: 't2', sender: 'agent', content: 'đơn #5678 cũng đang chờ xử lý' },
  ]);
  const result = decisionService.decide(input);
  assert.equal(result.state, 'CLARIFY');
  assert.equal(result.requiresClarification, true);
});

// 23 LOW risk behavior
test('23 LOW risk behavior', () => {
  const input = createTestInput('kiểm tra đơn #1234');
  const result = decisionService.decide(input);
  assert.equal(result.riskLevel, 'LOW');
  assert.equal(result.governanceRequired, false);
  assert.equal(result.approvalRequired, false);
});

// 24 MEDIUM risk behavior
test('24 MEDIUM risk behavior', () => {
  assert.equal(isGovernedRisk('MEDIUM'), true);
  assert.equal(preserveRisk('MEDIUM'), 'MEDIUM');
  assert.equal(isApprovalRequiredForRisk('MEDIUM', false), false);
  assert.equal(isApprovalRequiredForRisk('MEDIUM', true), true);
});

// 25 HIGH risk behavior
test('25 HIGH risk behavior', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  assert.equal(result.riskLevel, 'HIGH');
  assert.equal(result.governanceRequired, true);
  assert.equal(result.approvalRequired, true);
});

// 26 CRITICAL risk behavior
test('26 CRITICAL risk behavior', () => {
  const input = createTestInput('xóa #1234');
  const result = decisionService.decide(input);
  assert.equal(result.riskLevel, 'CRITICAL');
  assert.equal(result.governanceRequired, true);
  assert.equal(result.approvalRequired, true);
  // Never converts to executable tool
  assert.equal((result as any).toolName, undefined);
  assert.equal((result as any).executable, undefined);
});

// 27 Governance metadata preservation
test('27 Governance metadata preservation', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  assert.equal(result.governanceRequired, true);
  // Cannot downgrade risk: preserveRisk('HIGH', 'LOW') must remain 'HIGH'
  assert.equal(preserveRisk('HIGH', 'LOW'), 'HIGH');
  assert.equal(preserveRisk('CRITICAL', 'MEDIUM'), 'CRITICAL');
});

// 28 Approval metadata preservation
test('28 Approval metadata preservation', () => {
  const input = createTestInput('hủy đơn #1234');
  assert.equal(input.plan.requiresApproval, true);
  const result = decisionService.decide(input);
  assert.equal(result.approvalRequired, true);
});

// 29 No execution guarantee
test('29 No execution guarantee', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  const keys = Object.keys(result);
  assert.ok(!keys.includes('toolOutput'));
  assert.ok(!keys.includes('executionResult'));
  assert.ok(!keys.includes('consumedToken'));
  assert.ok(!keys.includes('idempotencyKey'));
});

// 30 No PDP invocation
test('30 No PDP invocation', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  // DecisionResult only contains proposals, no PolicyDecision or evaluate() results
  assert.equal((result as any).policyDecision, undefined);
  assert.equal((result as any).permitted, undefined);
});

// 31 No ToolRegistry invocation
test('31 No ToolRegistry invocation', () => {
  const input = createTestInput('hủy đơn #1234');
  const result = decisionService.decide(input);
  assert.equal((result as any).toolRegistry, undefined);
  assert.equal((result as any).executed, undefined);
});

// 32 Determinism
test('32 Determinism', () => {
  const input1 = createTestInput('hủy đơn #1234');
  const input2 = createTestInput('hủy đơn #1234');
  const res1 = decisionService.decide(input1);
  const res2 = decisionService.decide(input2);
  assert.deepEqual(res1, res2);
  assert.equal(res1.deterministicFingerprint, res2.deterministicFingerprint);
});

// 33 Prototype pollution defense
test('33 Prototype pollution defense', () => {
  const polluted = JSON.parse('{"__proto__":{"polluted":true}}');
  const validation = validateDecisionInput(polluted);
  assert.equal(validation.valid, false);

  const blocked = decisionService.decide(polluted);
  assert.equal(blocked.success, false);
  assert.equal(blocked.state, 'BLOCK');
});

// 34 Secret rejection/redaction
test('34 Secret rejection/redaction', () => {
  const base = createTestInput('hủy đơn #1234');
  const secretIntent = {
    ...base.context.semanticIntent,
    sourceText: 'Bearer secret-token-value-12345',
  };
  const secretInput: DecisionInput = {
    context: {
      ...base.context,
      semanticIntent: secretIntent,
    },
    plan: {
      ...base.plan,
      intent: secretIntent,
    },
  };
  const validation = validateDecisionInput(secretInput);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('SECRET_DETECTED_IN_INTENT'));

  const blocked = decisionService.decide(secretInput);
  assert.equal(blocked.state, 'BLOCK');
  // Secrets must never appear in rationale
  const rationaleStr = JSON.stringify(blocked.rationale);
  assert.ok(!rationaleStr.includes('secret-token-value-12345'));
});

// 35 AgentLoop integration contract
test('35 AgentLoop integration contract', () => {
  const agentLoop = new AgentLoop();
  assert.equal(typeof (agentLoop as any).decisionService, 'object');
  assert.equal(typeof (agentLoop as any).decisionService.decide, 'function');
});

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`MS-1.3.10 decision reasoning: ${passed}/35 PASS`);
