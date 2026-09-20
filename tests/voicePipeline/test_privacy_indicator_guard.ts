// tests/voicePipeline/test_privacy_indicator_guard.ts
// BOWCON V4.0 — PROMPT #1 (C3): HARD PRIVACY INDICATOR PREREQUISITE TEST SUITE
//
// EN:
// Verifies 3 critical security requirements:
// 1. Indicator script missing / invalid path -> start() returns started: false, audio.capture REJECTED with PRIVACY_INDICATOR_UNAVAILABLE. No audio captured.
// 2. Indicator starts successfully, then sudden process crash/exit -> internal status immediately unready -> next audio.capture REJECTED.
// 3. Explicit override BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true -> capture allowed when indicator is unavailable, BUT security WARNING logged every time.
//
// VI:
// Xác minh 3 yêu cầu an toàn bắt buộc:
// 1. Script indicator không tồn tại (đường dẫn sai) -> start() trả về started: false, audio.capture bị CHẶN với lỗi PRIVACY_INDICATOR_UNAVAILABLE, không có audio nào được ghi.
// 2. Indicator khởi động thành công, sau đó process bị exit/crash đột ngột -> trạng thái nội bộ lập tức không khả dụng -> lệnh audio.capture tiếp theo bị CHẶN.
// 3. Cấu hình rõ ràng BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true -> cho phép capture dù indicator lỗi, NHƯNG phải ghi log CẢNH BÁO an ninh mỗi lần capture.

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { VisualPrivacyIndicator } from '../../bodies/desktop/privacyIndicator.js';
import { DesktopAudioDriver } from '../../bodies/desktop/audioDriver.js';
import { DesktopBodyRunner } from '../../bodies/desktop/index.js';

const EXPECTED_ERROR_KEYWORD = 'PRIVACY_INDICATOR_UNAVAILABLE';
const EXPECTED_ERROR_FULL = 'PRIVACY_INDICATOR_UNAVAILABLE — không thể xác nhận chỉ báo vật lý đang hoạt động, từ chối thu âm để bảo vệ quyền riêng tư.';

async function runPrivacyIndicatorGuardTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🛡️  BẮT ĐẦU TEST SUITE PROMPT #1 (C3): PRIVACY INDICATOR HARD PREREQUISITE');
  console.log('========================================================================\n');

  // Đảm bảo không có cờ bypass mặc định
  delete process.env.BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR;
  // Tạm tắt PTT để tập trung kiểm thử lớp bảo vệ PrivacyIndicator
  process.env.REQUIRE_PUSH_TO_TALK = 'false';

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: SCRIPT INDICATOR KHÔNG TỒN TẠI (ĐƯỜNG DẪN SAI) -> CHẶN CAPTURE
    // ---------------------------------------------------------------------------
    console.log('--- TEST 1: Indicator script missing / invalid path -> HARD REJECT ---');
    const fakeScriptPath = path.resolve(process.cwd(), 'scripts', 'non_existent_tray_indicator_test.ps1');
    assert.strictEqual(fs.existsSync(fakeScriptPath), false, 'Fake script path must not exist');

    const badIndicator = new VisualPrivacyIndicator(fakeScriptPath);
    const startResult = await badIndicator.start();

    assert.strictEqual(startResult.started, false, 'start() must return started: false when script missing');
    assert(startResult.error !== undefined, 'start() must return error description');
    assert(startResult.error.includes('INDICATOR_SCRIPT_NOT_FOUND') || startResult.error.includes('UNSUPPORTED_PLATFORM'),
      `Error should indicate missing script or unsupported platform: ${startResult.error}`);
    assert.strictEqual(badIndicator.isReady(), false, 'isReady() must be false when indicator failed to start');
    console.log(`[PASS] VisualPrivacyIndicator.start() trả về started: false, lỗi: "${startResult.error}".`);

    // Gắn badIndicator vào driver và thử recordAudio()
    const testDriver = new DesktopAudioDriver(badIndicator);
    let beepHistory: string[] = [];
    testDriver.onPrivacyBeep = (type) => beepHistory.push(type);

    let caughtError: any = null;
    try {
      await testDriver.recordAudio({ durationMs: 500 });
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'recordAudio() MUST throw when indicator is not ready!');
    assert(
      caughtError.message.includes(EXPECTED_ERROR_KEYWORD),
      `Error message must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${caughtError?.message}"`
    );
    assert.strictEqual(caughtError.message, EXPECTED_ERROR_FULL, `Error message must match exact spec requirement`);
    assert.deepStrictEqual(beepHistory, [], 'No privacy beep should be emitted when capture was blocked before start');
    console.log(`[PASS] audioDriver.recordAudio() bị từ chối với đúng thông điệp: "${caughtError.message}".`);

    // Kiểm tra thêm qua DesktopBodyRunner.handleCommand
    const runner = new DesktopBodyRunner('ws://127.0.0.1:9999/ws/body', 'test_runner_node', 'dummy_psk');
    // Gắn badIndicator vào runner desktopAudioDriver
    const runnerAudioDriver = (runner as any).desktopAudioDriver || testDriver;
    runnerAudioDriver.setPrivacyIndicator(badIndicator);

    const bodyCmdResult = await runner.handleCommand({
      commandId: 'cmd_indicator_missing_test',
      bodyId: 'test_runner_node',
      capability: 'audio.capture',
      params: { durationMs: 500 },
    });

    assert.strictEqual(bodyCmdResult.success, false, 'handleCommand must return success: false');
    assert(
      bodyCmdResult.error?.includes(EXPECTED_ERROR_KEYWORD),
      `Returned command error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${bodyCmdResult.error}"`
    );
    assert.strictEqual(bodyCmdResult.data, undefined, 'No audio data must be returned to Brain');
    console.log(`[PASS] Lệnh audio.capture từ Machine A bị Machine B trả lỗi rõ ràng: "${bodyCmdResult.error}".\n`);

    // ---------------------------------------------------------------------------
    // TEST 2: INDICATOR KHỞI ĐỘNG THÀNH CÔNG, SAU ĐÓ PROCESS EXIT ĐỘT NGỘT -> CHẶN LỆNH SAU
    // ---------------------------------------------------------------------------
    console.log('--- TEST 2: Indicator starts, then process exits unexpectedly -> HARD REJECT ---');
    const validIndicator = new VisualPrivacyIndicator();
    const validStartResult = await validIndicator.start();

    if (process.platform === 'win32') {
      assert.strictEqual(validStartResult.started, true, `Indicator must start successfully on Windows: ${validStartResult.error}`);
      assert.strictEqual(validIndicator.isReady(), true, 'Indicator must be ready initially');
      console.log('[PASS] Indicator đã khởi động thành công với PID:', validIndicator.getChildProcess()?.pid);

      // Giả lập tiến trình PowerShell bị kill hoặc crash đột ngột
      console.log('[SIMULATOR] 💥 Giả lập tiến trình PowerShell indicator bị crash/exit đột ngột...');
      const child = validIndicator.getChildProcess();
      assert(child && child.pid, 'Child process must exist with valid PID');

      const exitPromise = new Promise<void>((resolve) => {
        child.once('exit', () => resolve());
      });
      child.kill(); // Kill process đột ngột
      await exitPromise;
      // Chờ một chút để event loop cập nhật trạng thái
      await new Promise((r) => setTimeout(r, 100));

      // Xác nhận trạng thái nội bộ chuyển ngay về không sẵn sàng
      assert.strictEqual(validIndicator.isReady(), false, 'Indicator must immediately become NOT ready after process exit');
      console.log('[PASS] Hệ thống bắt được sự kiện exit và chuyển isReady() về false ngay lập tức.');

      // Gọi lệnh capture tiếp theo -> PHẢI BỊ TỪ CHỐI
      const driverWithCrashedIndicator = new DesktopAudioDriver(validIndicator);
      let crashCaughtError: any = null;
      try {
        await driverWithCrashedIndicator.recordAudio({ durationMs: 500 });
      } catch (err: any) {
        crashCaughtError = err;
      }

      assert(crashCaughtError !== null, 'Subsequent recordAudio() MUST throw after indicator crash!');
      assert(
        crashCaughtError.message.includes(EXPECTED_ERROR_KEYWORD),
        `Error must contain "${EXPECTED_ERROR_KEYWORD}". Got: "${crashCaughtError?.message}"`
      );
      console.log(`[PASS] Lệnh capture tiếp theo bị từ chối thành công: "${crashCaughtError.message}".\n`);
    } else {
      console.log('[SKIP] Non-Windows platform: Bỏ qua test spawn thật của PowerShell.');
    }

    // ---------------------------------------------------------------------------
    // TEST 3: CÓ BIẾN MÔI TRƯỜNG BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true -> TIẾP TỤC VÀ LOG CẢNH BÁO
    // ---------------------------------------------------------------------------
    console.log('--- TEST 3: BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true -> ALLOW BUT LOG WARNING ---');
    process.env.BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR = 'true';

    // Dùng indicator không sẵn sàng
    assert.strictEqual(badIndicator.isReady(), false, 'Indicator is not ready');
    const driverWithOverride = new DesktopAudioDriver(badIndicator);

    // Spy vào console.warn để bắt log cảnh báo an ninh
    let warningLogged = false;
    let warningMessage = '';
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('CẢNH BÁO AN NINH') && msg.includes('BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true')) {
        warningLogged = true;
        warningMessage = msg;
      }
      originalConsoleWarn(...args);
    };

    try {
      console.log('[TEST 3] Thực hiện recordAudio() với cờ bypass...');
      const captureResult = await driverWithOverride.recordAudio({ durationMs: 500 });

      assert(captureResult !== undefined, 'Capture must return result when override is enabled');
      assert.strictEqual(captureResult.format, 'wav', 'Result format must be wav');
      assert(typeof captureResult.audioBase64 === 'string', 'Result must contain audioBase64 string');
      assert(captureResult.byteLength > 0, 'Result must contain valid byte length');

      assert.strictEqual(warningLogged, true, 'A security WARNING must be logged when capturing without indicator');
      console.log(`[PASS] Thu âm tiếp tục thành công và đã ghi log CẢNH BÁO: "${warningMessage}".`);
    } finally {
      console.warn = originalConsoleWarn;
      delete process.env.BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR;
    }

    // ---------------------------------------------------------------------------
    // TEST 4: SAU KHI XÓA BIẾN MÔI TRƯỜNG -> LỆNH TIẾP THEO LẬP TỨC BỊ CHẶN LẠI
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 4: After removing override env -> IMMEDIATELY BLOCKED AGAIN ---');
    assert.strictEqual(process.env.BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR, undefined);
    let reBlocked = false;
    try {
      await driverWithOverride.recordAudio({ durationMs: 500 });
    } catch (err: any) {
      if (err.message.includes(EXPECTED_ERROR_KEYWORD)) {
        reBlocked = true;
      }
    }
    assert.strictEqual(reBlocked, true, 'Capture must be blocked immediately after override env is removed');
    console.log('[PASS] Thu âm bị chặn lại ngay lập tức khi không còn biến môi trường override.\n');

    console.log('========================================================================');
    console.log('🎉 TOÀN BỘ CÁC TEST CASE PRIVACY INDICATOR HARD PREREQUISITE ĐÃ PASS 100%!');
    console.log('========================================================================');
  } finally {
    delete process.env.BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR;
    delete process.env.REQUIRE_PUSH_TO_TALK;
  }
}

runPrivacyIndicatorGuardTests().catch((err) => {
  console.error('❌ Privacy Indicator Guard Test FAILED:', err);
  process.exit(1);
});
