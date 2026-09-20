// tests/security/test_ptt_test_only_guard.ts
// BOWCON V4.0 — PROMPT #2 (M2): PUSH-TO-TALK TEST-ONLY GUARD TEST SUITE
//
// EN:
// Verifies hard guards preventing simulation methods from being invoked outside test environment:
// 1. Calling __testOnly_simulatePhysicalPress() in NODE_ENV=test succeeds and confirms PTT.
// 2. Calling __testOnly_simulatePhysicalPress() in NODE_ENV=production throws TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV. PTT is NOT bypassed.
// 3. Calling __testOnly_simulatePhysicalPress() in NODE_ENV=development throws TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV. PTT is NOT bypassed.
// 4. Calling legacy simulatePhysicalPress() throws TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV.
// 5. TestOnlyPushToTalkController executes only in NODE_ENV=test, blocked in production/dev.
// 6. VoicePipeline simulatedTranscript/audioBufferOverride blocked outside NODE_ENV=test.
//
// VI:
// Xác minh cơ chế guard cứng ngăn chặn các hàm giả lập bị gọi ngoài môi trường test:
// 1. Gọi __testOnly_simulatePhysicalPress() trong NODE_ENV=test -> thành công, PTT được xác nhận.
// 2. Gọi __testOnly_simulatePhysicalPress() trong NODE_ENV=production -> ném lỗi TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV, PTT KHÔNG bị bypass.
// 3. Gọi __testOnly_simulatePhysicalPress() trong NODE_ENV=development -> ném lỗi TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV, PTT KHÔNG bị bypass.
// 4. Gọi simulatePhysicalPress() cũ -> ném lỗi TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV.
// 5. TestOnlyPushToTalkController chỉ chạy khi NODE_ENV=test, bị chặn trong production/dev.
// 6. VoicePipeline chặn simulatedTranscript và audioBufferOverride ngoài NODE_ENV=test.

import assert from 'node:assert';
import {
  PushToTalkManager,
  TestOnlyPushToTalkController,
} from '../../src/security/pushToTalkManager.js';
import { VoicePipeline } from '../../src/speech/voicePipeline.js';

const EXPECTED_ERROR_KEYWORD = 'TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV';

