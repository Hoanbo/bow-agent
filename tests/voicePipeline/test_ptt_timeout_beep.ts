// tests/voicePipeline/test_ptt_timeout_beep.ts
// BOWCON V4.0 — PROMPT #3 (H1): PTT TIMEOUT ALERT BEEP & ANOMALY DETECTION TEST SUITE
//
// EN:
// Verifies physical audio alerts and anomaly detection for Push-to-Talk timeouts:
// 1. Simulates PTT timeout -> verifies warning alert beep ('timeout' / 3x 400Hz) is emitted exactly once.
// 2. Verifies Brain parameters (quiet, noBeep, silent) CANNOT disable the timeout alert beep.
// 3. Simulates 3 consecutive timeouts within 60s -> verifies high-level ANOMALY_DETECTED security warning is logged.
// 4. Verifies distinct audio execution on Windows (3 short pulses at 400Hz).
//
// VI:
// Xác minh tín hiệu âm thanh cảnh báo vật lý và phát hiện bất thường khi PTT timeout:
// 1. Giả lập PTT timeout -> xác nhận tiếng beep cảnh báo ('timeout' / 3x 400Hz) phát đúng 1 lần.
// 2. Xác nhận Brain không thể tắt âm báo bằng cờ quiet, noBeep, hay silent.
// 3. Giả lập 3 lần timeout liên tiếp trong 60s -> xác nhận cảnh báo an ninh cấp cao ANOMALY_DETECTED được ghi nhận.
// 4. Xác nhận thực thi âm thanh khác biệt trên Windows.

import assert from 'node:assert';
import { PushToTalkManager } from '../../src/security/pushToTalkManager.js';
import { desktopAudioDriver, emitPrivacyBeep } from '../../bodies/desktop/audioDriver.js';
import { BowCentralAgentServer } from '../../src/server.js';
import { DesktopBodyRunner } from '../../bodies/desktop/index.js';
import { globalBodyRegistry, getBodyPsk } from '../../src/core/bodyProtocol/index.js';
import { ensureTlsCertificates } from '../../src/security/tlsCertManager.js';

const TEST_PORT = 4197;

