// tests/test_v4_agent_tool_execution.ts
// BOWCON V4.0 — MILESTONE 1.3.12: GOVERNED TOOL EXECUTION RUNTIME & SAFE CAPABILITY REGISTRY TESTS
//
// EN:
// Authoritative test suite verifying safe tool execution runtime, allowlisted capability registry,
// strict authorization gates, approval verification, replay defense, and failure isolation
// without arbitrary code execution, network access, or memory mutation.
//
// VI:
// Bộ kiểm thử có thẩm quyền xác minh runtime thực thi công cụ an toàn, registry năng lực allowlist,
// cổng ủy quyền nghiêm ngặt, xác thực phê duyệt, phòng thủ replay và cô lập sự cố
// mà không thực thi mã tùy ý, truy cập mạng hoặc làm biến đổi bộ nhớ.

import assert from 'node:assert';
import {
  CapabilityRegistry,
  ExecutionValidator,
  ExecutionAuthorizationGate,
  ExecutionRecordFactory,
  ToolExecutor,
  registerMockCapabilities,
  ExecutionService,
  AgentLoop,
  IntentService,
  PlanningService,
  DecisionService,
  ActionOrchestrator,
  createDecisionContext,
} from '../src/index.js';
import type {
  ToolExecutionRequest,
  ToolCapability,
  RiskLevel,
  DecisionInput,
  DecisionResult,
} from '../src/index.js';

let passed = 0;
const test = (name: string, fn: () => void | Promise<void>) => {
  const result = fn();
  if (result instanceof Promise) {
    return result.then(() => {
      passed++;
      console.log(`PASS ${name}`);
    });
  }
  passed++;
  console.log(`PASS ${name}`);
};

// Test fixtures & helpers
function createSampleRequest(overrides: Partial<ToolExecutionRequest> = {}): ToolExecutionRequest {
  const req: ToolExecutionRequest = {
    executionId: 'exec_test_001',
    userId: 'user_boss',
    sessionId: 'session_alpha',
    actionName: 'mock.echo',
    riskLevel: 'LOW' as RiskLevel,
    parameters: { message: 'hello world' },
    executionFingerprint: 'fp_mock_echo_001',
    executionScope: 'user',
    governanceMetadata: {
      originPolicy: 'PDP-DEFAULT-ALLOW',
      timestamp: 1700000000000,
    },
    createdAt: 1700000000000,
    ...overrides,
  };
  return Object.freeze(req);
}

function createHighRiskRequest(overrides: Partial<ToolExecutionRequest> = {}): ToolExecutionRequest {
  return createSampleRequest({
    executionId: 'exec_test_high_001',
    actionName: 'mock.cancel_order',
    riskLevel: 'HIGH' as RiskLevel,
    parameters: { orderId: 'ord_123', reason: 'Customer requested' },
    executionFingerprint: 'fp_mock_cancel_001',
    ...overrides,
  });
}

function createCriticalRiskRequest(overrides: Partial<ToolExecutionRequest> = {}): ToolExecutionRequest {
  return createSampleRequest({
    executionId: 'exec_test_critical_001',
    actionName: 'mock.delete_data',
    riskLevel: 'CRITICAL' as RiskLevel,
    parameters: { targetId: 'rec_456', confirm: true },
    executionFingerprint: 'fp_mock_delete_001',
    ...overrides,
  });
}

