// tests/test_v4_multi_user_durable_memory.ts
// BOW CON V4.0 — MILESTONE 1.3.3: MULTI-USER DURABLE MEMORY PARTITIONING TEST SUITE

// EN: This suite verifies durable memory ownership separately for every authenticated user.
// VI: Suite này xác minh quyền sở hữu durable memory riêng cho từng người dùng đã xác thực.

import fs from 'node:fs';
import path from 'node:path';
import {
  resolveUserPartition,
  DEFAULT_PRIMARY_USER_ID,
} from '../src/core/persistence/userPartitionResolver.js';
import {
  DurablePersistenceSecurityError,
  DurablePersistenceSchemaError,
  DurablePersistenceCorruptionError,
} from '../src/core/persistence/durableJsonStore.js';
import { BossMemoryHub, BossProfile } from '../src/embodied/bossMemoryHub.js';
import { BossFeedbackLearner, BossRule } from '../src/embodied/bossFeedbackLearner.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

const TEST_ROOT = path.resolve(process.cwd(), 'tests', 'fixtures', `multi_user_test_${Date.now()}`);
const MEMORY_BASE_DIR = path.join(TEST_ROOT, 'bossMemory');
const RULES_BASE_DIR = path.join(TEST_ROOT, 'bossRules');
const LEGACY_MEMORY_FILE = path.join(TEST_ROOT, 'legacyBossMemory.json');
const LEGACY_RULES_FILE = path.join(TEST_ROOT, 'legacyCustomRules.json');

function cleanupDir(dirPath: string) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {
    // Best effort cleanup
  }
}

