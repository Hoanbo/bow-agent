// tests/voicePipeline/test_tts_wav_cleanup.ts
// BOWCON V4.0 — PROMPT #4 (M3): TTS WAV LIFECYCLE & CLEANUP VERIFICATION
//
// EN:
// Verifies complete lifecycle of temporary TTS WAV files:
// 1. TC1: audio.play fails (body offline, device busy, PDP rejected) -> TTS WAV is STILL deleted in finally block.
// 2. TC2: audio.play succeeds (normal flow) -> TTS WAV is properly deleted (regression check).
// 3. TC3: Simulated hard crash (SIGKILL mid-flight) -> Leftover stale Piper WAV is cleaned up on Body restart / cleanupStaleTempFiles().
// 4. TC4: Active in-flight files (< 5 min old) are NOT deleted prematurely by cleanupStaleTempFiles().
// 5. TC5: Deletion in finally is idempotent and safe against race conditions (never throws ENOENT or crashes process).
//
// VI:
// Kiểm thử toàn diện vòng đời tệp WAV tạm của Piper TTS:
// 1. TC1: audio.play thất bại -> file WAV của TTS VẪN BỊ XÓA trong khối finally.
// 2. TC2: audio.play thành công -> file WAV của TTS được xóa đúng như trước (hồi quy).
// 3. TC3: Giả lập crash cứng (SIGKILL giữa chừng) -> file Piper tồn đọng được dọn sạch khi Body khởi động lại.
// 4. TC4: File đang hoạt động (< 5 phút) không bị xóa nhầm bởi cleanupStaleTempFiles().
// 5. TC5: Lệnh xóa trong finally an toàn tuyệt đối (không throw ENOENT hay làm crash tiến trình).

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { VoicePipeline } from '../../src/speech/voicePipeline.js';
import { DesktopAudioDriver, cleanupStaleTempFiles } from '../../bodies/desktop/audioDriver.js';
import type { BodyRegistry } from '../../src/core/bodyProtocol/bodyRegistry.js';
import type { BodyCommand, BodyCommandResult } from '../../src/core/bodyProtocol/types.js';

// Bắt buộc môi trường test để cho phép mock & simulatedTranscript
process.env.NODE_ENV = 'test';

