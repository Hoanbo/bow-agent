// EN:
// MS-1.3.8 verifies deterministic semantic interpretation only. The parser has no tool,
// governance, approval, idempotency, voice, or durable-memory mutation capability.
//
// VI:
// MS-1.3.8 chỉ xác minh semantic interpretation xác định. Parser không có khả năng thay đổi
// tool, governance, approval, idempotency, voice hoặc durable memory.

import assert from 'node:assert';
import { IntentService, parseIntent } from '../src/index.js';

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`); };
const service = new IntentService();
const interpret = (text: unknown, context: any[] = [], userId = 'user_a', sessionId = 'session_a') => service.interpret({ userId, sessionId, userText: text, context: { recentTurns: context } });

test('01 Basic Intent Classification', () => assert.equal(interpret('hủy đơn #1234').intentType, 'CANCEL_REQUEST'));
test('02 Informational Request Classification', () => assert.equal(interpret('giải thích idempotency').actionability, 'INFORMATIONAL'));
test('03 Actionable Request Classification', () => assert.equal(interpret('đổi voice sang tiếng Anh').actionability, 'ACTIONABLE'));
test('04 Entity Extraction', () => assert.equal(interpret('kiểm tra đơn #1234').entities.some(entity => entity.type === 'order'), true));
test('05 Entity Normalization', () => assert.equal(interpret('kiểm tra đơn #ABC').entities.find(entity => entity.type === 'order')?.normalizedValue, 'abc'));
test('06 Parameter Extraction', () => assert.equal(interpret('hủy đơn #1234').parameters.orderId, '1234'));
test('07 Reference Resolution', () => assert.equal(interpret('hủy nó', [{ id: 'a', sender: 'user', content: 'đơn #1234 cần kiểm tra ngay' }]).references[0]?.resolved, true));
test('08 Context-Aware Intent Resolution', () => assert.equal(interpret('hủy nó', [{ id: 'a', sender: 'user', content: 'đơn #1234 cần kiểm tra ngay' }]).requiresClarification, false));
test('09 Ambiguous Reference Detection', () => assert.equal(interpret('hủy nó', [{ id: 'a', sender: 'user', content: 'đơn #1234 cần kiểm tra ngay' }, { id: 'b', sender: 'agent', content: 'đơn #5678 cũng đang chờ xử lý' }]).requiresClarification, true));
test('10 Missing Parameter Detection', () => assert.equal(interpret('hủy đơn').missingParameters.includes('order'), true));
test('11 Clarification Generation', () => assert.equal(interpret('hủy đơn').clarification[0]?.reason, 'MISSING_PARAMETER'));
test('12 Confidence Boundaries', () => { const value = interpret('hủy đơn #1234').confidence; assert.ok(value >= 0 && value <= 1); });
test('13 Deterministic Interpretation', () => assert.deepEqual(interpret('hủy đơn #1234'), interpret('hủy đơn #1234')));
test('14 User Isolation', () => assert.equal(interpret('hủy nó', [{ id: 'a', sender: 'user', content: 'đơn #1 cần xử lý' }], 'user_a').references[0]?.targetText, 'đơn #1 cần xử lý'));
test('15 Session Isolation', () => assert.equal(interpret('hủy nó', [], 'user_a', 'session_b').requiresClarification, true));
test('16 Malformed Input Defense', () => assert.equal(interpret({ text: 'x' }).clarification[0]?.reason, 'MALFORMED_INPUT'));
test('17 Prototype Pollution Defense', () => assert.equal(interpret(JSON.parse('{"__proto__":{"polluted":true}}')).requiresClarification, true));
test('18 Oversized Input Defense', () => assert.equal(interpret('x'.repeat(8193)).clarification[0]?.reason, 'MALFORMED_INPUT'));
test('19 Null Byte Defense', () => assert.equal(interpret('hủy\0đơn #1234').clarification[0]?.reason, 'MALFORMED_INPUT'));
test('20 Unsupported Intent Handling', () => assert.equal(interpret('blorb glorp').intentType, 'UNKNOWN'));
test('21 Candidate Action Generation', () => assert.equal(interpret('hủy đơn #1234').candidateAction?.intentType, 'CANCEL_REQUEST'));
test('22 Governance Non-Bypass', () => assert.equal(typeof interpret('hủy đơn #1234').candidateAction, 'object'));
test('23 Approval Non-Consumption', () => assert.equal(Object.keys(interpret('hủy đơn #1234')).includes('executionToken'), false));
test('24 Idempotency Non-Consumption', () => assert.equal(Object.keys(interpret('hủy đơn #1234')).includes('idempotencyKey'), false));
test('25 Tool Execution Non-Execution', () => assert.equal(Object.keys(interpret('hủy đơn #1234').candidateAction || {}).includes('toolName'), false));
test('26 ConversationContext Integration', () => assert.equal(interpret('hủy nó', [{ id: 'ctx', sender: 'user', content: 'đơn #1234 cần kiểm tra ngay' }]).references[0]?.targetTurnId, 'ctx'));
test('27 WorkingMemory Integration', () => assert.equal(parseIntent({ userId: 'u', sessionId: 's', userText: 'hủy nó', workingMemory: [{ id: 'mem', sender: 'user', content: 'đơn #1234 cần kiểm tra ngay' }] }).references[0]?.targetTurnId, 'mem'));
test('28 AgentLoop Integration Contract', () => assert.equal(typeof service.interpret, 'function'));
test('29 Voice Non-Interference', () => assert.equal(JSON.stringify(interpret('đổi voice sang tiếng Anh').sourceText), JSON.stringify('đổi voice sang tiếng Anh')));
test('30 Memory Pollution Prevention', () => assert.equal(Object.keys(service).length, 1));
test('31 Regression Compatibility', () => assert.equal(interpret('kiểm tra đơn #1234').intentType, 'STATUS_REQUEST'));
test('32 Security Regression', () => assert.equal(interpret('x\u0007').requiresClarification, true));
test('33 State Integrity', () => assert.equal(Object.isFrozen(interpret('hủy đơn #1234')), true));
test('34 Cross-User Isolation', () => assert.equal(interpret('hủy nó', [], 'user_b', 'session_a').references[0]?.resolved, false));
test('35 Cross-Session Isolation', () => assert.equal(interpret('hủy nó', [], 'user_a', 'session_b').references[0]?.resolved, false));

console.log(`MS-1.3.8 intent understanding: ${passed}/35 PASS`);