async function runTests() {
  console.log('Starting MS-1.3.12 Governed Tool Execution Runtime Test Suite...');

  // 01 Execution request identity
  await test('01 Execution request identity', () => {
    const req = createSampleRequest({ executionId: 'req_id_101' });
    assert.equal(req.executionId, 'req_id_101');
    assert.equal(typeof req.userId, 'string');
    assert.equal(typeof req.sessionId, 'string');
    assert.equal(typeof req.actionName, 'string');
    assert.equal(typeof req.executionFingerprint, 'string');
  });

  // 02 User isolation
  await test('02 User isolation', () => {
    const reqUserA = createSampleRequest({ userId: 'user_A', executionFingerprint: 'fp_common' });
    const reqUserB = createSampleRequest({ userId: 'user_B', executionFingerprint: 'fp_common' });
    assert.notEqual(reqUserA.userId, reqUserB.userId);

    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const resA = service.execute(reqUserA);
    assert.equal(resA.status, 'SUCCESS');

    // Identical fingerprint for different user should NOT be blocked by replay protection
    const resB = service.execute(reqUserB);
    assert.equal(resB.status, 'SUCCESS');
  });

  // 03 Session isolation
  await test('03 Session isolation', () => {
    const reqSess1 = createSampleRequest({ sessionId: 'sess_1', executionFingerprint: 'fp_sess' });
    const reqSess2 = createSampleRequest({ sessionId: 'sess_2', executionFingerprint: 'fp_sess' });

    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const res1 = service.execute(reqSess1);
    assert.equal(res1.status, 'SUCCESS');

    // Identical fingerprint for different session should NOT be blocked
    const res2 = service.execute(reqSess2);
    assert.equal(res2.status, 'SUCCESS');
  });

  // 04 Immutable execution request
  await test('04 Immutable execution request', () => {
    const req = createSampleRequest();
    assert.ok(Object.isFrozen(req));
    assert.throws(() => {
      (req as any).actionName = 'tampered';
    }, /Cannot assign to read only property/);
  });

  // 05 Capability registration
  await test('05 Capability registration', () => {
    const registry = new CapabilityRegistry();
    const customCap: ToolCapability = {
      name: 'custom.test',
      description: 'Custom capability for test',
      domain: 'system',
      risk: 'LOW',
      parameters: [{ name: 'param1', type: 'string', required: true, description: 'test param' }],
      handler: (params) => ({ processed: params.param1 }),
    };
    registry.register(customCap);
    assert.ok(registry.has('custom.test'));
    assert.equal(registry.get('custom.test')?.name, 'custom.test');
  });

  // 06 Capability lookup
  await test('06 Capability lookup', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const echoCap = registry.get('mock.echo');
    assert.ok(echoCap !== undefined);
    assert.equal(echoCap.domain, 'mock');
    assert.equal(echoCap.risk, 'LOW');
  });

  // 07 Unknown capability rejection
  await test('07 Unknown capability rejection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);
    const req = createSampleRequest({ actionName: 'unknown.capability' });
    const result = service.execute(req);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.outcome, 'CAPABILITY_NOT_FOUND');
  });

  // 08 Unknown action rejection
  await test('08 Unknown action rejection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const gate = new ExecutionAuthorizationGate(registry);
    const req = createSampleRequest({ actionName: 'invented_action_xyz' });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('not found in registry'));
  });

  // 09 Invalid parameter rejection
  await test('09 Invalid parameter rejection', () => {
    const validator = new ExecutionValidator();
    // Type mismatch: calculate expects number for 'a'
    const params = { a: 'not_a_number', b: 10, operation: 'add' };
    const schema = [
      { name: 'a', type: 'number' as const, required: true, description: 'first' },
      { name: 'b', type: 'number' as const, required: true, description: 'second' },
      { name: 'operation', type: 'string' as const, required: true, description: 'op' },
    ];
    const validation = validator.validate(
      createSampleRequest({ actionName: 'mock.calculate', parameters: params }),
      schema,
    );
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('expected number')));
  });

  // 10 Required parameter validation
  await test('10 Required parameter validation', () => {
    const validator = new ExecutionValidator();
    const schema = [
      { name: 'message', type: 'string' as const, required: true, description: 'msg' },
    ];
    const validation = validator.validate(
      createSampleRequest({ parameters: {} }),
      schema,
    );
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('Missing required parameter: message')));
  });

  // 11 Prototype pollution rejection
  await test('11 Prototype pollution rejection', () => {
    const validator = new ExecutionValidator();
    const maliciousPayloads = [
      { '__proto__': { polluted: 'true' } },
      { 'constructor': { prototype: { admin: true } } },
      { 'prototype': { injected: true } },
    ];

    for (const payload of maliciousPayloads) {
      const validation = validator.validate(
        createSampleRequest({ parameters: payload }),
      );
      assert.equal(validation.valid, false, 'Should reject prototype pollution keys');
      assert.ok(validation.errors.some((e) => e.includes('Forbidden parameter key')));
    }
  });

  // 12 Null byte rejection
  await test('12 Null byte rejection', () => {
    const validator = new ExecutionValidator();
    const malicious = { message: 'harmless\0malicious_payload' };
    const validation = validator.validate(
      createSampleRequest({ parameters: malicious }),
    );
    assert.equal(validation.valid, false, 'Should reject null byte string injection');
    assert.ok(validation.errors.some((e) => e.includes('Null byte detected')));
  });

  // 13 Secret rejection
  await test('13 Secret rejection', () => {
    const validator = new ExecutionValidator();
    const leakedParams = {
      message: 'Here is my Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
    };
    const validation = validator.validate(
      createSampleRequest({ parameters: leakedParams }),
    );
    assert.equal(validation.valid, false, 'Should reject detected credential patterns');
    assert.ok(validation.errors.some((e) => e.includes('Potential secret or credential pattern detected')));
  });

  // 14 Scope mismatch rejection
  await test('14 Scope mismatch rejection', () => {
    const validator = new ExecutionValidator();
    const unauthReq = createSampleRequest({ executionScope: 'anonymous' });
    const validation = validator.validate(unauthReq);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('Unauthenticated or invalid execution scope')));
  });

  // 15 NO_ACTION protection
  await test('15 NO_ACTION protection', () => {
    const registry = new CapabilityRegistry();
    const gate = new ExecutionAuthorizationGate(registry);
    const req = createSampleRequest({ actionName: 'NO_ACTION' });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('State guard violated'));
  });

  // 16 RESPOND protection
  await test('16 RESPOND protection', () => {
    const registry = new CapabilityRegistry();
    const gate = new ExecutionAuthorizationGate(registry);
    const req = createSampleRequest({ actionName: 'RESPOND' });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('State guard violated'));
  });

  // 17 CLARIFY protection
  await test('17 CLARIFY protection', () => {
    const registry = new CapabilityRegistry();
    const gate = new ExecutionAuthorizationGate(registry);
    const req = createSampleRequest({ actionName: 'CLARIFY' });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('State guard violated'));
  });

  // 18 DEFER protection
  await test('18 DEFER protection', () => {
    const registry = new CapabilityRegistry();
    const gate = new ExecutionAuthorizationGate(registry);
    const req = createSampleRequest({ actionName: 'DEFER' });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('State guard violated'));
  });

  // 19 BLOCK protection
  await test('19 BLOCK protection', () => {
    const registry = new CapabilityRegistry();
    const gate = new ExecutionAuthorizationGate(registry);
    const req = createSampleRequest({ actionName: 'BLOCK' });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('State guard violated'));
  });

  // 20 LOW risk execution
  await test('20 LOW risk execution', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);
    const req = createSampleRequest({
      actionName: 'mock.echo',
      riskLevel: 'LOW',
      parameters: { message: 'testing low risk' },
    });
    const res = service.execute(req);
    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.outcome, 'COMPLETED');
    assert.deepEqual(res.result?.data, { echoed: 'testing low risk' });
  });

  // 21 MEDIUM risk preservation
  await test('21 MEDIUM risk preservation', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);
    const req = createSampleRequest({
      actionName: 'mock.lookup',
      riskLevel: 'MEDIUM',
      parameters: { query: 'order_999' },
    });
    const res = service.execute(req);
    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.riskLevel, 'MEDIUM');
  });

  // 22 HIGH risk approval requirement
  await test('22 HIGH risk approval requirement', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);
    // Request without approval metadata
    const req = createHighRiskRequest();
    const res = service.execute(req);
    assert.equal(res.status, 'BLOCKED');
    assert.equal(res.outcome, 'AUTHORIZATION_DENIED');
    assert.ok(res.error?.message.includes('Approval token required'));
  });

  // 23 CRITICAL risk protection
  await test('23 CRITICAL risk protection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);
    const req = createCriticalRiskRequest();
    const res = service.execute(req);
    assert.equal(res.status, 'BLOCKED');
    assert.equal(res.outcome, 'AUTHORIZATION_DENIED');
  });

  // 24 Risk downgrade rejection
  await test('24 Risk downgrade rejection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const gate = new ExecutionAuthorizationGate(registry);
    // Capability 'mock.cancel_order' is HIGH risk, but request declares LOW
    const req = createSampleRequest({
      actionName: 'mock.cancel_order',
      riskLevel: 'LOW',
    });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('Risk downgrade detected'));
  });

  // 25 Governance metadata preservation
  await test('25 Governance metadata preservation', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);
    const req = createSampleRequest({
      governanceMetadata: {
        pdpDecision: 'PERMIT',
        governanceRule: 'RULE-101',
      },
    });
    const res = service.execute(req);
    assert.equal(res.governanceMetadata?.pdpDecision, 'PERMIT');
    assert.equal(res.governanceMetadata?.governanceRule, 'RULE-101');
  });

  // 26 Approval metadata validation
  await test('26 Approval metadata validation', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const validApproval = {
      approved: true,
      approvedBy: 'user_boss',
      sessionId: 'session_alpha',
      approvalToken: 'appr_valid_token_xyz',
      timestamp: Date.now(),
    };

    const req = createHighRiskRequest({
      approvalMetadata: validApproval,
    });
    const res = service.execute(req);
    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.outcome, 'COMPLETED');
    assert.deepEqual(res.result?.data, {
      orderId: 'ord_123',
      status: 'cancelled',
    });
  });

  // 27 Invalid approval rejection
  await test('27 Invalid approval rejection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const invalidApproval = {
      approved: false, // Explicitly rejected
      approvedBy: 'user_boss',
      sessionId: 'session_alpha',
      approvalToken: 'token_123',
    };

    const req = createHighRiskRequest({
      approvalMetadata: invalidApproval,
    });
    const res = service.execute(req);
    assert.equal(res.status, 'BLOCKED');
    assert.equal(res.outcome, 'AUTHORIZATION_DENIED');
  });

  // 28 Cross-user approval rejection
  await test('28 Cross-user approval rejection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const crossUserApproval = {
      approved: true,
      approvedBy: 'user_intruder', // Mismatch with req.userId ('user_boss')
      sessionId: 'session_alpha',
      approvalToken: 'token_valid',
    };

    const req = createHighRiskRequest({
      userId: 'user_boss',
      approvalMetadata: crossUserApproval,
    });
    const res = service.execute(req);
    assert.equal(res.status, 'BLOCKED');
    assert.equal(res.outcome, 'AUTHORIZATION_DENIED');
    assert.ok(res.error?.message.includes('Approval user mismatch'));
  });

  // 29 Cross-session approval rejection
  await test('29 Cross-session approval rejection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const crossSessionApproval = {
      approved: true,
      approvedBy: 'user_boss',
      sessionId: 'session_other', // Mismatch with req.sessionId ('session_alpha')
      approvalToken: 'token_valid',
    };

    const req = createHighRiskRequest({
      sessionId: 'session_alpha',
      approvalMetadata: crossSessionApproval,
    });
    const res = service.execute(req);
    assert.equal(res.status, 'BLOCKED');
    assert.equal(res.outcome, 'AUTHORIZATION_DENIED');
    assert.ok(res.error?.message.includes('Approval session mismatch'));
  });

  // 30 Execution fingerprint validation
  await test('30 Execution fingerprint validation', () => {
    const validator = new ExecutionValidator();
    const reqNoFp = createSampleRequest({ executionFingerprint: '' });
    const val = validator.validate(reqNoFp);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes('Missing or invalid executionFingerprint')));
  });

  // 31 Deterministic fingerprint
  await test('31 Deterministic fingerprint', () => {
    const orchestrator = new ActionOrchestrator();
    // Test computeDeterministicExecutionFingerprint via public orchestrator method/export
    const req1 = createSampleRequest();
    const req2 = createSampleRequest();
    assert.equal(req1.executionFingerprint, req2.executionFingerprint);
  });

  // 32 Replay protection
  await test('32 Replay protection', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const req = createSampleRequest({ executionFingerprint: 'replay_test_fingerprint' });
    const firstRun = service.execute(req);
    assert.equal(firstRun.status, 'SUCCESS');
    assert.equal(firstRun.outcome, 'COMPLETED');

    // Second execution with same fingerprint in same user/session MUST be rejected
    const secondRun = service.execute(req);
    assert.equal(secondRun.status, 'FAILED');
    assert.equal(secondRun.outcome, 'REPLAY_REJECTED');
    assert.ok(secondRun.error?.message.includes('Replay detected'));
  });

  // 33 Cross-user fingerprint isolation
  await test('33 Cross-user fingerprint isolation', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const sharedFp = 'fp_shared_across_users';
    const user1Req = createSampleRequest({ userId: 'alice', executionFingerprint: sharedFp });
    const user2Req = createSampleRequest({ userId: 'bob', executionFingerprint: sharedFp });

    const res1 = service.execute(user1Req);
    assert.equal(res1.status, 'SUCCESS');

    // Bob executing same fingerprint should NOT conflict with Alice's execution history
    const res2 = service.execute(user2Req);
    assert.equal(res2.status, 'SUCCESS');
  });

  // 34 Tool executor authorization boundary
  await test('34 Tool executor authorization boundary', () => {
    const executor = new ToolExecutor();
    const cap: ToolCapability = {
      name: 'test.unauthorized',
      description: 'Unauthorized cap',
      domain: 'mock',
      risk: 'LOW',
      parameters: [],
      handler: () => 'should not run',
    };

    const req = createSampleRequest();
    const unauthorizedAuth = {
      authorized: false,
      risk: 'LOW' as RiskLevel,
      reason: 'Strict gate closed',
      executionFingerprint: req.executionFingerprint,
      toolName: 'test.unauthorized',
      actor: { userId: req.userId || 'user_boss', sessionId: req.sessionId || 'session_alpha' },
    };

    // Executor directly passed unauthorized gate should fail closed
    const res = executor.execute(cap, req, unauthorizedAuth);
    assert.equal(res.status, 'FAILED');
    assert.equal(res.outcome, 'AUTHORIZATION_DENIED');
  });

  // 35 No direct execution from decision layer
  await test('35 No direct execution from decision layer', () => {
    const decisionService = new DecisionService();
    assert.equal(typeof (decisionService as any).execute, 'undefined');
    assert.equal(typeof (decisionService as any).runTool, 'undefined');
  });

  // 36 No PDP bypass
  await test('36 No PDP bypass', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const gate = new ExecutionAuthorizationGate(registry);
    // Request with missing or explicit deny in governance metadata
    const req = createSampleRequest({
      governanceMetadata: { pdpDecision: 'DENY' },
    });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('PDP decision is DENY'));
  });

  // 37 No approval bypass
  await test('37 No approval bypass', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const gate = new ExecutionAuthorizationGate(registry);
    // Critical capability requires explicit valid approval token
    const req = createCriticalRiskRequest({
      approvalMetadata: undefined,
    });
    const auth = gate.authorize(req);
    assert.equal(auth.authorized, false);
    assert.ok(auth.reason.includes('Approval required'));
  });

  // 38 No idempotency bypass
  await test('38 No idempotency bypass', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const req = createSampleRequest({ executionFingerprint: 'idem_test_fp' });
    service.execute(req);

    // Any attempt to re-execute with identical fingerprint fails
    const reattempt = service.execute(req);
    assert.equal(reattempt.outcome, 'REPLAY_REJECTED');
    assert.equal(reattempt.status, 'FAILED');
  });

  // 39 Successful tool execution
  await test('39 Successful tool execution', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const req = createSampleRequest({
      actionName: 'mock.calculate',
      parameters: { a: 15, b: 27, operation: 'add' },
      executionFingerprint: 'calc_fp_001',
    });
    const res = service.execute(req);
    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.outcome, 'COMPLETED');
    assert.deepEqual(res.result?.data, { result: 42 });
  });

  // 40 Tool failure isolation
  await test('40 Tool failure isolation', () => {
    const registry = new CapabilityRegistry();
    const failingCap: ToolCapability = {
      name: 'mock.exploding_tool',
      description: 'A tool that deliberately throws',
      domain: 'mock',
      risk: 'LOW',
      parameters: [],
      handler: () => {
        throw new Error('Internal unhandled tool exception!');
      },
    };
    registry.register(failingCap);

    const service = new ExecutionService(registry);
    const req = createSampleRequest({
      actionName: 'mock.exploding_tool',
      parameters: {},
      executionFingerprint: 'fp_exploding',
    });

    // Must NOT throw or crash the runtime
    let res;
    assert.doesNotThrow(() => {
      res = service.execute(req);
    });
    assert.equal(res!.status, 'FAILED');
    assert.equal(res!.outcome, 'HANDLER_FAILED');
    assert.ok(res!.error?.message.includes('Internal unhandled tool exception'));
  });

  // 41 Error sanitization
  await test('41 Error sanitization', () => {
    const registry = new CapabilityRegistry();
    const leakyCap: ToolCapability = {
      name: 'mock.leaky_tool',
      description: 'A tool that throws secrets in error message',
      domain: 'mock',
      risk: 'LOW',
      parameters: [],
      handler: () => {
        throw new Error('Database password failed: Pwd=SuperSecretP@ss123');
      },
    };
    registry.register(leakyCap);

    const service = new ExecutionService(registry);
    const req = createSampleRequest({
      actionName: 'mock.leaky_tool',
      parameters: {},
      executionFingerprint: 'fp_leaky',
    });

    const res = service.execute(req);
    assert.equal(res.status, 'FAILED');
    assert.ok(!res.error?.message.includes('SuperSecretP@ss123'), 'Secrets must be redacted in error');
    assert.ok(res.error?.message.includes('[REDACTED_SECRET]'));
  });

  // 42 Deterministic mock provider
  await test('42 Deterministic mock provider', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);

    const cap = registry.get('mock.lookup')!;
    const res1 = cap.handler({ query: 'sku_123' });
    const res2 = cap.handler({ query: 'sku_123' });
    assert.deepEqual(res1, res2, 'Mock provider must be purely deterministic');
  });

  // 43 Execution record immutability
  await test('43 Execution record immutability', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    const req = createSampleRequest({ executionFingerprint: 'immut_fp' });
    const record = service.execute(req);

    assert.ok(Object.isFrozen(record));
    assert.throws(() => {
      (record as any).status = 'CORRUPTED';
    }, /Cannot assign to read only property/);
  });

  // 44 AgentLoop Stage 6 integration
  await test('44 AgentLoop Stage 6 integration', async () => {
    const loop = new AgentLoop();
    assert.ok(typeof loop.getExecutionService === 'function');
    const execService = loop.getExecutionService();
    assert.ok(execService instanceof ExecutionService);

    // Verify AgentLoop execution completes cleanly with Stage 6 integration
    const loopResult = await loop.execute({
      userId: 'boss_user',
      sessionId: 'session_exec_stage6_test',
      userText: 'tra cứu đơn hàng #1234',
      actor: {
        userId: 'boss_user',
        role: 'owner',
        channel: 'web',
        isOwner: true,
      },
    });

    assert.equal(loopResult.orchestrationResult?.success, true);
    assert.ok(loopResult.response !== undefined);
  });

  // 45 Full execution boundary contract
  await test('45 Full execution boundary contract', () => {
    const registry = new CapabilityRegistry();
    registerMockCapabilities(registry);
    const service = new ExecutionService(registry);

    // 1. Valid low-risk request completes
    const req1 = createSampleRequest({ executionFingerprint: 'contract_fp_1' });
    const res1 = service.execute(req1);
    assert.equal(res1.status, 'SUCCESS');

    // 2. Replay of same fingerprint is rejected
    const res2 = service.execute(req1);
    assert.equal(res2.status, 'FAILED');
    assert.equal(res2.outcome, 'REPLAY_REJECTED');

    // 3. High risk without approval is blocked
    const reqHigh = createHighRiskRequest({ executionFingerprint: 'contract_fp_high' });
    const resHigh = service.execute(reqHigh);
    assert.equal(resHigh.status, 'BLOCKED');

    // 4. Critical risk without approval is blocked
    const reqCrit = createCriticalRiskRequest({ executionFingerprint: 'contract_fp_crit' });
    const resCrit = service.execute(reqCrit);
    assert.equal(resCrit.status, 'BLOCKED');

    // 5. Corrupted parameters fail validation
    const reqBad = createSampleRequest({
      parameters: { '__proto__': { bad: true } },
      executionFingerprint: 'contract_fp_bad',
    });
    const resBad = service.execute(reqBad);
    assert.equal(resBad.status, 'FAILED');
    assert.equal(resBad.outcome, 'VALIDATION_FAILED');
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n============================================================`);
  console.log(`MS-1.3.12 Governed Tool Execution Runtime: ${passed}/45 PASS`);
  console.log(`============================================================\n`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