async function runPushToTalkGuardTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🛡️  BẮT ĐẦU TEST SUITE PROMPT #2 (M2): PTT TEST-ONLY GUARD VERIFICATION');
  console.log('========================================================================\n');

  const savedNodeEnv = process.env.NODE_ENV;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: NODE_ENV=test -> __testOnly_simulatePhysicalPress HOẠT ĐỘNG BÌNH THƯỜNG
    // ---------------------------------------------------------------------------
    console.log('--- TEST 1: In NODE_ENV=test -> __testOnly_simulatePhysicalPress() succeeds ---');
    process.env.NODE_ENV = 'test';
    const testManager = new PushToTalkManager();

    const waitPromise = testManager.waitForConfirmation('cmd_test_allow_1', 1000);
    assert.strictEqual(testManager.getPendingCount(), 1, 'Pending count should be 1');

    const confirmed = testManager.__testOnly_simulatePhysicalPress('cmd_test_allow_1');
    assert.strictEqual(confirmed, true, '__testOnly_simulatePhysicalPress must return true');

    const waitResult = await waitPromise;
    assert.strictEqual(waitResult, true, 'waitForConfirmation must resolve to true when physically confirmed in test');
    assert.strictEqual(testManager.getPendingCount(), 0, 'Pending count should be 0 after confirmation');
    console.log('[PASS] Trong NODE_ENV=test: __testOnly_simulatePhysicalPress hoạt động bình thường, xác nhận PTT thành công.\n');

    // ---------------------------------------------------------------------------
    // TEST 2: NODE_ENV=production -> __testOnly_simulatePhysicalPress BỊ CHẶN CỨNG
    // ---------------------------------------------------------------------------
    console.log('--- TEST 2: In NODE_ENV=production -> __testOnly_simulatePhysicalPress() HARD BLOCKED ---');
    process.env.NODE_ENV = 'production';
    const prodManager = new PushToTalkManager();

    // Bắt đầu chờ PTT với thời hạn ngắn 200ms
    const prodWaitPromise = prodManager.waitForConfirmation('cmd_prod_blocked', 200);

    // Kẻ tấn công hoặc code vô tình cố gọi giả lập bấm phím trong production
    let caughtProdError: any = null;
    try {
      prodManager.__testOnly_simulatePhysicalPress('cmd_prod_blocked');
    } catch (err: any) {
      caughtProdError = err;
    }

    assert(caughtProdError !== null, 'Calling __testOnly_simulatePhysicalPress in production MUST throw an error!');
    assert(
      caughtProdError.message.includes(EXPECTED_ERROR_KEYWORD),
      `Error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${caughtProdError?.message}"`
    );
    console.log(`[PASS] Ném ngoại lệ chính xác: "${caughtProdError.message}".`);

    // Xác nhận request PTT KHÔNG bị bypass: chờ hết timeout và kết quả phải là false (bị hủy)
    const prodWaitResult = await prodWaitPromise;
    assert.strictEqual(
      prodWaitResult,
      false,
      'PTT MUST NOT be bypassed in production! It must timeout and reject.'
    );
    console.log('[PASS] Xác minh an toàn: PTT KHÔNG bị bypass trong production, lệnh bị hủy khi hết timeout.\n');

    // ---------------------------------------------------------------------------
    // TEST 3: NODE_ENV=development -> __testOnly_simulatePhysicalPress BỊ CHẶN CỨNG
    // ---------------------------------------------------------------------------
    console.log('--- TEST 3: In NODE_ENV=development -> __testOnly_simulatePhysicalPress() HARD BLOCKED ---');
    process.env.NODE_ENV = 'development';
    const devManager = new PushToTalkManager();

    const devWaitPromise = devManager.waitForConfirmation('cmd_dev_blocked', 200);

    let caughtDevError: any = null;
    try {
      devManager.__testOnly_simulatePhysicalPress('cmd_dev_blocked');
    } catch (err: any) {
      caughtDevError = err;
    }

    assert(caughtDevError !== null, 'Calling __testOnly_simulatePhysicalPress in development MUST throw an error!');
    assert(
      caughtDevError.message.includes(EXPECTED_ERROR_KEYWORD),
      `Error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${caughtDevError?.message}"`
    );
    console.log(`[PASS] Ném ngoại lệ chính xác trong dev: "${caughtDevError.message}".`);

    const devWaitResult = await devWaitPromise;
    assert.strictEqual(devWaitResult, false, 'PTT MUST NOT be bypassed in development!');
    console.log('[PASS] Xác minh an toàn: PTT KHÔNG bị bypass trong development.\n');

    // ---------------------------------------------------------------------------
    // TEST 4: GỌI METHOD CŨ simulatePhysicalPress() -> BỊ KHÓA VÀ NÉM LỖI
    // ---------------------------------------------------------------------------
    console.log('--- TEST 4: Calling legacy simulatePhysicalPress() -> LOCKED & THROWS ---');
    let legacyError: any = null;
    try {
      prodManager.simulatePhysicalPress('cmd_legacy_test');
    } catch (err: any) {
      legacyError = err;
    }

    assert(legacyError !== null, 'Legacy simulatePhysicalPress() MUST throw error');
    assert(
      legacyError.message.includes(EXPECTED_ERROR_KEYWORD),
      `Legacy error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${legacyError?.message}"`
    );
    console.log(`[PASS] Method cũ simulatePhysicalPress() bị khóa vĩnh viễn: "${legacyError.message}".\n`);

    // ---------------------------------------------------------------------------
    // TEST 5: TestOnlyPushToTalkController CHỈ HOẠT ĐỘNG TRONG NODE_ENV=test
    // ---------------------------------------------------------------------------
    console.log('--- TEST 5: TestOnlyPushToTalkController operates ONLY in NODE_ENV=test ---');
    const isolatedManager = new PushToTalkManager();
    const controller = new TestOnlyPushToTalkController(isolatedManager);

    // 5a. Trong production -> bị chặn
    process.env.NODE_ENV = 'production';
    assert.throws(
      () => controller.simulatePhysicalPress('cmd_ctrl_prod'),
      (err: any) => err.message.includes(EXPECTED_ERROR_KEYWORD),
      'controller.simulatePhysicalPress must throw in production'
    );
    console.log('[PASS] TestOnlyPushToTalkController bị chặn cứng trong production.');

    // 5b. Trong test -> hoạt động
    process.env.NODE_ENV = 'test';
    const ctrlWaitPromise = isolatedManager.waitForConfirmation('cmd_ctrl_test', 1000);
    const ctrlRes = controller.simulatePhysicalPress('cmd_ctrl_test');
    assert.strictEqual(ctrlRes, true, 'controller.simulatePhysicalPress must succeed in test');
    const ctrlWaitRes = await ctrlWaitPromise;
    assert.strictEqual(ctrlWaitRes, true, 'PTT must be confirmed via controller in test');
    console.log('[PASS] TestOnlyPushToTalkController hoạt động bình thường trong NODE_ENV=test.\n');

    // ---------------------------------------------------------------------------
    // TEST 6: RÀ SOÁT HỆ THỐNG: simulatedTranscript & audioBufferOverride TRONG VoicePipeline
    // ---------------------------------------------------------------------------
    console.log('--- TEST 6: VoicePipeline defense-in-depth: simulated options blocked outside test ---');
    process.env.NODE_ENV = 'production';
    const pipeline = new VoicePipeline();

    // Giả lập gọi pipeline với simulatedTranscript trong production
    let pipelineTranscriptError: any = null;
    try {
      await pipeline.executeVoiceRoundtrip({
        bodyId: 'test_body_id',
        simulatedTranscript: 'Hacking simulated transcript into production',
      });
    } catch (err: any) {
      pipelineTranscriptError = err;
    }

    assert(pipelineTranscriptError !== null, 'VoicePipeline with simulatedTranscript in production MUST throw');
    assert(
      pipelineTranscriptError.message.includes(EXPECTED_ERROR_KEYWORD),
      `Pipeline error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${pipelineTranscriptError?.message}"`
    );
    console.log(`[PASS] VoicePipeline chặn simulatedTranscript trong production: "${pipelineTranscriptError.message}".`);

    // Giả lập gọi pipeline với audioBufferOverride trong production
    let pipelineAudioError: any = null;
    try {
      await pipeline.executeVoiceRoundtrip({
        bodyId: 'test_body_id',
        audioBufferOverride: Buffer.from('fake audio buffer'),
      });
    } catch (err: any) {
      pipelineAudioError = err;
    }

    assert(pipelineAudioError !== null, 'VoicePipeline with audioBufferOverride in production MUST throw');
    assert(
      pipelineAudioError.message.includes(EXPECTED_ERROR_KEYWORD),
      `Pipeline audio error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${pipelineAudioError?.message}"`
    );
    console.log(`[PASS] VoicePipeline chặn audioBufferOverride trong production: "${pipelineAudioError.message}".\n`);

    console.log('========================================================================');
    console.log('🎉 TOÀN BỘ 6/6 TEST CASE PTT TEST-ONLY GUARD ĐÃ PASS 100%!');
    console.log('========================================================================');
  } finally {
    process.env.NODE_ENV = savedNodeEnv;
  }
}

runPushToTalkGuardTests().catch((err) => {
  console.error('❌ PushToTalk Guard Test FAILED:', err);
  process.exit(1);
});