async function runTtsWavCleanupTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🧹 BẮT ĐẦU TEST SUITE PROMPT #4 (M3): TTS WAV FILE CLEANUP VERIFICATION');
  console.log('========================================================================\n');

  const tempAudioDir = path.resolve('.tmp/audio');
  if (!fs.existsSync(tempAudioDir)) {
    fs.mkdirSync(tempAudioDir, { recursive: true });
  }

  let testsPassed = 0;
  let testsFailed = 0;

  async function testStep(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      console.log(`--- ${name} ---`);
      await fn();
      console.log(`  -> [PASS] ${name}\n`);
      testsPassed++;
    } catch (err: any) {
      console.error(`  -> [FAIL] ${name}:`, err.message || err);
      testsFailed++;
      throw err;
    }
  }

  // Helper: tạo mock BodyRegistry
  function createMockBodyRegistry(playResult: { success: boolean; error?: string; data?: any }) {
    return {
      findBodiesWithCapability: (cap: string) => [{ bodyId: 'mock_desktop_body' }],
      getAllActiveBodies: () => [{ bodyId: 'mock_desktop_body' }],
      getBody: (id: string) => ({
        bodyId: id,
        name: 'Mock Body',
        capabilities: new Map([
          ['audio.capture', {}],
          ['audio.play', {}],
        ]),
      }),
      executeBodyCommand: async (cmd: BodyCommand): Promise<BodyCommandResult> => {
        if (cmd.capability === 'audio.capture') {
          return {
            commandId: cmd.commandId,
            success: true,
            data: {
              audioBase64: Buffer.from('RIFF mock wav capture data').toString('base64'),
              format: 'wav',
              sampleRate: 16000,
              channels: 1,
              byteLength: 28,
            },
          };
        }
        if (cmd.capability === 'audio.play') {
          return {
            commandId: cmd.commandId,
            success: playResult.success,
            error: playResult.error,
            data: playResult.data || { deviceName: 'Mock Speakers' },
          };
        }
        return {
          commandId: cmd.commandId,
          success: true,
        };
      },
    } as unknown as BodyRegistry;
  }

  // Helper: tạo mock PiperTtsEngine sinh file WAV thật trên đĩa để kiểm chứng việc xóa
  function createMockPiperTts() {
    let lastGeneratedFilePath: string | undefined;

    return {
      getLastGeneratedFilePath: () => lastGeneratedFilePath,
      synthesize: async (text: string, options: any = {}) => {
        const uniqueId = crypto.randomBytes(4).toString('hex');
        const wavPath = path.join(tempAudioDir, `piper_mock_${Date.now()}_${uniqueId}.wav`);
        // Ghi file WAV giả lập hợp lệ
        fs.writeFileSync(wavPath, Buffer.from('RIFF mock piper synthesized speech audio'));
        lastGeneratedFilePath = wavPath;

        return {
          success: true,
          audioBase64: Buffer.from('mock base64 audio').toString('base64'),
          wavFilePath: wavPath,
          byteLength: 40,
          sampleRate: 22050,
          durationMs: 150,
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // TEST 1: audio.play thất bại -> TTS WAV file vẫn phải bị xóa trong finally
  // ---------------------------------------------------------------------------
  await testStep('TC1: audio.play thất bại -> TTS WAV file vẫn phải bị xóa sạch', async () => {
    const mockRegistry = createMockBodyRegistry({
      success: false,
      error: 'SPEAKER_DEVICE_DISCONNECTED: Hardware output unavailable',
    });
    const mockPiper = createMockPiperTts();

    const pipeline = new VoicePipeline(
      mockRegistry,
      undefined,
      undefined,
      undefined,
      mockPiper as any
    );

    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_desktop_body',
      simulatedTranscript: 'Kiểm tra dọn dẹp âm thanh khi phát lỗi',
      userId: 'test_user',
      role: 'owner',
      isOwner: true,
    });

    const generatedFile = mockPiper.getLastGeneratedFilePath();
    assert(generatedFile, 'Piper must have generated a temporary WAV file');
    console.log(`  File TTS tạm sinh ra: ${generatedFile}`);

    // Pipeline phải báo lỗi playback fail
    assert.strictEqual(result.success, false, 'Voice roundtrip must report failure when audio.play fails');
    assert(
      result.error && result.error.includes('AUDIO_PLAY_FAILED'),
      `Error must reflect playback failure: ${result.error}`
    );

    // KIỂM CHỨNG CỐT LÕI: File WAV tạm PHẢI KHÔNG CÒN TỒN TẠI trên đĩa
    const fileExistsAfterError = fs.existsSync(generatedFile);
    assert.strictEqual(
      fileExistsAfterError,
      false,
      `VULNERABILITY DETECTED: TTS WAV file still exists at ${generatedFile} after playback failed!`
    );
    console.log('  -> File TTS WAV đã được dọn dẹp sạch sẽ trong khối finally (không sót lại trên đĩa).');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: audio.play thành công -> TTS WAV file được xóa bình thường (Hồi quy)
  // ---------------------------------------------------------------------------
  await testStep('TC2: audio.play thành công -> TTS WAV file được xóa đúng chuẩn', async () => {
    const mockRegistry = createMockBodyRegistry({
      success: true,
      data: { deviceName: 'Realtek Audio Speakers' },
    });
    const mockPiper = createMockPiperTts();

    const pipeline = new VoicePipeline(
      mockRegistry,
      undefined,
      undefined,
      undefined,
      mockPiper as any
    );

    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_desktop_body',
      simulatedTranscript: 'Xin chào thế giới',
      userId: 'test_user',
      role: 'owner',
      isOwner: true,
    });

    const generatedFile = mockPiper.getLastGeneratedFilePath();
    assert(generatedFile, 'Piper must have generated a temporary WAV file');

    assert.strictEqual(result.success, true, 'Voice roundtrip must succeed');
    assert.strictEqual(fs.existsSync(generatedFile), false, 'TTS WAV file must be cleaned up on success');
    console.log('  -> Luồng thành công bình thường vẫn dọn dẹp file WAV đúng như cam kết.');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Giả lập crash cứng (SIGKILL giữa chừng) -> cleanupStaleTempFiles() dọn sạch
  // ---------------------------------------------------------------------------
  await testStep('TC3: Crash cứng giữa chừng -> cleanupStaleTempFiles() quét và xóa sạch', async () => {
    // 3A: Giả lập khởi động lại Body -> Constructor DesktopAudioDriver tự động dọn dẹp
    const staleFileName = `piper_crash_leftover_${Date.now()}.wav`;
    const staleFilePath = path.join(tempAudioDir, staleFileName);
    fs.writeFileSync(staleFilePath, Buffer.from('RIFF stale leftover audio from killed process'));

    assert.strictEqual(fs.existsSync(staleFilePath), true, 'Stale file must exist before cleanup');

    // Chỉnh sửa mtime về 10 phút trước (> 5 phút threshold)
    const tenMinutesAgoSec = (Date.now() - 10 * 60 * 1000) / 1000;
    fs.utimesSync(staleFilePath, tenMinutesAgoSec, tenMinutesAgoSec);
    console.log(`  [3A] File tồn đọng giả lập 1: ${staleFilePath} (mtime: 10 phút trước)`);

    // Khởi tạo DesktopAudioDriver mới (giả lập Body khởi động lại)
    const restartedDriver = new DesktopAudioDriver();

    // File tồn đọng phải bị xóa ngay lập tức trong constructor
    assert.strictEqual(
      fs.existsSync(staleFilePath),
      false,
      `VULNERABILITY DETECTED: Leftover Piper TTS WAV file was not cleaned up on Body constructor start!`
    );
    console.log('  -> [3A] Constructor DesktopAudioDriver đã tự động xóa sạch file tồn đọng khi Body khởi động lại.');

    // 3B: Kiểm tra hàm cleanupStaleTempFiles() gọi thủ công trả về đúng số file đã xóa
    const secondStalePath = path.join(tempAudioDir, `piper_crash_leftover_manual_${Date.now()}.wav`);
    fs.writeFileSync(secondStalePath, Buffer.from('RIFF second stale file'));
    fs.utimesSync(secondStalePath, tenMinutesAgoSec, tenMinutesAgoSec);
    console.log(`  [3B] File tồn đọng giả lập 2: ${secondStalePath}`);

    const cleanedCount = restartedDriver.cleanupStaleTempFiles(5 * 60 * 1000);
    console.log(`  -> [3B] Số lượng file tạm cũ đã dọn dẹp: ${cleanedCount}`);
    assert(cleanedCount >= 1, `cleanupStaleTempFiles must report at least 1 cleaned file, got ${cleanedCount}`);
    assert.strictEqual(fs.existsSync(secondStalePath), false, 'Second stale file must be deleted');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: File đang hoạt động (< 5 phút) KHÔNG bị xóa nhầm
  // ---------------------------------------------------------------------------
  await testStep('TC4: File mới sinh (< 5 phút) KHÔNG bị xóa nhầm', async () => {
    const freshFileName = `piper_active_in_flight_${Date.now()}.wav`;
    const freshFilePath = path.join(tempAudioDir, freshFileName);
    fs.writeFileSync(freshFilePath, Buffer.from('RIFF fresh active in-flight audio'));

    try {
      const driver = new DesktopAudioDriver();
      driver.cleanupStaleTempFiles(5 * 60 * 1000); // 5 phút threshold

      // File mới tạo không được bị xóa
      assert.strictEqual(
        fs.existsSync(freshFilePath),
        true,
        'Active in-flight file (< 5 mins) must NOT be deleted prematurely!'
      );
      console.log('  -> File đang hoạt động hợp lệ được bảo toàn nguyên vẹn.');
    } finally {
      // Dọn dẹp thủ công file test
      if (fs.existsSync(freshFilePath)) {
        fs.unlinkSync(freshFilePath);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Lệnh xóa trong finally không throw lỗi nếu file đã bị xóa từ trước
  // ---------------------------------------------------------------------------
  await testStep('TC5: Xóa file trong finally an toàn tuyệt đối (không crash do ENOENT)', async () => {
    const mockRegistry = createMockBodyRegistry({
      success: true,
      data: { deviceName: 'Mock Speakers' },
    });

    let interceptedFilePath: string | undefined;
    const selfDeletingPiper = {
      synthesize: async () => {
        const p = path.join(tempAudioDir, `piper_pre_deleted_${Date.now()}.wav`);
        fs.writeFileSync(p, Buffer.from('RIFF test data'));
        interceptedFilePath = p;
        // Cố tình xóa file trước khi pipeline đi tới finally (giả lập race condition)
        fs.unlinkSync(p);
        return {
          success: true,
          audioBase64: 'bW9jaw==',
          wavFilePath: p,
          byteLength: 20,
          sampleRate: 22050,
        };
      },
    };

    const pipeline = new VoicePipeline(
      mockRegistry,
      undefined,
      undefined,
      undefined,
      selfDeletingPiper as any
    );

    // Không được throw lỗi ENOENT
    let threwError = false;
    try {
      await pipeline.executeVoiceRoundtrip({
        bodyId: 'mock_desktop_body',
        simulatedTranscript: 'Test race condition',
        userId: 'test_user',
        role: 'owner',
        isOwner: true,
      });
    } catch {
      threwError = true;
    }

    assert.strictEqual(threwError, false, 'Pipeline must not crash when file is already unlinked');
    console.log('  -> Khối finally xử lý an toàn, không ném ngoại lệ khi file đã bị xóa trước.');
  });

  console.log('========================================================================');
  console.log(`🎉 TẤT CẢ TEST ĐÃ HOÀN TẤT THÀNH CÔNG! (${testsPassed}/${testsPassed} passed)`);
  console.log('========================================================================\n');
}

runTtsWavCleanupTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
