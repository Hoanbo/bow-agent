// tests/test_l4_unified_governance_integration.ts
// BOWCON V4.0 — UNIFIED LEVEL 4.0 GOVERNANCE & PERIMETER INTEGRATION SUITE
// Verifies compliance with CODEX findings F-001, F-003, F-004, F-005, F-008

import crypto from 'node:crypto';
import {
  CONFIG,
  globalPDP,
  globalApprovalService,
  globalIdempotencyStore,
  globalAuditLedger,
  globalCircuitBreaker,
  globalProviderHealth,
  globalRequestGuard,
  RequestGuard,
  WebhookVerifier,
  toolRegistry,
  hybridLlmRouter,
} from '../src/index.js';
import { BowCentralAgentServer } from '../src/server.js';

let passedTests = 0;
let totalTests = 0;
let failedTests = 0;

function assert(condition: boolean, description: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runUnifiedGovernanceIntegrationSuite() {
  console.log('========================================================================');
  console.log('👑 RUNNING BOWCON V4.0 (UNIFIED LEVEL 4.0 GOVERNANCE INTEGRATION) SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: DIRECT TOOL REGISTRY PDP GOVERNANCE ENFORCEMENT (F-001 & F-004)
  // --------------------------------------------------------------------------
  console.log('🛡️ SECTION 1: Authoritative ToolRegistry PDP & Governance Boundary (F-001)');

  // Register a mock test tool
  let sideEffectExecuted = false;
  toolRegistry.register({
    name: 'test_transfer_payout',
    description: 'Mock high impact payout tool for testing',
    parameters: {
      type: 'object',
      properties: { recipient: { type: 'string' }, amount: { type: 'number' } },
      required: ['recipient', 'amount'],
    },
    execute: async (args: any) => {
      sideEffectExecuted = true;
      return { status: 'PAID', recipient: args.recipient, amount: args.amount };
    },
  });
  globalPDP.registerActionPolicy('test_transfer_payout', 'HIGH_IMPACT');

  // 1a. Forbidden action is strictly blocked by registry
  toolRegistry.register({
    name: 'test_delete_all_records',
    description: 'Forbidden test action',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({ deleted: true }),
  });
  globalPDP.registerActionPolicy('test_delete_all_records', 'FORBIDDEN');

  let forbiddenBlocked = false;
  try {
    await toolRegistry.executeTool('test_delete_all_records', {}, { role: 'owner' });
  } catch (err: any) {
    forbiddenBlocked = err.message.includes('FORBIDDEN');
  }
  assert(forbiddenBlocked, 'Direct toolRegistry execution of FORBIDDEN action strictly blocked');

  // 1b. High impact action without approval token as autonomous agent is blocked
  let highImpactBlocked = false;
  try {
    await toolRegistry.executeTool(
      'test_transfer_payout',
      { recipient: 'supplier_01', amount: 5000000 },
      { role: 'agent', channel: 'BACKGROUND', isOwner: false }
    );
  } catch (err: any) {
    highImpactBlocked = err.message.includes('HIGH_IMPACT_APPROVAL_REQUIRED');
  }
  assert(highImpactBlocked, 'Direct toolRegistry execution of HIGH_IMPACT action without token is blocked');

  // 1c. Request approval, grant token, and execute through ToolRegistry
  sideEffectExecuted = false;
  const apprReq = globalApprovalService.requestApproval({
    actionName: 'test_transfer_payout',
    targetDomain: 'shop',
    arguments: { recipient: 'supplier_01', amount: 5000000 },
    requestedBy: 'subagent_finance',
    ttlSeconds: 120,
  });
  const grant = globalApprovalService.grantApproval(apprReq.id, 'Boss-Hoan');
  assert(grant.success && Boolean(grant.executionToken), 'Approval granted with one-time execution token');

  const testKey1 = 'idem_payout_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const testKey2 = 'idem_payout_replay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

  const execResult = await toolRegistry.executeTool(
    'test_transfer_payout',
    { recipient: 'supplier_01', amount: 5000000 },
    {
      role: 'agent',
      channel: 'BACKGROUND',
      isOwner: false,
      executionToken: grant.executionToken,
      idempotencyKey: testKey1,
    }
  );
  assert(sideEffectExecuted === true && execResult.status === 'PAID', 'ToolRegistry executed tool with valid approval token');

  // 1d. Token replay attempt through ToolRegistry must fail
  let tokenReplayBlocked = false;
  try {
    await toolRegistry.executeTool(
      'test_transfer_payout',
      { recipient: 'supplier_01', amount: 5000000 },
      {
        role: 'agent',
        channel: 'BACKGROUND',
        isOwner: false,
        executionToken: grant.executionToken,
        idempotencyKey: testKey2, // distinct key to test token replay specifically
      }
    );
  } catch (err: any) {
    tokenReplayBlocked = err.message.includes('TOKEN_NOT_APPROVED') || err.message.includes('INVALID_APPROVAL_TOKEN');
  }
  assert(tokenReplayBlocked, 'Consumed execution token strictly rejected on replay attempt');

  // 1e. Idempotency duplicate execution check
  sideEffectExecuted = false; // Reset flag
  const cachedExec = await toolRegistry.executeTool(
    'test_transfer_payout',
    { recipient: 'supplier_01', amount: 5000000 },
    {
      role: 'owner',
      channel: 'ROBOT',
      idempotencyKey: testKey1, // Reused key with exact same args
    }
  );
  assert(sideEffectExecuted === false, 'Zero duplicate side-effect executed on idempotent replay');
  assert(cachedExec.status === 'PAID', 'Cached result returned for idempotent call');

  // 1f. Idempotency conflict on tampered args
  let conflictDetected = false;
  try {
    await toolRegistry.executeTool(
      'test_transfer_payout',
      { recipient: 'attacker_wallet', amount: 99999999 }, // Tampered args!
      {
        role: 'owner',
        channel: 'ROBOT',
        idempotencyKey: testKey1,
      }
    );
  } catch (err: any) {
    conflictDetected = err.message.includes('IDEMPOTENCY_CONFLICT');
  }
  assert(conflictDetected, 'IDEMPOTENCY_CONFLICT thrown when key is reused with altered parameters');

  // 1g. Domain kill switch stops ToolRegistry execution
  globalPDP.setDomainKillSwitch('shop', true);
  let domainHalted = false;
  try {
    await toolRegistry.executeTool(
      'test_transfer_payout',
      { recipient: 'supplier_01', amount: 1000 },
      { role: 'owner', channel: 'ROBOT' }
    );
  } catch (err: any) {
    domainHalted = err.message.includes('EMERGENCY_STOP_ACTIVE');
  }
  assert(domainHalted, 'Domain kill switch immediately halts ToolRegistry execution');
  globalPDP.setDomainKillSwitch('shop', false); // Restore

  // 1h. Audit ledger verified
  const integrity = globalAuditLedger.verifyChainIntegrity();
  assert(integrity === true, 'Audit ledger cryptographic chain integrity verified');

  // --------------------------------------------------------------------------
  // SECTION 2: SERVER PERIMETER & WEBHOOKS (F-003 & F-008)
  // --------------------------------------------------------------------------
  console.log('\n🌐 SECTION 2: Server Perimeter & Hardened Webhook Ingestion (F-003)');

  const testPort = 4077;
  const server = new BowCentralAgentServer({ port: testPort, host: '127.0.0.1' });
  await server.start();

  try {
    // 2a. Correlation ID Generation and Propagation
    const resWithoutCorr = await fetch(`http://127.0.0.1:${testPort}/health`);
    const genCorr = resWithoutCorr.headers.get('x-correlation-id');
    assert(Boolean(genCorr) && genCorr!.startsWith('req_'), 'Server generated X-Correlation-ID header');

    const customCorr = 'client-trace-id-998877';
    const resWithCorr = await fetch(`http://127.0.0.1:${testPort}/health`, {
      headers: { 'x-correlation-id': customCorr },
    });
    assert(resWithCorr.headers.get('x-correlation-id') === customCorr, 'Server preserved incoming X-Correlation-ID');

    // 2b. Rate Limiter Headers
    const remaining = resWithCorr.headers.get('x-ratelimit-remaining');
    assert(remaining !== null, 'Server returned X-RateLimit-Remaining header');

    // 2c. Webhook Verifier with Valid HMAC and Nonce
    const webhookSecret = CONFIG.shopWebhookSecret || 'bow_webhook_secret_default';
    const verifier = new WebhookVerifier(webhookSecret);
    const webhookPayload = JSON.stringify({ event: 'order.completed', orderId: 'BOW-1100', total: 750000 });
    const nonce1 = 'nonce_wh_test_1';
    const headers1 = verifier.generateHeaders(webhookPayload, nonce1);

    const validWhRes = await fetch(`http://127.0.0.1:${testPort}/api/events/shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers1,
      },
      body: webhookPayload,
    });
    assert(validWhRes.status === 200, 'Hardened webhook accepted with valid HMAC and nonce');

    // 2d. Replayed Nonce Webhook rejected
    const replayWhRes = await fetch(`http://127.0.0.1:${testPort}/api/events/shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers1, // same nonce
      },
      body: webhookPayload,
    });
    assert(replayWhRes.status === 401, 'Replayed webhook nonce strictly rejected with 401');

    // 2e. Tampered payload rejected
    const tamperedPayload = JSON.stringify({ event: 'order.completed', orderId: 'BOW-1100', total: 10000000 });
    const tamperedWhRes = await fetch(`http://127.0.0.1:${testPort}/api/events/shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bow-signature': headers1['x-bow-signature'],
        'x-bow-timestamp': headers1['x-bow-timestamp'],
        'x-bow-nonce': 'nonce_wh_test_fresh',
      },
      body: tamperedPayload,
    });
    assert(tamperedWhRes.status === 401, 'Tampered webhook payload strictly rejected with 401');

    // --------------------------------------------------------------------------
    // SECTION 3: VERSIONED GOVERNANCE REST APIS (F-008)
    // --------------------------------------------------------------------------
    console.log('\n🏛️ SECTION 3: Versioned Governance REST APIs (F-008)');

    const authHeader = { Authorization: `Bearer ${CONFIG.desktopAuthToken}` };

    // 3a. Unauthenticated access rejected
    const unauthRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/approvals`);
    assert(unauthRes.status === 401, 'Unauthenticated access to /api/v1/governance/approvals rejected (401)');

    // 3b. POST /api/v1/governance/approvals/request
    const createReqRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/approvals/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        actionName: 'refund_customer',
        targetDomain: 'shop',
        arguments: { orderId: 'ORD-777', amount: 350000 },
        requestedBy: 'support_agent',
      }),
    });
    assert(createReqRes.status === 200, 'POST /api/v1/governance/approvals/request succeeds (200)');
    const createJson = await createReqRes.json();
    assert(Boolean(createJson.approval?.id), 'Approval record returned with unique ID');

    // 3c. POST /api/v1/governance/approvals/:id/grant
    const grantApiRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/approvals/${createJson.approval.id}/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ approver: 'Boss-Hoan' }),
    });
    assert(grantApiRes.status === 200, 'POST /api/v1/governance/approvals/:id/grant succeeds');
    const grantApiJson = await grantApiRes.json();
    assert(Boolean(grantApiJson.executionToken), 'Granted approval API returned execution token');

    // 3d. POST /api/v1/governance/approvals/:id/revoke
    const revokeReqRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/approvals/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        actionName: 'purge_cache',
        targetDomain: 'system',
        arguments: {},
        requestedBy: 'admin',
      }),
    });
    const revokeJson = await revokeReqRes.json();
    const revokeApiRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/approvals/${revokeJson.approval.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ reason: 'Audit cancellation' }),
    });
    assert(revokeApiRes.status === 200, 'POST /api/v1/governance/approvals/:id/revoke succeeds');

    // 3e. GET /api/v1/governance/audit
    const auditApiRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/audit`, {
      headers: authHeader,
    });
    assert(auditApiRes.status === 200, 'GET /api/v1/governance/audit returns status 200');
    const auditApiJson = await auditApiRes.json();
    assert(auditApiJson.integrityVerified === true, 'Audit API confirms cryptographic chain integrity');
    assert(Array.isArray(auditApiJson.auditTrail), 'Audit API returns audit trail array');

    // 3f. GET & POST /api/v1/governance/kill-switch
    const getKsRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/kill-switch`);
    assert(getKsRes.status === 200, 'GET /api/v1/governance/kill-switch returns 200');

    const postKsRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ domain: 'robot', active: true }),
    });
    const postKsJson = await postKsRes.json();
    assert(postKsJson.killSwitches.domains.robot === true, 'POST /api/v1/governance/kill-switch engaged robot domain switch');

    // Reset switch
    await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ domain: 'robot', active: false }),
    });

    // 3g. GET /api/v1/governance/slo
    const sloRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/governance/slo`);
    assert(sloRes.status === 200, 'GET /api/v1/governance/slo returns status 200');
    const sloJson = await sloRes.json();
    assert(sloJson.slo.availabilityTarget === 0.999, 'SLO contract specifies 99.9% availability target');
    assert(sloJson.slo.safetyZeroTolerance === true, 'SLO contract specifies zero-tolerance safety');

    // --------------------------------------------------------------------------
    // SECTION 4: HYBRID ROUTER CIRCUIT BREAKER & HEALTH (F-005)
    // --------------------------------------------------------------------------
    console.log('\n🧠 SECTION 4: Hybrid Router Circuit Breaker & Health Prober (F-005)');

    const initialHealth = hybridLlmRouter.getHealthStatus();
    assert(Boolean(initialHealth.status), 'Hybrid router returns overall status');
    assert(Boolean(initialHealth.circuitBreakerState), 'Hybrid router exposes circuit breaker state');

    // Trip circuit breaker manually to test failover
    globalCircuitBreaker.recordFailure();
    globalCircuitBreaker.recordFailure();
    globalCircuitBreaker.recordFailure();
    assert(globalCircuitBreaker.getState() === 'OPEN', 'Circuit breaker tripped to OPEN after 3 failures');

    const trippedHealth = hybridLlmRouter.getHealthStatus();
    assert(trippedHealth.cloudAvailable === false, 'Cloud Gemini correctly marked unavailable when breaker is OPEN');

    // Test routing during breaker trip -> automatically uses local without hanging
    const routeRes = await hybridLlmRouter.routeMessage('Hello BOWCON, system test');
    assert(routeRes.activeBackend === 'local_slm_rx580', 'Hybrid router automatically routed to local backend when breaker tripped');

    // Reset circuit breaker
    globalCircuitBreaker.reset();
    assert(globalCircuitBreaker.getState() === 'CLOSED', 'Circuit breaker reset back to CLOSED');

  } finally {
    await server.stop();
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 INTEGRATION SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL UNIFIED LEVEL 4.0 GOVERNANCE INTEGRATION TESTS PASSED (100%)!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runUnifiedGovernanceIntegrationSuite().catch((err) => {
  console.error('Fatal error in integration suite:', err);
  process.exit(1);
});
