// tests/voicePipeline/test_ptt_and_beep_indicator.ts
// BOWCON V4.0 — PROMPT #3: PHYSICAL PRIVACY BEEP & PUSH-TO-TALK (PTT) TEST SUITE
//
// Xác minh 5 yêu cầu an toàn quyền riêng tư vật lý:
// 1. Mặc định REQUIRE_PUSH_TO_TALK luôn BẬT (an toàn nhất).
// 2. Khi PTT bật: không có xác nhận vật lý trong N giây -> lệnh bị hủy, trả về USER_DID_NOT_CONFIRM, không có audio.
// 3. Khi PTT bật và có xác nhận vật lý -> thực thi bình thường và phát Beep đúng thời điểm bắt đầu/kết thúc.
// 4. Khi PTT tắt (REQUIRE_PUSH_TO_TALK=false) -> lệnh tự động chạy, NHƯNG Beep vẫn luôn phát (Brain không thể tắt).
// 5. Chính sách PDP tự động phân loại đúng (PTT bật: không cần approval; PTT tắt: HIGH_IMPACT bắt buộc approval).

import assert from 'node:assert';
import fs from 'node:fs';
import { BowCentralAgentServer } from '../../src/server.js';
import { DesktopBodyRunner } from '../../bodies/desktop/index.js';
import { desktopAudioDriver } from '../../bodies/desktop/audioDriver.js';
import { globalPushToTalkManager, isPushToTalkEnabled } from '../../src/security/pushToTalkManager.js';
import { getAudioCapabilityRiskLevel, getAudioActionClassification } from '../../src/core/policyClassification.js';
import { globalBodyRegistry, getBodyPsk } from '../../src/core/bodyProtocol/index.js';
import { ensureTlsCertificates } from '../../src/security/tlsCertManager.js';

const TEST_PORT = 4198;

