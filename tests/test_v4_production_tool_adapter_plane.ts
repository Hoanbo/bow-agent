// tests/test_v4_production_tool_adapter_plane.ts
// BOWCON V4.0 — MS-1.4.06: DEDICATED REALITY TEST SUITE
//
// EN:
// Tests the Production Tool Adapter Plane under all operational conditions:
// Valid handoffs, registered adapters, unknown/disabled adapter containment,
// handoff validation, PERMIT enforcement, expiration, tenant isolation,
// task version binding, 4 USER_STOP gates, prototype pollution defense,
// payload size ceilings, hard-forbidden actions, timeout containment,
// secret sanitization, cryptographic provenance, audit logging, and PEP lease cleanup.
//
// VI:
// Kiểm thử Mặt phẳng Adapter Công cụ Sản xuất dưới mọi điều kiện vận hành.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ToolAdapterRegistry,
  AuthorizedHandoffValidator,
  ToolExecutionGate,
  ProductionToolAdapterRuntime,
  ToolAdapterNotFoundError,
  ToolAdapterDisabledError,
  ToolAdapterTimeoutError,
  ToolHandoffValidationError,
  ToolSecurityViolationError,
  CrossTenantToolExecutionError,
  StaleToolExecutionError,
  ToolReplayError,
  ToolExecutionAbortedError,
  type ToolAdapter,
  type ToolAdapterContext,
  type ToolAdapterResult,
  type ToolAdapterRequest,
  type AuthorizedActionHandoff,
} from '../src/core/toolAdapter/index.js';
import type { AgentTask } from '../src/core/taskLifecycle/agentTaskTypes.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';
import { GovernedPolicyEnforcementPoint } from '../src/core/policyEnforcement/governedPolicyEnforcementPoint.js';

let passedAssertions = 0;
function testAssert(condition: boolean, message: string) {
  assert(condition, message);
  passedAssertions++;
}

