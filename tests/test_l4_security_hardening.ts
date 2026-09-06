// tests/test_l4_security_hardening.ts
// BOWCON V4.0 — LEVEL 4.0 SECURITY HARDENING & RESILIENCE TEST SUITE
// Verifies compliance with ISO/IEC 42001, ISO/IEC 23894, and NIST AI RMF

import { WebhookVerifier } from '../src/security/webhookVerifier.js';
import { RequestGuard } from '../src/security/requestGuard.js';
import { ApprovalService } from '../src/core/approvalService.js';
import { IdempotencyStore } from '../src/core/idempotencyStore.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { ProviderHealthMonitor } from '../src/llm/providerHealth.js';
import { CircuitBreaker } from '../src/llm/resilience.js';
import { IsolatedRunner } from '../src/skills/isolatedRunner.js';

let passedTests = 0;
let totalTests = 0;
let failedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description}`);
  }
}

async function runSecurityHardeningSuite() {
  console.log('========================================================================');
  console.log('🛡️ RUNNING BOWCON V4.0 (L4 SECURITY HARDENING & RESILIENCE) SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: HARDENED WEBHOOK VERIFIER & ANTI-REPLAY DEFENSE
  // --------------------------------------------------------------------------
  console.log('🔒 SECTION 1: Webhook Verifier & Anti-Replay Defense');
  const testSecret = 'super-secure-shop-secret-key-for-testing';
  const verifier = new WebhookVerifier(testSecret, 300);

  const testPayload = JSON.stringify({ event: 'order.paid', orderId: 'ORD-L4-001', amount: 350000 });
  const headers = verifier.generateHeaders(testPayload, 'nonce_unique_123');

  // 1a. Valid webhook request
  const validRes = verifier.verify({
    rawBody: testPayload,
    signatureHeader: headers['x-bow-signature'],
    timestampHeader: headers['x-bow-timestamp'],
    nonceHeader: headers['x-bow-nonce'],
  });
  assert(validRes.valid === true, 'Valid webhook signature and timestamp accepted');

  // 1b. Replay attack rejection (reusing same nonce)
  const replayRes = verifier.verify({
    rawBody: testPayload,
    signatureHeader: headers['x-bow-signature'],
    timestampHeader: headers['x-bow-timestamp'],
    nonceHeader: headers['x-bow-nonce'],
  });
  assert(!replayRes.valid && replayRes.reason?.includes('REPLAY_ATTACK'), 'Replay attack strictly blocked on reused nonce');

  // 1c. Expired timestamp rejection
  const expiredTimestamp = Math.floor(Date.now() / 1000 - 400).toString(); // 400s old > 300s max
  const expiredRes = verifier.verify({
    rawBody: testPayload,
    signatureHeader: headers['x-bow-signature'],
    timestampHeader: expiredTimestamp,
    nonceHeader: 'nonce_new_456',
  });
  assert(!expiredRes.valid && expiredRes.reason?.includes('EXPIRED_TIMESTAMP'), 'Expired webhook request rejected');

  // 1d. Tampered body rejection
  const tamperedRes = verifier.verify({
    rawBody: testPayload + 'tampered_bytes',
    signatureHeader: headers['x-bow-signature'],
    timestampHeader: headers['x-bow-timestamp'],
    nonceHeader: 'nonce_tamper_789',
  });
  assert(!tamperedRes.valid && tamperedRes.reason?.includes('INVALID_SIGNATURE'), 'Tampered payload rejected by HMAC verification');

  // --------------------------------------------------------------------------
  // SECTION 2: REQUEST GUARD, RATE LIMITING & CORRELATION IDS
  // --------------------------------------------------------------------------
  console.log('\n⚡ SECTION 2: Request Guard, Rate Limiting & Correlation IDs');
  const guard = new RequestGuard({
    rateLimitWindowMs: 1000,
    maxRequestsPerWindow: 3,
    allowedOrigins: ['https://shopofbow.com', 'https://agent.example.com'],
    maxBodyBytes: 1024,
  });

  // Rate limiting
  const req1 = guard.checkRateLimit('ip_test_1');
  const req2 = guard.checkRateLimit('ip_test_1');
  const req3 = guard.checkRateLimit('ip_test_1');
  const req4 = guard.checkRateLimit('ip_test_1');
  assert(req1.allowed && req2.allowed && req3.allowed, 'Allowed within rate limit quota');
  assert(!req4.allowed, 'Rate limit triggered when quota exceeded');

  // Correlation ID
  const corr1 = guard.getOrCreateCorrelationId();
  assert(corr1.startsWith('req_'), 'Generated structured correlation ID');
  const corr2 = guard.getOrCreateCorrelationId('custom-client-id-1234');
  assert(corr2 === 'custom-client-id-1234', 'Preserved valid correlation ID from caller');

  // Allowed Origins
  assert(guard.isOriginAllowed('https://shopofbow.com'), 'Trusted origin permitted');
  assert(!guard.isOriginAllowed('https://malicious-attacker.com'), 'Untrusted origin rejected');

  // Timing safe compare
  assert(RequestGuard.timingSafeCompare('secure-token-123', 'secure-token-123'), 'TimingSafeCompare matches identical tokens');
  assert(!RequestGuard.timingSafeCompare('secure-token-123', 'secure-token-456'), 'TimingSafeCompare rejects mismatched tokens');

  // --------------------------------------------------------------------------
  // SECTION 3: APPROVAL SERVICE LIFECYCLE & REVOCATION
  // --------------------------------------------------------------------------
  console.log('\n🔑 SECTION 3: Approval Service Lifecycle & Revocation');
  const approvalService = new ApprovalService();

  const reqApproval = approvalService.requestApproval({
    actionName: 'refund_order',
    targetDomain: 'shop',
    arguments: { orderId: 'ORD-999', amount: 500000 },
    requestedBy: 'SubAgent-Shop',
    ttlSeconds: 60,
  });
  assert(reqApproval.status === 'PENDING', 'New approval has PENDING status');
  assert(Boolean(reqApproval.argumentsHash), 'Arguments SHA-256 hash generated');

  // Grant approval
  const grantRes = approvalService.grantApproval(reqApproval.id, 'Boss-Hoan');
  assert(grantRes.success === true && Boolean(grantRes.executionToken), 'Granted approval returns single-use token');

  // Revoke another approval
  const reqRevoke = approvalService.requestApproval({
    actionName: 'delete_data',
    targetDomain: 'system',
    arguments: { id: 1 },
    requestedBy: 'Agent',
  });
  const revoked = approvalService.revokeApproval(reqRevoke.id, 'Emergency override');
  assert(revoked === true, 'Approval successfully revoked');
  assert(approvalService.getApproval(reqRevoke.id)?.status === 'REVOKED', 'Status updated to REVOKED');

  // Validate and consume token
  const tokenVal = approvalService.validateAndConsumeToken(grantRes.executionToken!, 'refund_order', { orderId: 'ORD-999', amount: 500000 });
  assert(tokenVal.valid === true, 'Valid token consumed successfully');

  // Second consumption attempt rejected (One-time guarantee)
  const secondVal = approvalService.validateAndConsumeToken(grantRes.executionToken!, 'refund_order', { orderId: 'ORD-999', amount: 500000 });
  assert(!secondVal.valid && secondVal.reason?.includes('TOKEN_NOT_APPROVED'), 'One-Time Token rejected on replay attempt');

  // --------------------------------------------------------------------------
  // SECTION 4: IDEMPOTENCY KEY STORE
  // --------------------------------------------------------------------------
  console.log('\n⚡ SECTION 4: Idempotency Key Store');
  const idemStore = new IdempotencyStore(10_000);

  const testKey = 'idem_key_payment_1001';
  const payloadA = { amount: 100, currency: 'VND' };
  const payloadB = { amount: 200, currency: 'VND' };

  assert(!idemStore.check(testKey, payloadA).isDuplicate, 'Key initially not duplicate');
  idemStore.record(testKey, { status: 'PAID' }, payloadA);

  const checkSame = idemStore.check(testKey, payloadA);
  assert(checkSame.isDuplicate && checkSame.cachedResult?.status === 'PAID', 'Duplicate recognized with cached result');

  const checkTampered = idemStore.check(testKey, payloadB);
  assert(checkTampered.isDuplicate && checkTampered.reason?.includes('PAYLOAD_HASH_MISMATCH'), 'Payload parameter tampering detected on reused key');

  // --------------------------------------------------------------------------
  // SECTION 5: AUDIT LEDGER CRYPTOGRAPHIC CHAIN
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 5: Cryptographic Audit Ledger');
  const auditLedger = new AuditLedger();

  auditLedger.record({
    timestamp: new Date().toISOString(),
    actor: { userId: 'boss_hoan', role: 'owner', channel: 'ROBOT' },
    domain: 'shop',
    toolName: 'inspect_sales',
    classification: 'OBSERVE',
    argumentsHash: 'hash_1',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  auditLedger.record({
    timestamp: new Date().toISOString(),
    actor: { userId: 'bowcon', role: 'system', channel: 'DESKTOP' },
    domain: 'robot',
    toolName: 'robot_aim_head',
    classification: 'REVERSIBLE',
    argumentsHash: 'hash_2',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  assert(auditLedger.verifyChainIntegrity() === true, 'Audit log cryptographic chain verified intact');
  assert(auditLedger.count() === 2, 'Audit log recorded exactly 2 events');

  // --------------------------------------------------------------------------
  // SECTION 6: PROVIDER HEALTH PROBER & RESILIENCE
  // --------------------------------------------------------------------------
  console.log('\n🧠 SECTION 6: Provider Health Prober & Circuit Breaker');
  const healthMonitor = new ProviderHealthMonitor();

  healthMonitor.recordSuccess('cloud_gemini', 150);
  assert(healthMonitor.getStatus('cloud_gemini').status === 'healthy', 'Provider marked healthy on fast success');

  healthMonitor.recordFailure('cloud_gemini', '503 Overloaded');
  assert(healthMonitor.getStatus('cloud_gemini').status === 'degraded', 'Provider marked degraded on initial failure');

  healthMonitor.recordFailure('cloud_gemini', '503 Overloaded');
  healthMonitor.recordFailure('cloud_gemini', '503 Overloaded');
  assert(healthMonitor.getStatus('cloud_gemini').status === 'unavailable', 'Provider marked unavailable after 3 consecutive failures');

  // Circuit Breaker
  const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 100 });
  assert(breaker.getState() === 'CLOSED', 'Circuit breaker starts in CLOSED state');
  breaker.recordFailure();
  breaker.recordFailure();
  assert(breaker.getState() === 'OPEN', 'Circuit breaker trips to OPEN after threshold failures');
  assert(!breaker.canExecute(), 'Execution blocked when circuit breaker is OPEN');

  // --------------------------------------------------------------------------
  // SECTION 7: ISOLATED RUNNER & ARTIFACT SIGNING
  // --------------------------------------------------------------------------
  console.log('\n📦 SECTION 7: Isolated Sandbox Runner & Artifact Signing');
  const runner = new IsolatedRunner({ timeoutMs: 500 });

  // 7a. Valid math computation in isolated context
  const safeMathCode = `
    const a = inputs.args.valA || 10;
    const b = inputs.args.valB || 20;
    return { sum: a + b, product: a * b };
  `;
  const safeMathResult = await runner.executeInSandbox(safeMathCode, { valA: 15, valB: 3 });
  assert(safeMathResult.success === true, 'Isolated runner executed safe math');
  assert(safeMathResult.result?.sum === 18 && safeMathResult.result?.product === 45, 'Calculation result verified accurate');

  // 7b. Security violation: Attempt to access process.env
  const maliciousCode = `
    return process.env.GEMINI_API_KEY;
  `;
  const maliciousResult = await runner.executeInSandbox(maliciousCode);
  assert(!maliciousResult.success && maliciousResult.error?.includes('SECURITY_VIOLATION'), 'Forbidden token process.env rejected by security scanner');

  // 7c. Timeout guard: Infinite loop containment
  const infiniteLoopCode = `
    while (true) {}
  `;
  const timeoutResult = await runner.executeInSandbox(infiniteLoopCode);
  assert(!timeoutResult.success && timeoutResult.error?.includes('TIMEOUT'), 'Infinite loop safely contained and aborted by hard timeout');

  // 7d. Skill artifact signing and verification
  const signingSecret = 'vault-skill-signing-secret';
  const skillCode = 'return inputs.args.x * 2;';
  const sig = runner.signSkillArtifact('skill_test_mult', skillCode, signingSecret);
  assert(runner.verifySkillArtifact('skill_test_mult', skillCode, sig, signingSecret) === true, 'Skill artifact signature verified valid');
  assert(!runner.verifySkillArtifact('skill_test_mult', skillCode + 'tamper', sig, signingSecret), 'Tampered skill artifact signature rejected');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 HARDENING SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL L4 SECURITY HARDENING & RESILIENCE TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityHardeningSuite().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});