async function runPttAndBeepTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🎙️  BẮT ĐẦU TEST SUITE PROMPT #3: PHYSICAL BEEP & PUSH-TO-TALK (PTT)');
  console.log('========================================================================\n');

  // Đảm bảo môi trường test được cấu hình rõ ràng
  process.env.NODE_ENV = 'test';

  // Đảm bảo chứng chỉ TLS hợp lệ
  const certPaths = ensureTlsCertificates();
  const psk = getBodyPsk();

  // ---------------------------------------------------------------------------
  // TEST 1: KIỂM TRA MẶC ĐỊNH AN TOÀN VÀ PHÂN LOẠI CHÍNH SÁCH PDP
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Default configuration & PDP classification check ---');
  delete process.env.REQUIRE_PUSH_TO_TALK;
  delete process.env.BOW_REQUIRE_PUSH_TO_TALK;

  assert.strictEqual(isPushToTalkEnabled(), true, 'REQUIRE_PUSH_TO_TALK must be TRUE by default');
  console.log('[PASS] REQUIRE_PUSH_TO_TALK mặc định là TRUE (bật an toàn cao nhất).');

  const riskWhenPttOn = getAudioCapabilityRiskLevel('audio.capture');
  const classWhenPttOn = getAudioActionClassification('audio.capture');
  assert.strictEqual(riskWhenPttOn, 'medium', 'When PTT is ON, audio.capture risk is medium');
  assert.strictEqual(classWhenPttOn, 'REVERSIBLE', 'When PTT is ON, audio.capture action is REVERSIBLE');
  console.log('[PASS] Khi PTT BẬT: PDP phân loại REVERSIBLE (không đòi hỏi approval token thừa vì đã có xác nhận vật lý).');

  // Thử khi PTT tắt
  process.env.REQUIRE_PUSH_TO_TALK = 'false';
  assert.strictEqual(isPushToTalkEnabled(), false, 'REQUIRE_PUSH_TO_TALK is false when explicitly configured');
  const riskWhenPttOff = getAudioCapabilityRiskLevel('audio.capture');
  const classWhenPttOff = getAudioActionClassification('audio.capture');
  assert.strictEqual(riskWhenPttOff, 'high', 'When PTT is OFF, audio.capture risk is high');
  assert.strictEqual(classWhenPttOff, 'HIGH_IMPACT', 'When PTT is OFF, audio.capture action is HIGH_IMPACT');
  console.log('[PASS] Khi PTT TẮT: PDP giữ nguyên HIGH_IMPACT bắt buộc qua phê duyệt như Giai đoạn 1.\n');

  // Khôi phục PTT = true cho các test tiếp theo
  delete process.env.REQUIRE_PUSH_TO_TALK;
  process.env.BOW_PTT_TIMEOUT_MS = '1000'; // 1000ms cho test chạy nhanh

  // Khởi động server
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  console.log(`[TEST-INIT] Central Brain Server đã sẵn sàng trên cổng ${TEST_PORT} (WSS/TLS).\n`);

  try {
    // ---------------------------------------------------------------------------
    // TEST 2: PTT BẬT & NGƯỜI DÙNG KHÔNG BẤM PHÍM TRONG N GIÂY -> HỦY LỆNH
    // ---------------------------------------------------------------------------
    console.log('--- TEST 2: PTT Enabled + No physical key press within timeout -> ABORT ---');
    const pttBodyRunner = new DesktopBodyRunner(
      `wss://127.0.0.1:${TEST_PORT}/ws/body`,
      'desktop_ptt_timeout_node',
      psk,
      certPaths.caCertPath,
      certPaths.caFingerprint
    );
    await pttBodyRunner.start();
    await new Promise((r) => setTimeout(r, 300));

    // Theo dõi tiếng beep: nếu hủy lệnh do không xác nhận vật lý, KHÔNG ĐƯỢC phát beep thu âm
    const timeoutBeepHistory: string[] = [];
    desktopAudioDriver.onPrivacyBeep = (type) => timeoutBeepHistory.push(type);

    console.log('[TEST 2] Brain gửi lệnh "audio.capture" xuống Machine B...');
    const startTime = Date.now();
    const resultTimeout = await globalBodyRegistry.executeBodyCommand({
      commandId: 'cmd_ptt_timeout_test',
      bodyId: 'desktop_ptt_timeout_node',
      capability: 'audio.capture',
      params: { durationMs: 1000 },
    });
    const elapsed = Date.now() - startTime;

    assert.strictEqual(resultTimeout.success, false, 'Command MUST fail when user does not confirm PTT');
    assert(
      resultTimeout.error?.includes('USER_DID_NOT_CONFIRM'),
      `Error must contain USER_DID_NOT_CONFIRM. Got: ${resultTimeout.error}`
    );
    assert.strictEqual(resultTimeout.data, undefined, 'No audio data must be returned on timeout');
    assert.deepStrictEqual(
      timeoutBeepHistory,
      ['timeout'],
      'PTT timeout MUST emit alert beep ("timeout"), and MUST NEVER emit capture beeps ("start", "stop")'
    );
    console.log(`[PASS] Lệnh bị hủy chính xác sau ${elapsed}ms và đã phát beep cảnh báo timeout: ${JSON.stringify(timeoutBeepHistory)}.\n`);

    pttBodyRunner.stop();
    await new Promise((r) => setTimeout(r, 200));

    // ---------------------------------------------------------------------------
    // TEST 3: PTT BẬT & CÓ BẤM PHÍM XÁC NHẬN VẬT LÝ -> THU ÂM & PHÁT BEEP ĐẦY ĐỦ
    // ---------------------------------------------------------------------------
    console.log('--- TEST 3: PTT Enabled + Physical key press confirmed -> SUCCESS & BEEP ---');
    const pttSuccessRunner = new DesktopBodyRunner(
      `wss://127.0.0.1:${TEST_PORT}/ws/body`,
      'desktop_ptt_success_node',
      psk,
      certPaths.caCertPath,
      certPaths.caFingerprint
    );
    await pttSuccessRunner.start();
    await new Promise((r) => setTimeout(r, 300));

    const confirmedBeepHistory: string[] = [];
    desktopAudioDriver.onPrivacyBeep = (type) => confirmedBeepHistory.push(type);

    const cmdPromise = globalBodyRegistry.executeBodyCommand({
      commandId: 'cmd_ptt_confirmed_test',
      bodyId: 'desktop_ptt_success_node',
      capability: 'audio.capture',
      params: { durationMs: 800 },
    });

    // Giả lập người dùng bấm phím sau 200ms
    setTimeout(() => {
      console.log('[SIMULATOR] 🔘 Người dùng bấm phím vật lý [Ctrl+Alt+Space] trên bàn phím Machine B!');
      globalPushToTalkManager.__testOnly_simulatePhysicalPress('cmd_ptt_confirmed_test');
    }, 200);

    const resultSuccess = await cmdPromise;

    assert.strictEqual(resultSuccess.success, true, 'Command MUST succeed after physical confirmation');
    assert(resultSuccess.data !== undefined, 'Audio capture data must be returned');
    const captureData = resultSuccess.data as any;
    assert.strictEqual(captureData.format, 'wav', 'Format must be wav');
    assert(typeof captureData.audioBase64 === 'string', 'audioBase64 string must be present');
    assert(captureData.audioBase64.length > 100, 'Audio base64 must contain real recorded bytes');

    // Xác nhận Beep đã được gọi đúng thời điểm bắt đầu và kết thúc
    assert.deepStrictEqual(
      confirmedBeepHistory,
      ['start', 'stop'],
      `Privacy beep must trigger ['start', 'stop']. Got: ${JSON.stringify(confirmedBeepHistory)}`
    );
    console.log(`[PASS] Thu âm thành công qua PTT! Đã phát Beep đúng chuẩn: ${JSON.stringify(confirmedBeepHistory)}.`);
    console.log(`[PASS] Audio buffer nhận được: ${captureData.byteLength} bytes.\n`);

    pttSuccessRunner.stop();
    await new Promise((r) => setTimeout(r, 200));

    // ---------------------------------------------------------------------------
    // TEST 4: PTT TẮT (REQUIRE_PUSH_TO_TALK=false) -> VẪN BẮT BUỘC PHÁT BEEP
    // ---------------------------------------------------------------------------
    console.log('--- TEST 4: PTT Disabled -> Audio records automatically BUT BEEP IS MANDATORY ---');
    process.env.REQUIRE_PUSH_TO_TALK = 'false';

    const pttDisabledRunner = new DesktopBodyRunner(
      `wss://127.0.0.1:${TEST_PORT}/ws/body`,
      'desktop_ptt_disabled_node',
      psk,
      certPaths.caCertPath,
      certPaths.caFingerprint
    );
    await pttDisabledRunner.start();
    await new Promise((r) => setTimeout(r, 300));

    const noPttBeepHistory: string[] = [];
    desktopAudioDriver.onPrivacyBeep = (type) => noPttBeepHistory.push(type);

    // Kẻ tấn công hoặc Brain cố tình gửi tham số { quiet: true, noBeep: true } để tắt beep
    const resultNoPtt = await globalBodyRegistry.executeBodyCommand({
      commandId: 'cmd_ptt_disabled_test',
      bodyId: 'desktop_ptt_disabled_node',
      capability: 'audio.capture',
      params: {
        durationMs: 800,
        quiet: true,
        noBeep: true,
        silent: true,
      },
    });

    assert.strictEqual(resultNoPtt.success, true, 'Capture must execute when PTT is disabled');
    // Xác nhận tiếng Beep VẪN PHẢI PHÁT dù PTT tắt và dù có cờ quiet/silent
    assert.deepStrictEqual(
      noPttBeepHistory,
      ['start', 'stop'],
      'Privacy beep MUST NEVER be bypassable by Brain parameters!'
    );
    console.log(`[PASS] Dù PTT tắt và Brain gửi cờ silent/quiet, tiếng Beep VẪN PHÁT BẮT BUỘC: ${JSON.stringify(noPttBeepHistory)}!\n`);

    pttDisabledRunner.stop();

    console.log('========================================================================');
    console.log('🎉 TOÀN BỘ 4/4 TEST CASE PHYSICAL BEEP & PUSH-TO-TALK ĐÃ PASS 100%!');
    console.log('========================================================================');
  } finally {
    delete process.env.REQUIRE_PUSH_TO_TALK;
    delete process.env.BOW_PTT_TIMEOUT_MS;
    await server.stop();
  }
}

runPttAndBeepTests().catch((err) => {
  console.error('❌ PTT & Beep Hardening Test FAILED:', err);
  process.exit(1);
});