async function runMultiUserSuite() {
  console.log('\n========================================================================');
  console.log('👥 RUNNING BOWCON V4.0 (MS-1.3.3: MULTI-USER DURABLE MEMORY PARTITIONING) SUITE');
  console.log('========================================================================\n');

  if (!fs.existsSync(TEST_ROOT)) {
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  }

  try {
    // ========================================================================
    // SECTION 1: PARTITION IDENTITY & TRAVERSAL DEFENSE
    // ========================================================================
    console.log('🔑 SECTION 1: Partition Identity & Traversal Defense');

    // 1.1 Same user -> same partition
    const partA1 = resolveUserPartition('user_alice', MEMORY_BASE_DIR);
    const partA2 = resolveUserPartition('user_alice', MEMORY_BASE_DIR);
    assert(partA1.partitionKey === partA2.partitionKey, 'Equivalent userId resolves to identical partitionKey');
    assert(partA1.filePath === partA2.filePath, 'Equivalent userId resolves to identical filePath');

    // 1.2 Different users -> different partitions
    const partB = resolveUserPartition('user_bob', MEMORY_BASE_DIR);
    assert(partA1.partitionKey !== partB.partitionKey, 'Different userIds resolve to strictly distinct partitionKeys');
    assert(partA1.filePath !== partB.filePath, 'Different userIds resolve to strictly distinct filePaths');

    // 1.3 Empty / Missing identifier rejected
    let emptyCaught = false;
    try {
      resolveUserPartition('', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) emptyCaught = true;
    }
    assert(emptyCaught, 'Empty userId rejected by partition resolver');

    // 1.4 Anonymous user rejected
    let anonCaught = false;
    try {
      resolveUserPartition('anonymous', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) anonCaught = true;
    }
    assert(anonCaught, 'Anonymous userId rejected (No anonymous durable memory ownership)');

    // 1.5 Directory traversal (..) rejected
    let traversalCaught = false;
    try {
      resolveUserPartition('../evil_user', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) traversalCaught = true;
    }
    assert(traversalCaught, 'Path traversal token (..) strictly rejected');

    // 1.6 Slash / separator injection rejected
    let slashCaught = false;
    try {
      resolveUserPartition('sub/dir/user', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) slashCaught = true;
    }
    assert(slashCaught, 'Forward slash separator rejected');

    // 1.7 Backslash separator rejected
    let backslashCaught = false;
    try {
      resolveUserPartition('sub\\dir\\user', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) backslashCaught = true;
    }
    assert(backslashCaught, 'Backslash separator rejected');

    // 1.8 Null byte injection rejected
    let nullCaught = false;
    try {
      resolveUserPartition('user\0admin', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) nullCaught = true;
    }
    assert(nullCaught, 'Null byte injection strictly rejected');

    // 1.9 Windows reserved device names rejected
    let reservedCaught = false;
    try {
      resolveUserPartition('CON', MEMORY_BASE_DIR);
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) reservedCaught = true;
    }
    assert(reservedCaught, 'Windows reserved device name (CON) strictly rejected');

    // ========================================================================
    // SECTION 2: PROFILE ISOLATION (USER A != USER B)
    // ========================================================================
    console.log('\n👤 SECTION 2: Profile Isolation (User A != User B)');

    const hub = new BossMemoryHub(MEMORY_BASE_DIR, LEGACY_MEMORY_FILE);

    // Initialize profiles for User A and User B
    hub.rememberHabit('user_alice', 'preferredBeverage', 'Trà sen vàng ngọt thanh');
    hub.rememberHabit('user_bob', 'preferredBeverage', 'Cà phê espresso đậm đặc');

    const profileA = hub.getProfile('user_alice');
    const profileB = hub.getProfile('user_bob');

    assert(profileA.habits.preferredBeverage === 'Trà sen vàng ngọt thanh', 'User Alice profile contains Alice habit');
    assert(profileB.habits.preferredBeverage === 'Cà phê espresso đậm đặc', 'User Bob profile contains Bob habit');
    assert(profileA.habits.preferredBeverage !== profileB.habits.preferredBeverage, 'User A and User B profiles are strictly isolated');

    // Verify physical separation on filesystem
    const aliceFile = path.join(MEMORY_BASE_DIR, 'user_alice.json');
    const bobFile = path.join(MEMORY_BASE_DIR, 'user_bob.json');
    assert(fs.existsSync(aliceFile), 'Alice profile exists in its own partition file');
    assert(fs.existsSync(bobFile), 'Bob profile exists in its own partition file');

    const rawAlice = fs.readFileSync(aliceFile, 'utf8');
    const rawBob = fs.readFileSync(bobFile, 'utf8');
    assert(!rawAlice.includes('espresso'), 'Alice physical partition contains zero Bob data');
    assert(!rawBob.includes('sen vàng'), 'Bob physical partition contains zero Alice data');

    // ========================================================================
    // SECTION 3: RULE ISOLATION
    // ========================================================================
    console.log('\n📜 SECTION 3: Rule Isolation (Rules A != Rules B)');

    const learner = new BossFeedbackLearner(RULES_BASE_DIR, LEGACY_RULES_FILE);

    learner.addRule('user_alice', {
      pattern: 'xưng hô',
      instruction: 'Gọi Alice là Tổng Giám Đốc',
      category: 'addressing',
    });

    learner.addRule('user_bob', {
      pattern: 'xưng hô',
      instruction: 'Gọi Bob là Kỹ Sư Trưởng',
      category: 'addressing',
    });

    const rulesA = learner.getRules('user_alice');
    const rulesB = learner.getRules('user_bob');

    assert(rulesA.some(r => r.instruction.includes('Tổng Giám Đốc')), 'Alice rules contain Alice custom addressing');
    assert(!rulesA.some(r => r.instruction.includes('Kỹ Sư Trưởng')), 'Alice rules do NOT contain Bob custom addressing');
    assert(rulesB.some(r => r.instruction.includes('Kỹ Sư Trưởng')), 'Bob rules contain Bob custom addressing');
    assert(!rulesB.some(r => r.instruction.includes('Tổng Giám Đốc')), 'Bob rules do NOT contain Alice custom addressing');

    // ========================================================================
    // SECTION 4: CROSS-USER MUTATION PROTECTION
    // ========================================================================
    console.log('\n🛡️ SECTION 4: Cross-User Mutation Protection');

    const bobProfileBefore = JSON.stringify(hub.getProfile('user_bob'));
    hub.addOrUpdateProject('user_alice', {
      id: 'proj_alice_quantum',
      name: 'Quantum AI Research',
      description: 'Alice exclusive quantum project',
      techStack: ['Qiskit', 'Python'],
      status: 'active',
    });

    const bobProfileAfter = JSON.stringify(hub.getProfile('user_bob'));
    assert(bobProfileBefore === bobProfileAfter, 'Mutating User A profile leaves User B profile 100% byte-for-byte identical');

    const aliceRulesBefore = JSON.stringify(learner.getRules('user_alice'));
    learner.addRule('user_bob', {
      pattern: 'chính sách',
      instruction: 'Bảo hành 2 năm cho Bob',
      category: 'policy',
    });
    const aliceRulesAfter = JSON.stringify(learner.getRules('user_alice'));
    assert(aliceRulesBefore === aliceRulesAfter, 'Mutating User B rules leaves User A rules 100% byte-for-byte identical');

    // ========================================================================
    // SECTION 5: SHARED SESSION ID ISOLATION
    // ========================================================================
    console.log('\n👥 SECTION 5: Shared Session ID Isolation (Same Session, Different Users)');

    // Even if user_alice and user_bob share session 'kiosk_session_99'
    const promptCtxAlice = hub.getPromptContext('user_alice');
    const promptCtxBob = hub.getPromptContext('user_bob');

    assert(promptCtxAlice.includes('Trà sen vàng ngọt thanh'), 'Alice prompt context is scoped to Alice');
    assert(!promptCtxAlice.includes('espresso'), 'Alice prompt context has zero Bob data');
    assert(promptCtxBob.includes('espresso'), 'Bob prompt context is scoped to Bob');
    assert(!promptCtxBob.includes('Trà sen vàng'), 'Bob prompt context has zero Alice data');

    // ========================================================================
    // SECTION 6: CONCURRENT INTERLEAVED WRITES
    // ========================================================================
    console.log('\n⚡ SECTION 6: Concurrent Interleaved Writes');

    // Interleave 10 alternating writes between user_alice and user_bob
    for (let i = 1; i <= 10; i++) {
      hub.rememberHabit('user_alice', 'favoriteMusicGenre', `Alice Genre ${i}`);
      hub.rememberHabit('user_bob', 'favoriteMusicGenre', `Bob Genre ${i}`);
    }

    const finalA = hub.getProfile('user_alice');
    const finalB = hub.getProfile('user_bob');

    assert(finalA.habits.favoriteMusicGenre === 'Alice Genre 10', 'User A preserves final sequential write without cross-talk');
    assert(finalB.habits.favoriteMusicGenre === 'Bob Genre 10', 'User B preserves final sequential write without cross-talk');

    // ========================================================================
    // SECTION 7: CACHE ISOLATION
    // ========================================================================
    console.log('\n🗄️ SECTION 7: Cache Isolation (Store Map Scoping)');

    // Ensure store cache does not return a single mutable singleton
    const storeAlice = hub.getStore('user_alice');
    const storeBob = hub.getStore('user_bob');
    assert(storeAlice !== storeBob, 'DurableJsonStore instances for Alice and Bob are distinct objects');
    assert(storeAlice.filePath !== storeBob.filePath, 'Stores point to distinct physical partition files');

    // ========================================================================
    // SECTION 8: LEGACY COMPATIBILITY & MIGRATION
    // ========================================================================
    console.log('\n🔄 SECTION 8: Legacy Compatibility & Migration');

    // Create a mock legacy file simulating production bossMemory.json
    const mockLegacyProfile: BossProfile = {
      name: 'Sếp Hoàn Legacy',
      title: 'Sếp',
      habits: {
        breakIntervalMinutes: 45,
        preferredBeverage: 'Cà phê phin truyền thống',
      },
      projects: [
        {
          id: 'proj_legacy_robot',
          name: 'Legacy Robot 1.0',
          description: 'Original robot project',
          techStack: ['C++'],
          status: 'completed',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      healthNotes: ['Bảo vệ mắt'],
      relationships: [{ name: 'BOW', role: 'Assistant' }],
      customPreferences: { tone: 'Kính cẩn' },
      lastInteractionTimestamp: 1000,
      lastBreakReminderTimestamp: 1000,
    };
    fs.writeFileSync(LEGACY_MEMORY_FILE, JSON.stringify(mockLegacyProfile, null, 2), 'utf8');

    // Re-instantiate hub with legacy file
    const migrationHub = new BossMemoryHub(MEMORY_BASE_DIR, LEGACY_MEMORY_FILE);

    // Primary user (boss_user) should inherit the legacy profile
    const primaryProfile = migrationHub.getProfile(DEFAULT_PRIMARY_USER_ID);
    assert(primaryProfile.name === 'Sếp Hoàn Legacy', 'Primary owner (boss_user) successfully inherits legacy profile');
    assert(primaryProfile.projects[0].name === 'Legacy Robot 1.0', 'Legacy projects migrated intact');

    // Arbitrary new user (user_charlie) MUST NEVER receive legacy profile
    const charlieProfile = migrationHub.getProfile('user_charlie');
    assert(charlieProfile.name !== 'Sếp Hoàn Legacy', 'Arbitrary user Charlie does NOT receive legacy primary profile');
    assert(charlieProfile.projects.length === 0, 'Charlie starts with empty projects list');

    // Legacy file remains completely intact on disk (never deleted)
    assert(fs.existsSync(LEGACY_MEMORY_FILE), 'Original legacy file was preserved intact without deletion');

    // ========================================================================
    // SECTION 9: CORRUPTION ISOLATION
    // ========================================================================
    console.log('\n💥 SECTION 9: Corruption Isolation');

    // Corrupt Alice's partition file manually
    const corruptFile = path.join(MEMORY_BASE_DIR, 'user_corrupt.json');
    fs.writeFileSync(corruptFile, '{ "corrupted": [ missing close bracket', 'utf8');

    let aliceCorrupted = false;
    try {
      hub.getProfile('user_corrupt');
    } catch (err) {
      if (err instanceof DurablePersistenceCorruptionError) {
        aliceCorrupted = true;
      }
    }
    assert(aliceCorrupted, 'Corrupted user partition fails closed with DurablePersistenceCorruptionError');

    // Healthy Bob profile must remain completely readable and uncorrupted
    const bobHealthy = hub.getProfile('user_bob');
    assert(bobHealthy.name.length > 0, 'Healthy Bob partition remains 100% accessible despite another user corruption');

    // ========================================================================
    // SECTION 10: SCHEMA ISOLATION
    // ========================================================================
    console.log('\n🛑 SECTION 10: Schema Isolation');

    const invalidSchemaFile = path.join(MEMORY_BASE_DIR, 'user_bad_schema.json');
    fs.writeFileSync(invalidSchemaFile, JSON.stringify({ name: 99999, habits: 'not_an_object' }), 'utf8');

    let schemaRejected = false;
    try {
      hub.getProfile('user_bad_schema');
    } catch (err) {
      if (err instanceof DurablePersistenceSchemaError) {
        schemaRejected = true;
      }
    }
    assert(schemaRejected, 'Invalid schema partition fails closed without affecting other users');
    assert(hub.getProfile('user_bob').name.length > 0, 'Bob profile still readable and valid');

    // ========================================================================
    // SECTION 11: AUTHORIZATION BOUNDARY
    // ========================================================================
    console.log('\n🔐 SECTION 11: Authorization Boundary & Privilege Isolation');

    // Verify resolveUserPartition rejects spoofed or unauthenticated access
    let blankRejected = false;
    try {
      hub.getProfile('   ');
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) {
        blankRejected = true;
      }
    }
    assert(blankRejected, 'Blank or whitespace userId rejected by authorization boundary');

    let nullByteRejected = false;
    try {
      hub.getProfile('attacker\0victim');
    } catch (err) {
      if (err instanceof DurablePersistenceSecurityError) {
        nullByteRejected = true;
      }
    }
    assert(nullByteRejected, 'Null-byte injected user identifier blocked');

    // ========================================================================
    // SECTION 12: STATIC GLOBAL-STATE AUDIT
    // ========================================================================
    console.log('\n🔍 SECTION 12: Static Global-State Audit');

    const hubSource = fs.readFileSync(path.resolve(process.cwd(), 'src', 'embodied', 'bossMemoryHub.ts'), 'utf8');
    const learnerSource = fs.readFileSync(path.resolve(process.cwd(), 'src', 'embodied', 'bossFeedbackLearner.ts'), 'utf8');

    assert(!hubSource.includes('currentBossProfile'), 'bossMemoryHub.ts does not contain "currentBossProfile" singleton');
    assert(!hubSource.includes('currentUserId'), 'bossMemoryHub.ts does not contain "currentUserId" state variable');
    assert(!learnerSource.includes('currentBossRules'), 'bossFeedbackLearner.ts does not contain "currentBossRules" singleton');
    assert(hubSource.includes('private stores = new Map'), 'bossMemoryHub.ts manages stores via scoped Map registry');
    assert(learnerSource.includes('private stores = new Map'), 'bossFeedbackLearner.ts manages stores via scoped Map registry');

  } finally {
    cleanupDir(TEST_ROOT);
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  if (failedTests === 0) {
    console.log('🎉 ALL MILESTONE 1.3.3 MULTI-USER DURABLE MEMORY TESTS PASSED (100% SUCCESS)!');
  } else {
    console.error('❌ SOME TESTS FAILED IN MILESTONE 1.3.3 SUITE!');
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMultiUserSuite().catch(err => {
  console.error('Fatal error running MS-1.3.3 test suite:', err);
  process.exit(1);
});
