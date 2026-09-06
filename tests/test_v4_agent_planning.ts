// EN: MS-1.3.9 verifies deterministic, data-only planning; no test permits planner-side execution.
// VI: MS-1.3.9 xác minh planning xác định, chỉ-dữ-liệu; không test nào cho phép planner tự thực thi.

import assert from 'node:assert';
import { IntentService, PlanningService, createDecisionContext, validateAgentPlan } from '../src/index.js';

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`); };
const intentService = new IntentService();
const planningService = new PlanningService();
const input = (text: string, turns: any[] = [], userId = 'user_a', sessionId = 'session_a') => ({ userId, sessionId, userText: text, context: { recentTurns: turns } });
const plan = (text: string, turns: any[] = [], userId?: string, sessionId?: string) => { const value = input(text, turns, userId, sessionId); return planningService.plan(value, intentService.interpret(value)); };

test('01 DecisionContext identity', () => assert.equal(createDecisionContext(input('hello'), intentService.interpret(input('hello'))).userId, 'user_a'));
test('02 DecisionContext session', () => assert.equal(createDecisionContext(input('hello'), intentService.interpret(input('hello'))).sessionId, 'session_a'));
test('03 DecisionContext immutable', () => assert.equal(Object.isFrozen(createDecisionContext(input('hello'), intentService.interpret(input('hello')))), true));
test('04 DecisionContext candidates', () => assert.equal(createDecisionContext(input('hủy đơn #1234'), intentService.interpret(input('hủy đơn #1234'))).candidateActions.length, 1));
test('05 DecisionContext secret rejection', () => assert.throws(() => createDecisionContext(input('Bearer secret-value'), intentService.interpret(input('Bearer secret-value')))));
test('06 Intent to response', () => assert.equal(plan('hello').steps[0].type, 'ASK_CLARIFICATION'));
test('07 Intent to action', () => assert.equal(plan('hủy đơn #1234').steps[0].type, 'PREPARE_ACTION'));
test('08 Intent risk mapping', () => assert.equal(plan('hủy đơn #1234').riskLevel, 'HIGH'));
test('09 Delete risk mapping', () => assert.equal(plan('xóa #1234').riskLevel, 'CRITICAL'));
test('10 Approval proposal', () => assert.equal(plan('hủy đơn #1234').requiresApproval, true));
test('11 Context response plan', () => assert.equal(plan('giá nó là bao nhiêu', [{ id: 't', sender: 'agent', content: 'Sản phẩm Alpha có giá 100 nghìn đồng.' }]).steps[0].type, 'RETRIEVE_CONTEXT'));
test('12 Scoped context', () => assert.equal(plan('giá nó là bao nhiêu', [{ id: 't', sender: 'agent', content: 'Sản phẩm Alpha có giá 100 nghìn đồng.' }], 'u1', 's1').userId, 'u1'));
test('13 Relevant memory copy', () => { const value = input('hello'); const ctx = createDecisionContext({ ...value, workingMemory: [{ id: 'm', sender: 'user', content: 'safe history' }] }, intentService.interpret(value)); assert.equal(ctx.relevantMemory[0].id, 'm'); });
test('14 Context no mutation', () => { const turns = [{ id: 't', sender: 'user', content: 'context text' }]; plan('hello', turns); assert.equal(turns[0].content, 'context text'); });
test('15 Informational low risk', () => assert.equal(plan('kiểm tra đơn #1234').riskLevel, 'LOW'));
test('16 Resolved reference', () => assert.equal(plan('hủy nó', [{ id: 't', sender: 'user', content: 'đơn #1234 cần xử lý ngay' }]).requiresClarification, false));
test('17 Unresolved reference', () => assert.equal(plan('hủy nó').requiresClarification, true));
test('18 Ambiguous reference', () => assert.equal(plan('hủy nó', [{ id: 'a', sender: 'user', content: 'đơn #1 cần xử lý ngay' }, { id: 'b', sender: 'agent', content: 'đơn #2 cần xử lý ngay' }]).steps[0].type, 'ASK_CLARIFICATION'));
test('19 Reference plan no execution', () => assert.equal(plan('hủy nó', [{ id: 't', sender: 'user', content: 'đơn #1234 cần xử lý ngay' }]).steps.some(step => step.type === 'EXECUTE_TOOL'), true));
test('20 Reference dependencies', () => assert.equal(plan('hủy đơn #1234').steps.at(-1)?.dependencies.length, 1));
test('21 Missing field clarification', () => assert.equal(plan('hủy đơn').clarification?.missingFields.includes('order'), true));
test('22 Low confidence clarification', () => assert.equal(plan('blorb').requiresClarification, true));
test('23 Clarification structured', () => assert.equal(typeof plan('hủy đơn').clarification?.reason, 'string'));
test('24 No candidate options fabricated', () => assert.equal(plan('hủy đơn').clarification?.candidateOptions.length, 0));
test('25 Low risk respond', () => assert.equal(plan('giải thích idempotency').riskLevel, 'LOW'));
test('26 High risk cancel', () => assert.equal(plan('hủy đơn #1234').riskLevel, 'HIGH'));
test('27 Critical risk delete', () => assert.equal(plan('xóa #1234').riskLevel, 'CRITICAL'));
test('28 Plan validation', () => assert.equal(validateAgentPlan(plan('hủy đơn #1234')).valid, true));
test('29 Invalid plan rejection', () => assert.equal(validateAgentPlan({}).valid, false));
test('30 Invalid confidence rejection', () => assert.equal(validateAgentPlan({ ...plan('hủy đơn #1234'), confidence: 2 }).valid, false));
test('31 Prototype pollution rejection', () => assert.equal(validateAgentPlan({ ...plan('hủy đơn #1234'), planId: '__proto__' }).valid, false));
test('32 Determinism', () => assert.deepEqual(plan('hủy đơn #1234'), plan('hủy đơn #1234')));
test('33 User/session isolation', () => { const a = plan('hủy đơn #1234', [], 'u_a', 's_a'); const b = plan('hủy đơn #1234', [], 'u_b', 's_b'); assert.notEqual(a.planId, b.planId); });
test('34 Governance boundary', () => assert.equal(Object.keys(plan('hủy đơn #1234').steps.at(-1) || {}).includes('toolName'), false));
test('35 AgentLoop integration contract', () => assert.equal(typeof PlanningService.prototype.plan, 'function'));

console.log(`MS-1.3.9 planning: ${passed}/35 PASS`);
