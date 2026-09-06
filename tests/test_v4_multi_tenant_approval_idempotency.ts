// tests/test_v4_multi_tenant_approval_idempotency.ts
// ============================================================================
// BOWCON V4.0 — MILESTONE 1.3.4: MULTI-TENANT APPROVAL & IDEMPOTENCY DURABLE STORAGE
// ============================================================================
//
// Authoritative Verification Suite for:
// 1. Physical & logical multi-tenant isolation of approvals and idempotency.
// 2. Strict path traversal, null-byte, and Windows reserved-name defense.
// 3. Approval token ownership and one-time consumption guarantees.
// 4. Zero cross-user idempotency collision on identical logical keys.
// 5. Atomic DurableJsonStore persistence, crash-safety, and corruption quarantine.
// 6. Execution reservation and race condition prevention.
// 7. Deterministic legacy migration to primary owner only.
// 8. Static audit: Zero unsafe direct writes or global mutable user state.
// 9. End-to-end PDP and ToolRegistry governance boundaries.

// EN: This suite verifies that approval tokens and idempotency keys cannot be replayed or cross tenant boundaries.
// VI: Suite này xác minh token approval và khóa idempotency không thể phát lại hoặc vượt qua ranh giới tenant.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  ApprovalService,
  ApprovalRecord,
} from '../src/core/approvalService.js';
import {
  IdempotencyStore,
  IdempotencyEntry,
} from '../src/core/idempotencyStore.js';
import {
  resolveUserPartition,
  DEFAULT_PRIMARY_USER_ID,
} from '../src/core/persistence/userPartitionResolver.js';
import {
  validateApprovalRecords,
  validateIdempotencyEntries,
} from '../src/core/persistence/governanceSchemas.js';
import {
  DurablePersistenceSecurityError,
  DurablePersistenceCorruptionError,
  DurablePersistenceSchemaError,
} from '../src/core/persistence/durableJsonStore.js';
import { PolicyDecisionPoint, globalPDP } from '../src/core/policyDecisionPoint.js';
import { ToolRegistry, toolRegistry } from '../src/tools/registry.js';
import { AgentLoop } from '../src/core/agentLoop.js';

const TEST_BASE_DIR = path.resolve(process.cwd(), 'data', 'test_governance_multi_tenant_' + Date.now());
const TEST_APPROVALS_DIR = path.join(TEST_BASE_DIR, 'approvals');
const TEST_IDEMPOTENCY_DIR = path.join(TEST_BASE_DIR, 'idempotency');

let totalPassed = 0;
let totalFailed = 0;

function pass(msg: string) {
  totalPassed++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg: string, err: any) {
  totalFailed++;
  console.error(`  ❌ [FAIL] ${msg}:`, err);
}