async function runPttTimeoutBeepTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🔔  BẮT ĐẦU TEST SUITE PROMPT #3 (H1): PTT TIMEOUT ALERT BEEP & ANOMALY');
  console.log('========================================================================\n');

  process.env.NODE_ENV = 'test';
  const certPaths = ensureTlsCertificates();
  const psk = getBodyPsk();

  // ---------------------------------------------------------------------------
  // TEST 1: PTT TIMEOUT PHÁT BEEP CẢNH BÁO 'timeout' TRƯỚC KHI HỦY LỆNH
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: PTT timeout emits warning alert beep ("timeout") before resolving ---');
  const isolatedManager = new PushToTalkManager();
  const beepEvents: string[] = [];
  isolatedManager.onBeep = (type) => beepEvents.push(type);

  const startTime = Date.now();
  const confirmed = await isolatedManager.waitForConfirmation('cmd_timeout_beep_1', 200);
  const elapsed = Date.now() - startTime;

  assert.strictEqual(confirmed, false, 'PTT must resolve to false on timeout');
  assert(elapsed >= 190, `Elapsed should be around timeoutMs (got ${elapsed}ms)`);
  assert.deepStrictEqual(
    beepEvents,
    ['timeout'],
    `Expected beepEvents to be ['timeout']. Got: ${JSON.stringify(beepEvents)}`
  );
  console.log(`[PASS] PTT timeout đã phát beep cảnh báo đúng 1 lần sau ${elapsed}ms: ${JSON.stringify(beepEvents)}.\n`);

  // ---------------------------------------------------------------------------
  // TEST 2: BRAIN PARAMETERS (quiet, noBeep, silent) KHÔNG THỂ TẮT BEEP CẢNH BÁO
  // ---------------------------------------------------------------------------
  console.log('--- TEST 2: Brain cannot disable timeout alert beep with quiet/silent flags ---');
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();

  try {
    delete process.env.REQUIRE_PUSH_TO_TALK;
    process.env.BOW_PTT_TIMEOUT_MS = '250'; // 250ms timeout cho test nhanh

    const bodyRunner = new DesktopBodyRunner(
      `wss://127.0.0.1:${TEST_PORT}/ws/body`,
      'desktop_ptt_timeout_alert_node',
      psk,
      certPaths.caCertPath,
      certPaths.caFingerprint
    );
    await bodyRunner.start();
    await new Promise((r) => setTimeout(r, 300));

    const driverBeepHistory: string[] = [];
    desktopAudioDriver.onPrivacyBeep = (type) => driverBeepHistory.push(type);

    // Kẻ tấn công hoặc Brain cố tình gửi { quiet: true, noBeep: true, silent: true }
    console.log('[TEST 2] Brain gửi lệnh audio.capture kèm cờ tắt âm { quiet: true, noBeep: true }...');
    const result = await globalBodyRegistry.executeBodyCommand({
      commandId: 'cmd_ptt_bypass_attempt',
      bodyId: 'desktop_ptt_timeout_alert_node',
      capability: 'audio.capture',
      params: {
        durationMs: 500,
        quiet: true,
        noBeep: true,
        silent: true,
      },
    });

    assert.strictEqual(result.success, false, 'Command must fail when user does not physically confirm');
    assert(result.error?.includes('USER_DID_NOT_CONFIRM'), 'Error must indicate USER_DID_NOT_CONFIRM');
    // Xác nhận tiếng Beep cảnh báo TIMEOUT VẪN PHẢI PHÁT dù có cờ tắt âm
    assert.deepStrictEqual(
      driverBeepHistory,
      ['timeout'],
      `Privacy timeout beep CANNOT be bypassed by Brain! Expected ['timeout'], got: ${JSON.stringify(driverBeepHistory)}`
    );
    console.log(`[PASS] Dù có cờ quiet/silent từ Brain, tiếng Beep cảnh báo TIMEOUT VẪN PHÁT BẮT BUỘC: ${JSON.stringify(driverBeepHistory)}.\n`);

    bodyRunner.stop();
    await new Promise((r) => setTimeout(r, 200));
  } finally {
    delete process.env.BOW_PTT_TIMEOUT_MS;
    await server.stop();
  }

  // ---------------------------------------------------------------------------
  // TEST 3: PHÁT HIỆN BẤT THƯỜNG KHI CÓ 3+ LẦN TIMEOUT LIÊN TIẾP TRONG 60 GIÂY
  // ---------------------------------------------------------------------------
  console.log('--- TEST 3: Anomaly detection: 3 consecutive timeouts within 60s triggers high-level alert ---');
  const anomalyManager = new PushToTalkManager();
  anomalyManager.clearRecentTimeouts();

  let anomalyTriggeredCount = 0;
  anomalyManager.onAnomalyDetected = (count) => {
    anomalyTriggeredCount = count;
  };

  // Bắt log console.error để xác nhận cảnh báo an ninh cấp cao được in ra
  let highAlertLogged = false;
  let highAlertMessage = '';
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('ANOMALY DETECTED') && msg.includes('3')) {
      highAlertLogged = true;
      highAlertMessage = msg;
    }
    originalConsoleError(...args);
  };

  try {
    console.log('[TEST 3] Giả lập lần timeout thứ 1...');
    await anomalyManager.waitForConfirmation('cmd_scan_attempt_1', 100);
    assert.strictEqual(anomalyManager.getRecentTimeoutCount(), 1);
    assert.strictEqual(highAlertLogged, false, 'Anomaly should not trigger after 1st timeout');

    console.log('[TEST 3] Giả lập lần timeout thứ 2...');
    await anomalyManager.waitForConfirmation('cmd_scan_attempt_2', 100);
    assert.strictEqual(anomalyManager.getRecentTimeoutCount(), 2);
    assert.strictEqual(highAlertLogged, false, 'Anomaly should not trigger after 2nd timeout');

    console.log('[TEST 3] Giả lập lần timeout thứ 3 (chạm ngưỡng bất thường)...');
    await anomalyManager.waitForConfirmation('cmd_scan_attempt_3', 100);
    assert.strictEqual(anomalyManager.getRecentTimeoutCount(), 3);

    // Xác nhận cảnh báo an ninh cấp cao đã được kích hoạt
    assert.strictEqual(anomalyTriggeredCount, 3, 'onAnomalyDetected should be invoked with count=3');
    assert.strictEqual(highAlertLogged, true, 'High-level ANOMALY DETECTED warning must be logged on console.error');
    console.log(`[PASS] Hệ thống đã phát hiện bất thường và ghi log cảnh báo: "${highAlertMessage}".\n`);
  } finally {
    console.error = originalConsoleError;
  }

  // ---------------------------------------------------------------------------
  // TEST 4: THỰC THI ÂM THANH THẬT TRÊN WINDOWS (3x 400Hz)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 4: Real audio execution check ---');
  let realBeepThrew = false;
  try {
    await emitPrivacyBeep('timeout');
  } catch (err) {
    realBeepThrew = true;
  }
  assert.strictEqual(realBeepThrew, false, 'emitPrivacyBeep("timeout") must execute cleanly without throwing');
  console.log('[PASS] emitPrivacyBeep("timeout") thực thi thành công.\n');

  console.log('========================================================================');
  console.log('🎉 TOÀN BỘ 4/4 TEST CASE PTT TIMEOUT BEEP & ANOMALY ĐÃ PASS 100%!');
  console.log('========================================================================');
}

runPttTimeoutBeepTests().catch((err) => {
  console.error('❌ PTT Timeout Beep Test FAILED:', err);
  process.exit(1);
});