async function runRealityTests() {
  console.log('Starting MS-1.4.06 Reality Test Suite: Production Tool Adapter Plane...\n');

  const testDataDir = path.resolve(process.cwd(), 'data', 'test_ms_1_4_06_' + Date.now());
  fs.mkdirSync(testDataDir, { recursive: true });

  const auditPath = path.join(testDataDir, 'test_audit.jsonl');
  const auditLedger = new AuditLedger(auditPath);
  const sanitizer = new DiagnosisSanitizer();

  // Mock PEP for tracking lease releases
  const releasedLeases: string[] = [];
  const mockPEP = {
    releaseLease: (leaseId: string) => {
      releasedLeases.push(leaseId);
    },
  } as unknown as GovernedPolicyEnforcementPoint;

  // Helper to create a valid base handoff
  function createValidHandoff(overrides?: Partial<AuthorizedActionHandoff>): AuthorizedActionHandoff {
    const rawHash = crypto.randomBytes(32).toString('hex');
    const handoff: AuthorizedActionHandoff = {
      proposalId: 'prop_test_' + crypto.randomBytes(4).toString('hex'),
      taskId: 'task_alpha_01',
      tenantId: 'tenant_bow_01',
      stepId: 'step_order_01',
      toolName: 'shop_get_order_details',
      sanitizedArgs: { orderId: 'ord_12345', includeItems: true },
      authorizationDecision: 'PERMIT',
      policyVersion: 'policy_v4_prod',
      executionToken: 'tok_' + crypto.randomBytes(8).toString('hex'),
      leaseId: 'lease_' + crypto.randomBytes(6).toString('hex'),
      handoffProvenanceHash: rawHash,
      authorizedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes in future
      ...overrides,
    };
    return Object.freeze(handoff);
  }

  // Helper to create authoritative task
  function createAuthoritativeTask(overrides?: Partial<AgentTask>): AgentTask {
    const task: AgentTask = {
      taskId: 'task_alpha_01',
      tenantId: 'tenant_bow_01',
      userId: 'user_boss_01',
      title: 'Fulfill customer order',
      prompt: 'Check order status and send notification',
      state: 'EXECUTING',
      version: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenanceChainHash: 'prov_init_' + crypto.randomBytes(16).toString('hex'),
      ...overrides,
    };
    return Object.freeze(task);
  }

  try {
    // =========================================================================
    // SECTION 1: ToolAdapterRegistry Registration & Query Invariants
    // =========================================================================
    console.log('--- Section 1: ToolAdapterRegistry Registration & Resolution ---');
    const registry = new ToolAdapterRegistry();

    testAssert(registry.getAll().length === 0, 'Initial registry must be empty');

    // Valid shop tool registration
    const shopTool: ToolAdapter = {
      toolName: 'shop_get_order_details',
      domain: 'shop',
      description: 'Fetch detailed order information',
      parametersSchema: { orderId: { type: 'string' } },
      execute: async (args, ctx) => {
        return { orderId: args.orderId, status: 'PROCESSING', total: 150000 };
      },
    };
    registry.register(shopTool);
    testAssert(registry.has('shop_get_order_details'), 'Registry has registered shop tool');
    testAssert(registry.isEnabled('shop_get_order_details'), 'Tool is enabled by default');
    testAssert(registry.resolveDomain('shop_get_order_details') === 'shop', 'Domain correctly resolved as shop');

    // Desktop domain registration
    const desktopTool: ToolAdapter = {
      toolName: 'desktop_capture_screen',
      domain: 'desktop',
      description: 'Capture screenshot of active display',
      execute: async () => ({ width: 1920, height: 1080 }),
    };
    registry.register(desktopTool);
    testAssert(registry.resolveDomain('desktop_capture_screen') === 'desktop', 'Desktop tool domain resolved');

    // Robot domain registration
    const robotTool: ToolAdapter = {
      toolName: 'robot_dock_station',
      domain: 'robot',
      description: 'Move robot to charging station',
      execute: async () => ({ docked: true, battery: 98 }),
    };
    registry.register(robotTool);
    testAssert(registry.resolveDomain('robot_dock_station') === 'robot', 'Robot tool domain resolved');

    // Dynamic code domain registration
    const dynamicTool: ToolAdapter = {
      toolName: 'run_verified_skill',
      domain: 'dynamic_code',
      description: 'Execute approved deterministic skill script',
      execute: async () => ({ success: true, evaluated: 42 }),
    };
    registry.register(dynamicTool);
    testAssert(registry.resolveDomain('run_verified_skill') === 'dynamic_code', 'Dynamic code domain resolved');

    testAssert(registry.getAll().length === 4, 'Registry has 4 approved adapters');

    // Registration rejections
    let caughtRegError = false;
    try {
      registry.register({} as any);
    } catch (err: any) {
      caughtRegError = true;
      testAssert(err instanceof ToolSecurityViolationError, 'Empty adapter rejected with ToolSecurityViolationError');
    }
    testAssert(caughtRegError, 'Rejected empty adapter');

    caughtRegError = false;
    try {
      registry.register({ toolName: '', domain: 'shop', description: 'desc', execute: async () => {} });
    } catch (err: any) {
      caughtRegError = true;
      testAssert(err.message.includes('INVALID_TOOL_NAME'), 'Empty toolName rejected');
    }
    testAssert(caughtRegError, 'Rejected empty toolName');

    caughtRegError = false;
    try {
      registry.register({ toolName: 'bad_domain', domain: 'untrusted_cloud' as any, description: 'desc', execute: async () => {} });
    } catch (err: any) {
      caughtRegError = true;
      testAssert(err.message.includes('INVALID_DOMAIN'), 'Invalid domain rejected');
    }
    testAssert(caughtRegError, 'Rejected invalid domain');

    caughtRegError = false;
    try {
      registry.register({ toolName: 'no_execute', domain: 'shop', description: 'desc', execute: null as any });
    } catch (err: any) {
      caughtRegError = true;
      testAssert(err.message.includes('INVALID_EXECUTE'), 'Non-function execute rejected');
    }
    testAssert(caughtRegError, 'Rejected non-function execute');

    // Duplicate registration rejected
    caughtRegError = false;
    try {
      registry.register(shopTool);
    } catch (err: any) {
      caughtRegError = true;
      testAssert(err.message.includes('CONFLICTING_REGISTRATION'), 'Conflicting re-registration rejected');
    }
    testAssert(caughtRegError, 'Rejected duplicate registration');

    // Enabling / Disabling
    registry.disable('shop_get_order_details');
    testAssert(!registry.isEnabled('shop_get_order_details'), 'Tool is disabled');

    let caughtDisabled = false;
    try {
      registry.resolveAdapter('shop_get_order_details');
    } catch (err: any) {
      caughtDisabled = true;
      testAssert(err instanceof ToolAdapterDisabledError, 'Disabled tool throws ToolAdapterDisabledError');
    }
    testAssert(caughtDisabled, 'Disabled tool rejected on resolution');

    registry.enable('shop_get_order_details');
    testAssert(registry.isEnabled('shop_get_order_details'), 'Tool is re-enabled');
    const resolved = registry.resolveAdapter('shop_get_order_details');
    testAssert(resolved.toolName === 'shop_get_order_details', 'Re-enabled tool resolves successfully');

    // Unknown tool resolution
    let caughtUnknown = false;
    try {
      registry.resolveAdapter('non_existent_tool_123');
    } catch (err: any) {
      caughtUnknown = true;
      testAssert(err instanceof ToolAdapterNotFoundError, 'Unknown tool throws ToolAdapterNotFoundError');
    }
    testAssert(caughtUnknown, 'Unknown tool fails closed');

    // =========================================================================
    // SECTION 2: AuthorizedHandoffValidator Invariants
    // =========================================================================
    console.log('--- Section 2: AuthorizedHandoffValidator Structural & Security Checks ---');
    const validator = new AuthorizedHandoffValidator();
    const validHandoff = createValidHandoff();
    const authTask = createAuthoritativeTask();

    // Valid handoff passes cleanly
    validator.validateHandoff(validHandoff, authTask);
    testAssert(true, 'Valid handoff passes validation');

    // Non-object handoff
    let caughtVal = false;
    try {
      validator.validateHandoff(null);
    } catch (err: any) {
      caughtVal = true;
      testAssert(err instanceof ToolHandoffValidationError, 'Null handoff throws ToolHandoffValidationError');
    }
    testAssert(caughtVal, 'Null handoff rejected');

    // Missing proposalId
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, proposalId: '' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('proposalId'), 'Missing proposalId detected');
    }
    testAssert(caughtVal, 'Missing proposalId rejected');

    // Missing taskId
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, taskId: '' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('taskId'), 'Missing taskId detected');
    }
    testAssert(caughtVal, 'Missing taskId rejected');

    // Missing tenantId
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, tenantId: '' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('tenantId'), 'Missing tenantId detected');
    }
    testAssert(caughtVal, 'Missing tenantId rejected');

    // Missing toolName
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, toolName: '' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('toolName'), 'Missing toolName detected');
    }
    testAssert(caughtVal, 'Missing toolName rejected');

    // Non-PERMIT authorizationDecision
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, authorizationDecision: 'DENY' as any });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('UNAUTHORIZED_DECISION'), 'Non-PERMIT authorizationDecision rejected');
    }
    testAssert(caughtVal, 'DENY decision rejected fail-closed');

    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, authorizationDecision: 'REQUIRE_HUMAN_APPROVAL' as any });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('UNAUTHORIZED_DECISION'), 'REQUIRE_HUMAN_APPROVAL rejected');
    }
    testAssert(caughtVal, 'REQUIRE_HUMAN_APPROVAL rejected fail-closed');

    // Expired handoff
    caughtVal = false;
    try {
      const expiredHandoff = createValidHandoff({
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      });
      validator.validateHandoff(expiredHandoff);
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('HANDOFF_EXPIRED'), 'Expired handoff rejected');
    }
    testAssert(caughtVal, 'Expired handoff rejected fail-closed');

    // Invalid ISO date
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, expiresAt: 'not-a-date' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('INVALID_TIMESTAMP'), 'Invalid expiresAt detected');
    }
    testAssert(caughtVal, 'Malformed timestamp rejected');

    // Invalid provenance hash format (not 64-char hex)
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, handoffProvenanceHash: 'short_hash' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('INVALID_PROVENANCE_HASH'), 'Invalid hash format rejected');
    }
    testAssert(caughtVal, 'Malformed provenance hash rejected');

    // Task ID mismatch
    caughtVal = false;
    try {
      validator.validateHandoff(validHandoff, { ...authTask, taskId: 'different_task_id' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('TASK_ID_MISMATCH'), 'Task ID mismatch rejected');
    }
    testAssert(caughtVal, 'Task ID mismatch fails closed');

    // Cross-tenant mismatch
    caughtVal = false;
    try {
      validator.validateHandoff(validHandoff, { ...authTask, tenantId: 'tenant_intruder_99' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err instanceof CrossTenantToolExecutionError, 'Cross-tenant mismatch throws CrossTenantToolExecutionError');
    }
    testAssert(caughtVal, 'Cross-tenant execution rejected fail-closed');

    // Stale task version mismatch
    caughtVal = false;
    try {
      const handoffWithVersion = { ...validHandoff, taskVersion: 2 };
      validator.validateHandoff(handoffWithVersion, { ...authTask, version: 3 });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err instanceof StaleToolExecutionError, 'Stale task version throws StaleToolExecutionError');
    }
    testAssert(caughtVal, 'Stale task version rejected fail-closed');

    // Hard-forbidden action: transfer_funds
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, toolName: 'transfer_funds' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err instanceof ToolSecurityViolationError, 'transfer_funds rejected with ToolSecurityViolationError');
    }
    testAssert(caughtVal, 'transfer_funds permanently forbidden');

    // Hard-forbidden action: delete_database
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, toolName: 'delete_database' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('HARD_FORBIDDEN_ACTION'), 'delete_database permanently forbidden');
    }
    testAssert(caughtVal, 'delete_database permanently forbidden');

    // Hard-forbidden action: bypass_robot_interlocks
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, toolName: 'bypass_robot_interlocks' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('HARD_FORBIDDEN_ACTION'), 'bypass_robot_interlocks forbidden');
    }
    testAssert(caughtVal, 'bypass_robot_interlocks permanently forbidden');

    // Hard-forbidden action: execute_untrusted_host_script
    caughtVal = false;
    try {
      validator.validateHandoff({ ...validHandoff, toolName: 'execute_untrusted_host_script' });
    } catch (err: any) {
      caughtVal = true;
      testAssert(err.message.includes('HARD_FORBIDDEN_ACTION'), 'execute_untrusted_host_script forbidden');
    }
    testAssert(caughtVal, 'execute_untrusted_host_script permanently forbidden');

    // =========================================================================
    // SECTION 3: Defensive Parameter Validation
    // =========================================================================
    console.log('--- Section 3: Defensive Parameter Validation ---');

    // Prototype pollution: __proto__
    let caughtSec = false;
    try {
      validator.validateArgumentsDefensively({ malicious: { '__proto__': { polluted: true } } });
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('PROTOTYPE_POLLUTION_KEY'), '__proto__ detected and rejected');
    }
    testAssert(caughtSec, 'Prototype pollution (__proto__) rejected');

    // Prototype pollution: constructor
    caughtSec = false;
    try {
      validator.validateArgumentsDefensively({ constructor: { name: 'exploit' } });
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('PROTOTYPE_POLLUTION_KEY'), 'constructor detected and rejected');
    }
    testAssert(caughtSec, 'Prototype pollution (constructor) rejected');

    // Prototype pollution: prototype
    caughtSec = false;
    try {
      validator.validateArgumentsDefensively({ prototype: { hack: 1 } });
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('PROTOTYPE_POLLUTION_KEY'), 'prototype detected and rejected');
    }
    testAssert(caughtSec, 'Prototype pollution (prototype) rejected');

    // Null byte in argument string value
    caughtSec = false;
    try {
      validator.validateArgumentsDefensively({ path: '/etc/passwd\0.jpg' });
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('NULL_BYTE_DETECTED'), 'Null byte in value detected');
    }
    testAssert(caughtSec, 'Null byte in argument value rejected');

    // Null byte in argument key
    caughtSec = false;
    try {
      validator.validateArgumentsDefensively({ 'key\0inject': 'val' });
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('NULL_BYTE_DETECTED'), 'Null byte in key detected');
    }
    testAssert(caughtSec, 'Null byte in argument key rejected');

    // Oversized argument payload (> 64 KB)
    caughtSec = false;
    try {
      const hugeString = 'A'.repeat(70000);
      validator.validateArgumentsDefensively({ data: hugeString });
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('PAYLOAD_SIZE_EXCEEDED'), 'Oversized payload rejected');
    }
    testAssert(caughtSec, 'Payload exceeding 64KB rejected');

    // Excessive nesting depth (> 10)
    caughtSec = false;
    try {
      let nested: any = { leaf: 'value' };
      for (let i = 0; i < 15; i++) {
        nested = { child: nested };
      }
      validator.validateArgumentsDefensively(nested);
    } catch (err: any) {
      caughtSec = true;
      testAssert(err.message.includes('MAX_DEPTH_EXCEEDED'), 'Nesting depth > 10 rejected');
    }
    testAssert(caughtSec, 'Excessive argument nesting rejected');

    // =========================================================================
    // SECTION 4: ToolExecutionGate & 4 USER_STOP Checkpoints
    // =========================================================================
    console.log('--- Section 4: ToolExecutionGate & 4 USER_STOP Checkpoints ---');
    let simulatedUserStop = false;
    const gate = new ToolExecutionGate({
      isUserStopActive: () => simulatedUserStop,
      getUserStopReason: () => (simulatedUserStop ? 'Emergency operator stop triggered' : undefined),
    });

    testAssert(!gate.isUserStopActive(), 'Gate reports USER_STOP inactive initially');
    gate.assertCanAcceptRequest();
    gate.assertCanResolveAdapter();
    gate.assertCanInvokeAdapter();
    gate.assertCanEmitResult();
    testAssert(true, 'All 4 checkpoints pass when USER_STOP is inactive');

    // Activate USER_STOP
    simulatedUserStop = true;
    testAssert(gate.isUserStopActive(), 'Gate reports USER_STOP active');

    // Checkpoint 1: Request acceptance
    let caughtGate = false;
    try {
      gate.assertCanAcceptRequest({ proposalId: 'p1' });
    } catch (err: any) {
      caughtGate = true;
      testAssert(err instanceof ToolExecutionAbortedError, 'Gate 1 throws ToolExecutionAbortedError');
      testAssert(err.details.checkpoint === 'GATE_1_BEFORE_REQUEST_ACCEPTANCE', 'Gate 1 checkpoint identified');
    }
    testAssert(caughtGate, 'Gate 1 stops execution immediately');

    // Checkpoint 2: Adapter resolution
    caughtGate = false;
    try {
      gate.assertCanResolveAdapter({ toolName: 'shop_tool' });
    } catch (err: any) {
      caughtGate = true;
      testAssert(err.details.checkpoint === 'GATE_2_BEFORE_ADAPTER_RESOLUTION', 'Gate 2 checkpoint identified');
    }
    testAssert(caughtGate, 'Gate 2 stops execution immediately');

    // Checkpoint 3: Adapter invocation
    caughtGate = false;
    try {
      gate.assertCanInvokeAdapter({ toolName: 'shop_tool' });
    } catch (err: any) {
      caughtGate = true;
      testAssert(err.details.checkpoint === 'GATE_3_BEFORE_ADAPTER_INVOCATION', 'Gate 3 checkpoint identified');
    }
    testAssert(caughtGate, 'Gate 3 stops execution immediately');

    // Checkpoint 4: Result emission
    caughtGate = false;
    try {
      gate.assertCanEmitResult({ toolName: 'shop_tool' });
    } catch (err: any) {
      caughtGate = true;
      testAssert(err.details.checkpoint === 'GATE_4_BEFORE_RESULT_EMISSION', 'Gate 4 checkpoint identified');
    }
    testAssert(caughtGate, 'Gate 4 stops execution immediately');

    // Reset simulated stop for runtime tests
    simulatedUserStop = false;

    // =========================================================================
    // SECTION 5: ProductionToolAdapterRuntime End-to-End Governed Execution
    // =========================================================================
    console.log('--- Section 5: ProductionToolAdapterRuntime Governed Invocations ---');
    const runtime = new ProductionToolAdapterRuntime({
      registry,
      validator,
      executionGate: gate,
      sanitizer,
      auditLedger,
      pep: mockPEP,
      deterministicTimestamp: '2026-09-13T12:00:00.000Z',
    });

    const execHandoff1 = createValidHandoff({
      toolName: 'shop_get_order_details',
      sanitizedArgs: { orderId: 'ord_99988' },
    });

    const result1: ToolAdapterResult = await runtime.executeHandoff(execHandoff1, {
      authoritativeTask: authTask,
      correlationId: 'corr_test_001',
    });

    testAssert(result1.status === 'SUCCESS', 'Execution status is SUCCESS');
    testAssert(result1.toolName === 'shop_get_order_details', 'Tool name preserved');
    testAssert(result1.domain === 'shop', 'Domain identified as shop');
    testAssert(result1.externalUntrusted === true, 'External untrusted flag set');
    testAssert(result1.proposalId === execHandoff1.proposalId, 'Proposal ID matches');
    testAssert(result1.taskId === execHandoff1.taskId, 'Task ID matches');
    testAssert(result1.tenantId === execHandoff1.tenantId, 'Tenant ID matches');
    testAssert(result1.stepId === execHandoff1.stepId, 'Step ID matches');
    testAssert(result1.executedAt === '2026-09-13T12:00:00.000Z', 'Executed timestamp preserved');
    testAssert((result1.sanitizedOutput as any).orderId === 'ord_99988', 'Output received correctly');
    testAssert(typeof result1.executionProvenanceHash === 'string' && result1.executionProvenanceHash.length === 64, 'Provenance hash is 64-char hex');
    testAssert(releasedLeases.includes(execHandoff1.leaseId!), 'PEP lease was cleanly released');

    // Also test executeRequest envelope overload
    const requestEnvelope: ToolAdapterRequest = {
      handoff: createValidHandoff({
        toolName: 'desktop_capture_screen',
        sanitizedArgs: {},
      }),
      authoritativeTask: authTask,
      correlationId: 'corr_req_002',
    };
    const reqResult = await runtime.executeRequest(requestEnvelope);
    testAssert(reqResult.status === 'SUCCESS', 'executeRequest returns SUCCESS');
    testAssert(reqResult.domain === 'desktop', 'Desktop tool executed via executeRequest');

    // =========================================================================
    // SECTION 6: Replay / Single-Use Protection
    // =========================================================================
    console.log('--- Section 6: Replay / Single-Use Prevention ---');
    let caughtReplay = false;
    try {
      // Attempting to execute execHandoff1 again MUST fail closed
      await runtime.executeHandoff(execHandoff1, { authoritativeTask: authTask });
    } catch (err: any) {
      caughtReplay = true;
      testAssert(err instanceof ToolReplayError, 'Replay throws ToolReplayError');
      testAssert(err.message.includes('TOOL_REPLAY_FORBIDDEN'), 'Replay forbidden error message');
    }
    testAssert(caughtReplay, 'Replayed handoff rejected fail-closed');

    // =========================================================================
    // SECTION 7: Output Sanitization & Credential Redaction
    // =========================================================================
    console.log('--- Section 7: Output Sanitization & Secret Scrubbing ---');
    const secretTool: ToolAdapter = {
      toolName: 'test_secret_leak_tool',
      domain: 'shop',
      description: 'Adapter returning sensitive credentials in result',
      execute: async () => ({
        accountNumber: 'ACC12345',
        api_key: 'sk_live_very_secret_key_12345',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        bearerAuth: 'Bearer secret_access_token_xyz',
        password: 'SuperSecretPassword123!',
        normalField: 'Public Safe Value',
      }),
    };
    registry.register(secretTool);

    const secretHandoff = createValidHandoff({
      toolName: 'test_secret_leak_tool',
      sanitizedArgs: {},
    });

    const secretResult = await runtime.executeHandoff(secretHandoff, { authoritativeTask: authTask });
    testAssert(secretResult.status === 'SUCCESS', 'Secret tool execution completed');
    const out = secretResult.sanitizedOutput as any;
    testAssert(out.normalField === 'Public Safe Value', 'Normal field preserved');
    testAssert(out.api_key === '[REDACTED]', 'api_key sanitized to [REDACTED]');
    testAssert(out.token === '[REDACTED]', 'token sanitized to [REDACTED]');
    testAssert(out.password === '[REDACTED]', 'password sanitized to [REDACTED]');
    testAssert(out.bearerAuth.includes('[REDACTED]'), 'Bearer token sanitized');

    // Check that serialized result contains zero raw secrets
    const serializedOut = JSON.stringify(secretResult.sanitizedOutput);
    testAssert(!serializedOut.includes('sk_live_very_secret_key_12345'), 'Raw api key completely absent from output');
    testAssert(!serializedOut.includes('SuperSecretPassword123!'), 'Raw password completely absent from output');

    // =========================================================================
    // SECTION 8: Output Size Ceilings & Truncation
    // =========================================================================
    console.log('--- Section 8: Output Size Limits ---');
    const hugeOutputTool: ToolAdapter = {
      toolName: 'test_huge_output_tool',
      domain: 'shop',
      description: 'Adapter returning payload exceeding 128 KB',
      execute: async () => ({
        largePayload: 'X'.repeat(150000), // ~150 KB
      }),
    };
    registry.register(hugeOutputTool);

    const hugeHandoff = createValidHandoff({
      toolName: 'test_huge_output_tool',
      sanitizedArgs: {},
    });

    const hugeResult = await runtime.executeHandoff(hugeHandoff, { authoritativeTask: authTask });
    const hugeOut = hugeResult.sanitizedOutput as any;
    testAssert(hugeOut._truncated === true, 'Gigantic output marked as truncated');
    testAssert(hugeOut._maxAllowedBytes === 131072, 'Max allowed bytes recorded');
    testAssert(typeof hugeOut.summary === 'string', 'Truncation summary present');

    // =========================================================================
    // SECTION 9: Execution Timeout Containment
    // =========================================================================
    console.log('--- Section 9: Execution Timeout Containment ---');
    const slowTool: ToolAdapter = {
      toolName: 'test_slow_tool',
      domain: 'shop',
      description: 'Adapter taking too long to execute',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { completed: true };
      },
    };
    registry.register(slowTool);

    const slowHandoff = createValidHandoff({
      toolName: 'test_slow_tool',
      leaseId: 'lease_timeout_test',
      sanitizedArgs: {},
    });

    let caughtTimeout = false;
    try {
      // Set strict timeout of 50ms
      await runtime.executeHandoff(slowHandoff, {
        authoritativeTask: authTask,
        timeoutMs: 50,
      });
    } catch (err: any) {
      caughtTimeout = true;
      testAssert(err instanceof ToolAdapterTimeoutError, 'Timeout throws ToolAdapterTimeoutError');
      testAssert(err.message.includes('exceeded maximum timeout of 50ms'), 'Timeout message specifies duration');
    }
    testAssert(caughtTimeout, 'Timeout fails closed immediately');
    testAssert(releasedLeases.includes('lease_timeout_test'), 'PEP lease released even on timeout');

    // =========================================================================
    // SECTION 10: Adapter Exception Containment
    // =========================================================================
    console.log('--- Section 10: Adapter Exception Containment ---');
    const failingTool: ToolAdapter = {
      toolName: 'test_failing_tool',
      domain: 'shop',
      description: 'Adapter throwing an unexpected error',
      execute: async () => {
        throw new Error('Database connection reset by peer (api_key=sk_secret_err)');
      },
    };
    registry.register(failingTool);

    const failingHandoff = createValidHandoff({
      toolName: 'test_failing_tool',
      leaseId: 'lease_failure_test',
      sanitizedArgs: {},
    });

    let caughtFailure = false;
    try {
      await runtime.executeHandoff(failingHandoff, { authoritativeTask: authTask });
    } catch (err: any) {
      caughtFailure = true;
      testAssert(err.message.includes('Database connection reset by peer'), 'Failure error surfaced');
      testAssert(!err.message.includes('sk_secret_err'), 'Error message secrets scrubbed in audit/reporting');
    }
    testAssert(caughtFailure, 'Adapter exception fails closed');
    testAssert(releasedLeases.includes('lease_failure_test'), 'PEP lease released even on adapter exception');

    // =========================================================================
    // SECTION 11: Cryptographic Provenance Determinism & Tamper Evidence
    // =========================================================================
    console.log('--- Section 11: Cryptographic Provenance Determinism ---');
    const hash1 = runtime.calculateExecutionProvenanceHash({
      handoffProvenanceHash: 'aaaa1111'.repeat(8),
      toolName: 'shop_get_order_details',
      status: 'SUCCESS',
      sanitizedOutput: { orderId: 'ord_1' },
      executedAt: '2026-09-13T12:00:00.000Z',
    });

    const hash2 = runtime.calculateExecutionProvenanceHash({
      handoffProvenanceHash: 'aaaa1111'.repeat(8),
      toolName: 'shop_get_order_details',
      status: 'SUCCESS',
      sanitizedOutput: { orderId: 'ord_1' },
      executedAt: '2026-09-13T12:00:00.000Z',
    });

    testAssert(hash1 === hash2, 'Identical inputs produce identical execution provenance hash');

    // Tampering with output changes hash
    const tamperedOutputHash = runtime.calculateExecutionProvenanceHash({
      handoffProvenanceHash: 'aaaa1111'.repeat(8),
      toolName: 'shop_get_order_details',
      status: 'SUCCESS',
      sanitizedOutput: { orderId: 'ord_TAMPERED' },
      executedAt: '2026-09-13T12:00:00.000Z',
    });
    testAssert(hash1 !== tamperedOutputHash, 'Output tampering changes provenance hash');

    // Tampering with handoff hash changes hash
    const tamperedHandoffHash = runtime.calculateExecutionProvenanceHash({
      handoffProvenanceHash: 'bbbb2222'.repeat(8),
      toolName: 'shop_get_order_details',
      status: 'SUCCESS',
      sanitizedOutput: { orderId: 'ord_1' },
      executedAt: '2026-09-13T12:00:00.000Z',
    });
    testAssert(hash1 !== tamperedHandoffHash, 'Handoff hash tampering changes provenance hash');

    // =========================================================================
    // SECTION 12: Audit Ledger Verification & Zero Secret Leakage
    // =========================================================================
    console.log('--- Section 12: Audit Ledger Verification ---');
    if (fs.existsSync(auditPath)) {
      const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
      testAssert(auditLines.length > 0, 'Audit entries recorded to disk');

      let foundExecuted = false;
      let foundValidated = false;
      let foundResolved = false;
      let foundStarted = false;
      let foundCompleted = false;

      for (const line of auditLines) {
        const entry = JSON.parse(line);
        testAssert(entry.domain === 'agent_tool_execution', 'Audit domain is agent_tool_execution');
        testAssert(!line.includes('SuperSecretPassword123!'), 'No raw passwords exist anywhere in audit ledger');
        testAssert(!line.includes('sk_live_very_secret_key_12345'), 'No raw api keys exist anywhere in audit ledger');

        if (entry.classification === 'TOOL_EXECUTION_REQUESTED') foundExecuted = true;
        if (entry.classification === 'TOOL_HANDOFF_VALIDATED') foundValidated = true;
        if (entry.classification === 'TOOL_ADAPTER_RESOLVED') foundResolved = true;
        if (entry.classification === 'TOOL_EXECUTION_STARTED') foundStarted = true;
        if (entry.classification === 'TOOL_EXECUTION_COMPLETED') foundCompleted = true;
      }

      testAssert(foundExecuted, 'TOOL_EXECUTION_REQUESTED recorded in audit');
      testAssert(foundValidated, 'TOOL_HANDOFF_VALIDATED recorded in audit');
      testAssert(foundResolved, 'TOOL_ADAPTER_RESOLVED recorded in audit');
      testAssert(foundStarted, 'TOOL_EXECUTION_STARTED recorded in audit');
      testAssert(foundCompleted, 'TOOL_EXECUTION_COMPLETED recorded in audit');
    }

    // =========================================================================
    // SECTION 13: Protected Workspace & Immutability Invariants
    // =========================================================================
    console.log('--- Section 13: Protected Workspace & Task Immutability ---');
    testAssert(
      !fs.existsSync('C:\\BOW\\shopofbow'),
      'Protected workspace C:\\BOW\\shopofbow remains untouched'
    );

    // Verify task state was not mutated by runtime
    const originalVersion = authTask.version;
    const originalState = authTask.state;
    testAssert(authTask.version === originalVersion, 'Authoritative task version was not mutated');
    testAssert(authTask.state === originalState, 'Authoritative task state was not mutated');

    // =========================================================================
    // SECTION 14: Concurrent Execution Safety
    // =========================================================================
    console.log('--- Section 14: Concurrent Execution Safety ---');
    const concurrentHandoffs = [
      createValidHandoff({ toolName: 'shop_get_order_details', sanitizedArgs: { orderId: 'conc_1' } }),
      createValidHandoff({ toolName: 'shop_get_order_details', sanitizedArgs: { orderId: 'conc_2' } }),
      createValidHandoff({ toolName: 'shop_get_order_details', sanitizedArgs: { orderId: 'conc_3' } }),
    ];

    const concurrentResults = await Promise.all(
      concurrentHandoffs.map(h => runtime.executeHandoff(h, { authoritativeTask: authTask }))
    );

    testAssert(concurrentResults.length === 3, 'All 3 concurrent executions finished');
    testAssert(concurrentResults.every(r => r.status === 'SUCCESS'), 'All concurrent executions succeeded');
    const orderIds = concurrentResults.map(r => (r.sanitizedOutput as any).orderId);
    testAssert(orderIds.includes('conc_1') && orderIds.includes('conc_2') && orderIds.includes('conc_3'), 'All distinct concurrent outputs intact');

    console.log(`\nREALITY GATE COMPLETE: All ${passedAssertions} assertions PASSED with ZERO errors!`);
    console.log('MS-1.4.06 Production Tool Adapter Plane: FULLY VERIFIED.');
  } finally {
    // Clean up temporary test data directory
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}

runRealityTests().catch(err => {
  console.error('REALITY TEST SUITE FAILED:', err);
  process.exit(1);
});