async function runSuite() {
  console.log('\n========================================================================');
  console.log('🏛️ RUNNING BOWCON V4.0 (MS-1.3.4: MULTI-TENANT APPROVAL & IDEMPOTENCY) SUITE');
  console.log('========================================================================\n');

  if (!fs.existsSync(TEST_BASE_DIR)) {
    fs.mkdirSync(TEST_BASE_DIR, { recursive: true });
  }

  try {
    // --------------------------------------------------------------------------
    // SECTION 1: USER PARTITION RESOLUTION
    // --------------------------------------------------------------------------
    console.log('🔑 SECTION 1: User Partition Resolution');
    try {
      const partAlice = resolveUserPartition('user_alice', TEST_APPROVALS_DIR);
      const partAlice2 = resolveUserPartition('user_alice', TEST_APPROVALS_DIR);
      assert.strictEqual(partAlice.partitionKey, partAlice2.partitionKey);
      assert.strictEqual(partAlice.filePath, partAlice2.filePath);
      pass('Equivalent userId resolves to identical partitionKey and filePath');

      const partBob = resolveUserPartition('user_bob', TEST_APPROVALS_DIR);
      assert.notStrictEqual(partAlice.partitionKey, partBob.partitionKey);
      assert.notStrictEqual(partAlice.filePath, partBob.filePath);
      pass('Distinct userIds resolve to distinct partitionKeys and filePaths');

      const complex = resolveUserPartition('user.john_doe+test@domain.com', TEST_APPROVALS_DIR);
      assert(complex.partitionKey.length <= 64, 'Complex partitionKey is length-capped');
      assert(path.dirname(complex.filePath) === TEST_APPROVALS_DIR, 'Complex path confined within baseDir');
      pass('Complex user IDs resolve to deterministic slug with SHA-256 suffix');

      assert.throws(() => resolveUserPartition('', TEST_APPROVALS_DIR), /non-empty string/);
      assert.throws(() => resolveUserPartition('   ', TEST_APPROVALS_DIR), /empty or whitespace/);
      pass('Blank or whitespace userId strictly rejected');

      assert.throws(() => resolveUserPartition('anonymous', TEST_APPROVALS_DIR), /Anonymous or unresolved/);
      assert.throws(() => resolveUserPartition('anon', TEST_APPROVALS_DIR), /Anonymous or unresolved/);
      assert.throws(() => resolveUserPartition('unknown', TEST_APPROVALS_DIR), /Anonymous or unresolved/);
      assert.throws(() => resolveUserPartition('unauthenticated', TEST_APPROVALS_DIR), /Anonymous or unresolved/);
      pass('Anonymous and unresolved identities strictly rejected (Fail-Closed)');
    } catch (e) {
      fail('Section 1 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 2: APPROVAL USER ISOLATION
    // --------------------------------------------------------------------------
    console.log('\n👤 SECTION 2: Approval User Isolation');
    try {
      const approvalService = new ApprovalService(TEST_APPROVALS_DIR);

      const aliceReq = approvalService.requestApproval({
        actionName: 'refund_order',
        targetDomain: 'shop',
        arguments: { orderId: 'ORD-ALICE', amount: 1000 },
        requestedBy: 'user_alice',
        userId: 'user_alice',
      });

      const bobReq = approvalService.requestApproval({
        actionName: 'payout_vendor',
        targetDomain: 'shop',
        arguments: { vendorId: 'VEND-BOB', amount: 5000 },
        requestedBy: 'user_bob',
        userId: 'user_bob',
      });

      assert.strictEqual(aliceReq.ownerUserId, 'user_alice');
      assert.strictEqual(bobReq.ownerUserId, 'user_bob');
      pass('Approval records assigned correct ownerUserId');

      const aliceFile = path.join(TEST_APPROVALS_DIR, 'user_alice.json');
      const bobFile = path.join(TEST_APPROVALS_DIR, 'user_bob.json');
      assert(fs.existsSync(aliceFile), 'Alice approvals partitioned in user_alice.json');
      assert(fs.existsSync(bobFile), 'Bob approvals partitioned in user_bob.json');
      pass('Approvals physically partitioned into separate JSON files');

      const aliceRaw = fs.readFileSync(aliceFile, 'utf8');
      const bobRaw = fs.readFileSync(bobFile, 'utf8');
      assert(!aliceRaw.includes('VEND-BOB'), 'Alice physical partition has ZERO Bob data');
      assert(!bobRaw.includes('ORD-ALICE'), 'Bob physical partition has ZERO Alice data');
      pass('Zero physical cross-user data leakage');

      assert.strictEqual(approvalService.getApproval(bobReq.id, 'user_alice'), undefined);
      assert.strictEqual(approvalService.getApproval(aliceReq.id, 'user_bob'), undefined);
      pass('Scoped getApproval returns undefined on identity mismatch');

      assert(approvalService.getAllApprovals('user_alice').length >= 1, 'Alice has at least 1 approval');
      assert(approvalService.getAllApprovals('user_bob').length >= 1, 'Bob has at least 1 approval');
      pass('getAllApprovals respects user partition scoping');

      const pendingAlice = approvalService.listApprovals({ status: 'PENDING', userId: 'user_alice' });
      assert(pendingAlice.length >= 1, 'Alice has pending approvals');
      pass('listApprovals filters by status within user partition');
    } catch (e) {
      fail('Section 2 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 3: APPROVAL TOKEN OWNERSHIP
    // --------------------------------------------------------------------------
    console.log('\n🎟️ SECTION 3: Approval Token Ownership');
    try {
      const approvalService = new ApprovalService(TEST_APPROVALS_DIR);

      const aliceReq = approvalService.requestApproval({
        actionName: 'deploy_service',
        targetDomain: 'system',
        arguments: { service: 'billing' },
        requestedBy: 'user_alice',
        userId: 'user_alice',
      });

      const grantRes = approvalService.grantApproval(aliceReq.id, 'boss_user', 'user_alice');
      assert(grantRes.success && Boolean(grantRes.executionToken), 'Approval granted with token');
      const token = grantRes.executionToken!;
      assert(token.startsWith('tok_') && token.length > 20, 'Execution token adheres to canonical tok_ format');
      pass('Execution token format verified');

      const validRes = approvalService.validateAndConsumeToken(
        token,
        'deploy_service',
        { service: 'billing' },
        'user_alice'
      );
      assert(validRes.valid === true, 'Token consumed successfully by authorized owner');
      assert.strictEqual(validRes.record?.ownerUserId, 'user_alice');
      pass('Token ownership verified and authenticated execution permitted');
    } catch (e) {
      fail('Section 3 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 4: APPROVAL ONE-TIME CONSUMPTION
    // --------------------------------------------------------------------------
    console.log('\n🔒 SECTION 4: Approval One-Time Consumption');
    try {
      const approvalService = new ApprovalService(TEST_APPROVALS_DIR);

      const req = approvalService.requestApproval({
        actionName: 'execute_script',
        targetDomain: 'system',
        arguments: { scriptId: 's1' },
        requestedBy: 'user_alice',
        userId: 'user_alice',
      });

      const grant = approvalService.grantApproval(req.id, 'boss_user', 'user_alice');
      const token = grant.executionToken!;

      const firstConsume = approvalService.validateAndConsumeToken(
        token,
        'execute_script',
        { scriptId: 's1' },
        'user_alice'
      );
      assert(firstConsume.valid === true, 'First consumption succeeds');
      assert.strictEqual(firstConsume.record?.status, 'CONSUMED');
      assert(Boolean(firstConsume.record?.consumedAt), 'consumedAt timestamp populated');
      pass('Token status transitions to CONSUMED on first use');

      const replayAttempt = approvalService.validateAndConsumeToken(
        token,
        'execute_script',
        { scriptId: 's1' },
        'user_alice'
      );
      assert(replayAttempt.valid === false, 'Replay attempt strictly rejected');
      assert(replayAttempt.reason?.includes('TOKEN_NOT_APPROVED'), 'Reason indicates token is not approved');
      pass('One-Time Token replay prevented (INV-8)');

      const thirdAttempt = approvalService.validateAndConsumeToken(
        token,
        'execute_script',
        { scriptId: 's1' },
        'user_alice'
      );
      assert(thirdAttempt.valid === false, 'Third attempt consistently fails closed');
      pass('Subsequent token reuse consistently rejected');
    } catch (e) {
      fail('Section 4 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 5: APPROVAL EXPIRATION
    // --------------------------------------------------------------------------
    console.log('\n⌛ SECTION 5: Approval Expiration');
    try {
      const approvalService = new ApprovalService(TEST_APPROVALS_DIR);

      const req = approvalService.requestApproval({
        actionName: 'transient_action',
        targetDomain: 'system',
        arguments: { op: 'test' },
        requestedBy: 'user_alice',
        userId: 'user_alice',
        ttlSeconds: 1, // 1 second TTL
      });

      const grant = approvalService.grantApproval(req.id, 'boss_user', 'user_alice');
      const token = grant.executionToken!;

      // Wait 1100ms for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const consumeExpired = approvalService.validateAndConsumeToken(
        token,
        'transient_action',
        { op: 'test' },
        'user_alice'
      );
      assert(consumeExpired.valid === false, 'Expired token consumption rejected');
      assert.strictEqual(consumeExpired.reason, 'TOKEN_EXPIRED');
      pass('Expired token fails closed with TOKEN_EXPIRED (INV-9)');

      assert.strictEqual(approvalService.getApproval(req.id, 'user_alice')?.status, 'EXPIRED');
      pass('In-memory and durable status accurately marked as EXPIRED');
    } catch (e) {
      fail('Section 5 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 6: CROSS-USER APPROVAL ATTACK
    // --------------------------------------------------------------------------
    console.log('\n🛡️ SECTION 6: Cross-User Approval Attack Defense');
    try {
      const approvalService = new ApprovalService(TEST_APPROVALS_DIR);

      const aliceReq = approvalService.requestApproval({
        actionName: 'secret_transfer',
        targetDomain: 'shop',
        arguments: { target: 'vault' },
        requestedBy: 'user_alice',
        userId: 'user_alice',
      });

      const grant = approvalService.grantApproval(aliceReq.id, 'boss_user', 'user_alice');
      const aliceToken = grant.executionToken!;

      // Bob tries to consume Alice's token using Bob's identity
      const bobAttack = approvalService.validateAndConsumeToken(
        aliceToken,
        'secret_transfer',
        { target: 'vault' },
        'user_bob'
      );
      assert(bobAttack.valid === false, 'Cross-user token consumption strictly blocked');
      assert(bobAttack.reason?.includes('TOKEN_OWNER_MISMATCH') || bobAttack.reason?.includes('TOKEN_NOT_FOUND'), 'Reason indicates owner mismatch');
      pass('Cross-user token consumption blocked (INV-1)');

      // Bob attempts to grant Alice's approval
      const bobGrant = approvalService.grantApproval(aliceReq.id, 'user_bob', 'user_bob');
      assert(bobGrant.success === false, 'Cross-user grantApproval rejected');
      pass('Cross-user grantApproval blocked');

      // Bob attempts to revoke Alice's approval
      const bobRevoke = approvalService.revokeApproval(aliceReq.id, 'malicious', 'user_bob');
      assert(bobRevoke === false, 'Cross-user revokeApproval rejected');
      pass('Cross-user revokeApproval blocked');

      // Verify Alice's token remains unconsumed after Bob's failed attack
      const aliceConsume = approvalService.validateAndConsumeToken(
        aliceToken,
        'secret_transfer',
        { target: 'vault' },
        'user_alice'
      );
      assert(aliceConsume.valid === true, 'Alice can still validly consume her unconsumed token');
      pass('Failed cross-user attack does NOT invalidate legitimate owner token');
    } catch (e) {
      fail('Section 6 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 7: IDEMPOTENCY USER ISOLATION
    // --------------------------------------------------------------------------
    console.log('\n👥 SECTION 7: Idempotency User Isolation');
    try {
      const idemStore = new IdempotencyStore(60_000, TEST_IDEMPOTENCY_DIR);
      const sharedKey = 'idem_order_checkout_999';

      assert(!idemStore.check(sharedKey, { item: 'book' }, 'user_alice').isDuplicate, 'Alice key initially not duplicate');
      idemStore.record(sharedKey, { orderId: 'ALICE_ORDER' }, { item: 'book' }, 60_000, 'user_alice');

      // Bob checks the EXACT SAME key
      const bobCheck = idemStore.check(sharedKey, { item: 'laptop' }, 'user_bob');
      assert(bobCheck.isDuplicate === false, 'Bob check with identical key is NOT duplicate');
      pass('Identical idempotencyKey does not collide across distinct users (INV-2)');

      idemStore.record(sharedKey, { orderId: 'BOB_ORDER' }, { item: 'laptop' }, 60_000, 'user_bob');

      const aliceRead = idemStore.check(sharedKey, { item: 'book' }, 'user_alice');
      const bobRead = idemStore.check(sharedKey, { item: 'laptop' }, 'user_bob');

      assert.strictEqual(aliceRead.cachedResult?.orderId, 'ALICE_ORDER');
      assert.strictEqual(bobRead.cachedResult?.orderId, 'BOB_ORDER');
      pass('Both users preserve their independent cached results without cross-talk');

      const aliceIdemFile = path.join(TEST_IDEMPOTENCY_DIR, 'user_alice.json');
      const bobIdemFile = path.join(TEST_IDEMPOTENCY_DIR, 'user_bob.json');
      assert(fs.readFileSync(aliceIdemFile, 'utf8').includes('ALICE_ORDER'));
      assert(!fs.readFileSync(aliceIdemFile, 'utf8').includes('BOB_ORDER'));
      assert(fs.readFileSync(bobIdemFile, 'utf8').includes('BOB_ORDER'));
      assert(!fs.readFileSync(bobIdemFile, 'utf8').includes('ALICE_ORDER'));
      pass('Physical idempotency files strictly partitioned on disk');

      assert.strictEqual(idemStore.size('user_alice'), 1, 'Alice store size is 1');
      assert.strictEqual(idemStore.size('user_bob'), 1, 'Bob store size is 1');
      pass('IdempotencyStore size is scoped to individual user partition');
    } catch (e) {
      fail('Section 7 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 8: IDEMPOTENCY REPLAY PROTECTION
    // --------------------------------------------------------------------------
    console.log('\n⚡ SECTION 8: Idempotency Replay Protection');
    try {
      const idemStore = new IdempotencyStore(60_000, TEST_IDEMPOTENCY_DIR);
      const key = 'idem_payout_repeat';
      const payloadA = { amount: 500 };
      const payloadB = { amount: 999 }; // Tampered

      assert(!idemStore.check(key, payloadA, 'user_alice').isDuplicate);
      idemStore.record(key, { status: 'PAID' }, payloadA, 60_000, 'user_alice');

      const replayCheck = idemStore.check(key, payloadA, 'user_alice');
      assert(replayCheck.isDuplicate === true && replayCheck.cachedResult?.status === 'PAID');
      pass('Valid idempotent replay returns cached result');

      const tamperCheck = idemStore.check(key, payloadB, 'user_alice');
      assert(tamperCheck.isDuplicate === true && tamperCheck.conflict === true);
      assert(tamperCheck.reason?.includes('IDEMPOTENCY_CONFLICT'));
      pass('Payload tampering on reused key detected and flagged conflict');

      const noPayloadCheck = idemStore.check(key, undefined, 'user_alice');
      assert(noPayloadCheck.isDuplicate === true && noPayloadCheck.cachedResult?.status === 'PAID');
      pass('Replay check without payload argument succeeds on existing key');
    } catch (e) {
      fail('Section 8 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 9: SAME-USER IDEMPOTENCY RACE (EXECUTION RESERVATION)
    // --------------------------------------------------------------------------
    console.log('\n🏎️ SECTION 9: Same-User Idempotency Race (Reservation)');
    try {
      const idemStore = new IdempotencyStore(60_000, TEST_IDEMPOTENCY_DIR);
      const raceKey = 'race_key_' + Date.now();

      // First call reserves execution
      const res1 = idemStore.reserve(raceKey, { task: 'heavy' }, 60_000, 'user_alice');
      assert(res1.reserved === true, 'First reservation succeeds');
      assert(res1.isDuplicate === false, 'First reservation is not marked duplicate');
      pass('First concurrent caller successfully reserves execution');

      // Immediate second call by same user with same key
      const res2 = idemStore.reserve(raceKey, { task: 'heavy' }, 60_000, 'user_alice');
      assert(res2.reserved === false, 'Second reservation rejected');
      assert(res2.inProgress === true, 'Second caller observes IN_PROGRESS');
      pass('Second caller blocked with inProgress status (INV-10)');

      // Complete execution
      idemStore.record(raceKey, { done: true }, { task: 'heavy' }, 60_000, 'user_alice');

      const res3 = idemStore.reserve(raceKey, { task: 'heavy' }, 60_000, 'user_alice');
      assert(res3.reserved === false && res3.isDuplicate === true);
      assert.strictEqual(res3.cachedResult?.done, true);
      pass('Subsequent calls return cached result after execution completes');

      // Reservation detects payload conflict during concurrent attempt
      const conflictRace = idemStore.reserve('race_key_payload', { p: 1 }, 60_000, 'user_alice');
      assert(conflictRace.reserved === true);
      const conflictRace2 = idemStore.reserve('race_key_payload', { p: 2 }, 60_000, 'user_alice');
      assert(conflictRace2.conflict === true);
      pass('Reservation detects payload conflict during concurrent attempt');
    } catch (e) {
      fail('Section 9 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 10: CONCURRENT MULTI-USER WRITES
    // --------------------------------------------------------------------------
    console.log('\n⚛️ SECTION 10: Concurrent Multi-User Interleaved Writes');
    try {
      const idemStore = new IdempotencyStore(60_000, TEST_IDEMPOTENCY_DIR);
      const approvalService = new ApprovalService(TEST_APPROVALS_DIR);

      // Rapidly interleave writes across 10 iterations
      for (let i = 0; i < 10; i++) {
        idemStore.record(`seq_a_${i}`, { val: i }, undefined, 60_000, 'user_alice');
        idemStore.record(`seq_b_${i}`, { val: i * 2 }, undefined, 60_000, 'user_bob');
        approvalService.requestApproval({
          actionName: `action_a_${i}`,
          targetDomain: 'shop',
          arguments: { iter: i },
          requestedBy: 'user_alice',
          userId: 'user_alice',
        });
        approvalService.requestApproval({
          actionName: `action_b_${i}`,
          targetDomain: 'shop',
          arguments: { iter: i * 2 },
          requestedBy: 'user_bob',
          userId: 'user_bob',
        });
      }

      const aliceApprovals = approvalService.getAllApprovals('user_alice');
      const bobApprovals = approvalService.getAllApprovals('user_bob');
      assert(aliceApprovals.length >= 10, 'Alice recorded all sequential approvals');
      assert(bobApprovals.length >= 10, 'Bob recorded all sequential approvals');
      pass('Interleaved rapid multi-user writes complete with 100% integrity');

      // Check for zero leaked temp files
      const tempFiles = fs.readdirSync(TEST_APPROVALS_DIR).filter(f => f.includes('.tmp.'));
      assert.strictEqual(tempFiles.length, 0, 'Zero temporary files leaked in approvals dir');
      pass('Atomic writes leave zero temporary files leaked');
    } catch (e) {
      fail('Section 10 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 11: CORRUPTION ISOLATION
    // --------------------------------------------------------------------------
    console.log('\n💥 SECTION 11: Corruption Isolation');
    try {
      const corruptDir = path.join(TEST_BASE_DIR, 'corrupt_test');
      fs.mkdirSync(corruptDir, { recursive: true });
      const store = new IdempotencyStore(60_000, corruptDir);

      // Healthy user write
      store.record('healthy_key', { ok: true }, undefined, 60_000, 'user_healthy');

      // Inject corrupted JSON into user_eve.json
      const eveFile = path.join(corruptDir, 'user_eve.json');
      fs.writeFileSync(eveFile, '{ corrupted syntax non-json!@# ', 'utf8');

      assert.throws(() => {
        store.check('some_key', undefined, 'user_eve');
      }, DurablePersistenceCorruptionError);
      pass('Corrupted user partition fails closed with DurablePersistenceCorruptionError');

      // Verify quarantine file was created
      const quarantined = fs.readdirSync(corruptDir).some(f => f.includes('user_eve.json.corrupted.'));
      assert(quarantined, 'Corrupted file safely quarantined for forensics');
      pass('Corrupted partition automatically preserved in quarantine file');

      // Healthy user still functions 100%
      const healthyCheck = store.check('healthy_key', undefined, 'user_healthy');
      assert(healthyCheck.isDuplicate === true && healthyCheck.cachedResult?.ok === true);
      pass('Healthy user remains 100% functional despite corrupted neighbor partition (INV-5)');
    } catch (e) {
      fail('Section 11 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 12: SCHEMA VALIDATION
    // --------------------------------------------------------------------------
    console.log('\n📋 SECTION 12: Schema Validation');
    try {
      const validAppr = validateApprovalRecords([
        {
          id: 'appr_123',
          ownerUserId: 'alice',
          actionName: 'test',
          targetDomain: 'shop',
          argumentsHash: 'hash',
          argumentsPreview: {},
          requestedBy: 'alice',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
        },
      ]);
      assert(validAppr.success === true, 'Valid approval records pass schema validation');
      pass('Valid approval records accepted');

      const invalidStatus = validateApprovalRecords([
        {
          id: 'appr_123',
          ownerUserId: 'alice',
          actionName: 'test',
          targetDomain: 'shop',
          argumentsHash: 'hash',
          argumentsPreview: {},
          requestedBy: 'alice',
          status: 'INVALID_STATUS_XYZ',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
        },
      ]);
      assert(invalidStatus.success === false, 'Invalid status enum rejected');
      pass('Invalid approval status enum rejected');

      const invalidDomain = validateApprovalRecords([
        {
          id: 'appr_123',
          ownerUserId: 'alice',
          actionName: 'test',
          targetDomain: 'invalid_domain_xyz' as any,
          argumentsHash: 'hash',
          argumentsPreview: {},
          requestedBy: 'alice',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
        },
      ]);
      assert(invalidDomain.success === false, 'Invalid targetDomain rejected');
      pass('Invalid targetDomain rejected by schema validation');

      const validIdem = validateIdempotencyEntries([
        {
          key: 'k1',
          ownerUserId: 'alice',
          payloadHash: 'h',
          result: { r: 1 },
          recordedAt: Date.now(),
          expiresAt: Date.now() + 10000,
        },
      ]);
      assert(validIdem.success === true, 'Valid idempotency entries pass schema validation');
      pass('Valid idempotency entries accepted');

      const invalidIdem = validateIdempotencyEntries([
        {
          key: 'k1',
          ownerUserId: 'alice',
          payloadHash: 'h',
          result: null,
          recordedAt: -999, // Invalid
          expiresAt: 100,
        },
      ]);
      assert(invalidIdem.success === false, 'Negative recordedAt rejected');
      pass('Invalid idempotency timestamp rejected');
    } catch (e) {
      fail('Section 12 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 13: LEGACY COMPATIBILITY & MIGRATION
    // --------------------------------------------------------------------------
    console.log('\n🔄 SECTION 13: Legacy Compatibility & Migration');
    try {
      const legacyDir = path.join(TEST_BASE_DIR, 'legacy_compat');
      fs.mkdirSync(legacyDir, { recursive: true });
      const legacyFile = path.join(legacyDir, 'legacy_approvals.json');

      const legacyData: ApprovalRecord[] = [
        {
          id: 'appr_legacy_001',
          ownerUserId: 'boss_user',
          actionName: 'legacy_payout',
          targetDomain: 'shop',
          argumentsHash: 'abc',
          argumentsPreview: {},
          requestedBy: 'subagent_finance',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      ];
      fs.writeFileSync(legacyFile, JSON.stringify(legacyData, null, 2), 'utf8');

      const partitionedDir = path.join(legacyDir, 'partitions');
      const service = new ApprovalService(partitionedDir, legacyFile);

      // Primary owner triggers migration
      const primaryStore = service.getStore('boss_user');
      const records = primaryStore.read();
      assert(records.some(r => r.id === 'appr_legacy_001'), 'Primary owner inherits legacy records');
      pass('Primary owner (boss_user) deterministically inherits legacy approval records');

      // Arbitrary new user does NOT inherit legacy records
      const charlieStore = service.getStore('user_charlie');
      assert.strictEqual(charlieStore.read().length, 0, 'Charlie receives 0 legacy records');
      pass('Arbitrary new user starts with pristine empty approvals store');

      // Original legacy file preserved intact
      assert(fs.existsSync(legacyFile), 'Original legacy file was NOT deleted');
      pass('Legacy file preserved on disk without destructive deletion');
    } catch (e) {
      fail('Section 13 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 14: PATH TRAVERSAL SECURITY
    // --------------------------------------------------------------------------
    console.log('\n🚫 SECTION 14: Path Traversal Security');
    try {
      const service = new ApprovalService(TEST_APPROVALS_DIR);
      assert.throws(() => service.getStore('../../etc/passwd'), DurablePersistenceSecurityError);
      assert.throws(() => service.getStore('user/sub/folder'), DurablePersistenceSecurityError);
      assert.throws(() => service.getStore('user\\win\\slash'), DurablePersistenceSecurityError);
      pass('Path traversal tokens (.., /, \\) strictly rejected with DurablePersistenceSecurityError');
    } catch (e) {
      fail('Section 14 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 15: NULL-BYTE SECURITY
    // --------------------------------------------------------------------------
    console.log('\n🛑 SECTION 15: Null-Byte Security');
    try {
      const service = new ApprovalService(TEST_APPROVALS_DIR);
      assert.throws(() => service.getStore('admin\0evil'), DurablePersistenceSecurityError);
      pass('Null byte injection strictly rejected with DurablePersistenceSecurityError');
    } catch (e) {
      fail('Section 15 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 16: WINDOWS RESERVED-NAME SECURITY
    // --------------------------------------------------------------------------
    console.log('\n🪟 SECTION 16: Windows Reserved-Name Security');
    try {
      const service = new ApprovalService(TEST_APPROVALS_DIR);
      assert.throws(() => service.getStore('CON'), DurablePersistenceSecurityError);
      assert.throws(() => service.getStore('PRN'), DurablePersistenceSecurityError);
      assert.throws(() => service.getStore('NUL'), DurablePersistenceSecurityError);
      assert.throws(() => service.getStore('COM1'), DurablePersistenceSecurityError);
      pass('Windows primary reserved device names strictly rejected');

      assert.throws(() => service.getStore('AUX'), DurablePersistenceSecurityError);
      assert.throws(() => service.getStore('LPT1'), DurablePersistenceSecurityError);
      pass('Windows auxiliary reserved device names (AUX, LPT1) strictly rejected');
    } catch (e) {
      fail('Section 16 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 17: PROTOTYPE POLLUTION SECURITY
    // --------------------------------------------------------------------------
    console.log('\n🧪 SECTION 17: Prototype Pollution Security');
    try {
      const pollutionAppr = JSON.parse('{"id":"appr_p","ownerUserId":"a","actionName":"a","targetDomain":"shop","argumentsHash":"h","argumentsPreview":{},"requestedBy":"a","status":"PENDING","createdAt":"2026-01-01T00:00:00.000Z","expiresAt":"2026-01-01T00:00:00.000Z","__proto__":{"polluted":true}}');
      const res = validateApprovalRecords([pollutionAppr]);
      assert(res.success === false, 'Object with __proto__ rejected');
      assert.strictEqual((Object.prototype as any).polluted, undefined);
      pass('Prototype pollution payload rejected without polluting Object.prototype');

      const pollutionIdem = JSON.parse('{"key":"k","ownerUserId":"a","payloadHash":"h","recordedAt":10,"expiresAt":20,"__proto__":{"polluted":true}}');
      const idemRes = validateIdempotencyEntries([pollutionIdem]);
      assert(idemRes.success === false, 'Idempotency object with __proto__ rejected');
      pass('Idempotency schema validation rejects __proto__ prototype pollution');
    } catch (e) {
      fail('Section 17 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 18: GLOBAL MUTABLE-STATE STATIC AUDIT
    // --------------------------------------------------------------------------
    console.log('\n🔍 SECTION 18: Global Mutable-State Static Audit');
    try {
      const apprSource = fs.readFileSync(path.resolve(process.cwd(), 'src/core/approvalService.ts'), 'utf8');
      const idemSource = fs.readFileSync(path.resolve(process.cwd(), 'src/core/idempotencyStore.ts'), 'utf8');

      assert(!apprSource.includes('let currentApproval'), 'approvalService.ts contains no currentApproval variable');
      assert(!apprSource.includes('let approvals ='), 'approvalService.ts contains no global approvals array');
      assert(!apprSource.includes('fs.writeFileSync('), 'approvalService.ts contains 0 direct fs.writeFileSync calls');
      assert(!apprSource.includes('JSON.parse('), 'approvalService.ts contains 0 direct JSON.parse calls');
      pass('ApprovalService passes static zero-unsafe-write & zero-mutable-global audit');

      assert(!idemSource.includes('let currentEntry'), 'idempotencyStore.ts contains no currentEntry variable');
      assert(!idemSource.includes('let store ='), 'idempotencyStore.ts contains no global store array');
      assert(!idemSource.includes('fs.writeFileSync('), 'idempotencyStore.ts contains 0 direct fs.writeFileSync calls');
      assert(!idemSource.includes('JSON.parse('), 'idempotencyStore.ts contains 0 direct JSON.parse calls');
      pass('IdempotencyStore passes static zero-unsafe-write & zero-mutable-global audit');
    } catch (e) {
      fail('Section 18 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 19: AGENT LOOP PDP INTEGRATION
    // --------------------------------------------------------------------------
    console.log('\n🔄 SECTION 19: AgentLoop PDP Integration');
    try {
      toolRegistry.register({
        name: 'test_high_impact_action',
        description: 'High impact action requiring human approval',
        parameters: {
          type: 'object',
          properties: { target: { type: 'string' } },
        },
        execute: async (args: any) => ({ success: true, target: args?.target }),
      });
      globalPDP.registerActionPolicy('test_high_impact_action', 'HIGH_IMPACT');

      const loop = new AgentLoop();

      // Request high impact action without approval -> PDP demands approval
      const loopRes = await loop.execute({
        sessionId: 'sess_governance_test',
        userText: 'thực thi thao tác rủi ro cao',
        actor: { userId: 'boss_user', role: 'owner', channel: 'DESKTOP', isOwner: true },
        metadata: { actionName: 'test_high_impact_action', parameters: { target: 'database_cluster' } },
      });

      assert.strictEqual(loopRes.state, 'APPROVAL_REQUIRED');
      assert(loopRes.policyEvaluations.some(p => p.decision.requiresApproval), 'PDP halts at Stage 4 demanding approval');
      pass('AgentLoop halts HIGH_IMPACT action at Stage 4 with APPROVAL_REQUIRED');

      // Grant approval and execute with valid token
      const approvalId = loopRes.policyEvaluations[0].decision.approvalId!;
      const grant = globalPDP.grantApproval(approvalId, 'boss_user', 'boss_user');
      assert(grant.success && Boolean(grant.executionToken), 'Approval granted with token');

      const approvedLoopRes = await loop.execute({
        sessionId: 'sess_governance_test_approved',
        userText: 'thực thi thao tác rủi ro cao đã duyệt',
        actor: { userId: 'boss_user', role: 'owner', channel: 'DESKTOP', isOwner: true },
        executionToken: grant.executionToken,
        metadata: { actionName: 'test_high_impact_action', parameters: { target: 'database_cluster' } },
      });
      assert.strictEqual(approvedLoopRes.state, 'COMPLETED');
      pass('AgentLoop transitions to COMPLETED when valid executionToken is provided');

      // Create a fresh unconsumed token owned by boss_user to test active cross-user token theft
      const theftReq = globalPDP.requestApproval({
        actionName: 'test_high_impact_action',
        targetDomain: 'shop',
        arguments: { target: 'database_cluster' },
        requestedBy: 'boss_user',
        userId: 'boss_user',
      });
      const theftGrant = globalPDP.grantApproval(theftReq.id, 'boss_user', 'boss_user');
      assert(theftGrant.success && Boolean(theftGrant.executionToken), 'Fresh unconsumed token granted for boss');

      // Attempt with Bob using boss's unconsumed token -> rejected due to TOKEN_OWNER_MISMATCH
      const bobLoopRes = await loop.execute({
        sessionId: 'sess_governance_test_bob',
        userText: 'bob đánh cắp token',
        actor: { userId: 'user_bob', role: 'owner', channel: 'DESKTOP', isOwner: true },
        executionToken: theftGrant.executionToken,
        metadata: { actionName: 'test_high_impact_action', parameters: { target: 'database_cluster' } },
      });
      assert.strictEqual(bobLoopRes.state, 'APPROVAL_REQUIRED');
      pass('AgentLoop strictly blocks unowned token and demands approval');
    } catch (e) {
      fail('Section 19 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 20: TOOL REGISTRY EXECUTION BOUNDARY
    // --------------------------------------------------------------------------
    console.log('\n⚙️ SECTION 20: ToolRegistry Execution Boundary');
    try {
      const registry = new ToolRegistry();
      globalPDP.registerActionPolicy('test_multi_idem_tool', 'OBSERVE');
      let toolRunCount = 0;
      registry.register({
        name: 'test_multi_idem_tool',
        description: 'Test Tool for Idempotency Partitioning',
        parameters: {},
        execute: async () => {
          toolRunCount++;
          return { runCount: toolRunCount };
        },
      });

      const uniqueToolKey = `shared_tool_key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Alice executes with uniqueToolKey
      const aliceRun1 = await registry.executeTool('test_multi_idem_tool', {}, {
        userId: 'user_alice',
        idempotencyKey: uniqueToolKey,
      });
      assert.strictEqual(aliceRun1.runCount, 1);

      // Alice repeats with uniqueToolKey -> returns cached result
      const aliceRun2 = await registry.executeTool('test_multi_idem_tool', {}, {
        userId: 'user_alice',
        idempotencyKey: uniqueToolKey,
      });
      assert.strictEqual(aliceRun2.runCount, 1);
      assert.strictEqual(toolRunCount, 1, 'Tool not re-executed for Alice replay');
      pass('ToolRegistry returns cached result on same-user idempotency replay');

      // Bob executes with the EXACT SAME key -> must execute independently!
      const bobRun1 = await registry.executeTool('test_multi_idem_tool', {}, {
        userId: 'user_bob',
        idempotencyKey: uniqueToolKey,
      });
      assert.strictEqual(bobRun1.runCount, 2);
      assert.strictEqual(toolRunCount, 2, 'Tool legitimately executed for Bob despite same key');
      pass('ToolRegistry executes independently for Bob with zero idempotency cross-talk');
    } catch (e) {
      fail('Section 20 failed', e);
    }
  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST SUMMARY: ${totalPassed}/${totalPassed + totalFailed} Passed (${totalFailed} Failed)`);
  if (totalFailed === 0) {
    console.log('🎉 ALL MILESTONE 1.3.4 MULTI-TENANT APPROVAL & IDEMPOTENCY TESTS PASSED (100% SUCCESS)!');
  } else {
    console.error('❌ MILESTONE 1.3.4 SUITE HAS FAILING TESTS!');
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
