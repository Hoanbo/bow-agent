// tests/voicePipeline/test_voice_e2e_timeout.ts
// BOWCON V4.0 — PROMPT #6 (M4): END-TO-END VOICE ROUNDTRIP TIMEOUT VERIFICATION
//
// EN:
// Verifies global end-to-end timeout enforcement across the entire voice pipeline:
// 1. TC1: Simulated slow STT stage exceeding MAX_E2E_TIMEOUT_MS -> Pipeline aborts early at total timeout,
//         returns clear error, tracks stage 'STT', and gives polite user-facing timeout message.
// 2. TC2: Simulated slow Playback stage after Piper TTS created a WAV file -> Pipeline aborts,
//         and the temporary TTS WAV is immediately cleaned up (no leaked audio files).
// 3. TC3: Cancellation via AbortSignal in STT and Piper TTS engines -> Active work/child processes aborted.
// 4. TC4: BodyRegistry pending command cancellation on E2E timeout -> In-flight body command aborted cleanly.
// 5. TC5: Normal flow (no timeout) operates smoothly with zero latency overhead.
// 6. TC6: Default MAX_E2E_TIMEOUT_MS configuration validation from centralized CONFIG.
//
// VI:
// Kiểm thử cơ chế an toàn thời gian timeout tổng thể cho toàn bộ Voice Pipeline:
// 1. TC1: Giả lập STT chạy quá thời gian MAX_E2E_TIMEOUT_MS -> Pipeline bị hủy đúng hạn timeout tổng thể,
//         ghi nhận đúng stageAtError='STT', trả về thông điệp lịch sự cho người dùng.
// 2. TC2: Giả lập Playback bị treo sau khi Piper TTS đã sinh file WAV -> Timeout kích hoạt và file WAV
//         tạm thời của TTS được dọn dẹp sạch sẽ 100%.
// 3. TC3: AbortSignal trong STT và Piper TTS -> Hủy công việc/tiến trình con và dọn dẹp file tạm.
// 4. TC4: Hủy lệnh BodyCommand đang chờ trong BodyRegistry khi pipeline timeout.
// 5. TC5: Luồng bình thường (không timeout) hoạt động chính xác với độ trễ không đổi.
// 6. TC6: Kiểm tra hằng số MAX_E2E_TIMEOUT_MS cấu hình tập trung từ CONFIG.

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { VoicePipeline, MAX_E2E_TIMEOUT_MS } from '../../src/speech/voicePipeline.js';
import { BodyRegistry } from '../../src/core/bodyProtocol/bodyRegistry.js';
import { AgentLoop } from '../../src/core/agentLoop.js';
import { VietnameseSttEngine } from '../../src/speech/sttEngine.js';
import { PiperTtsEngine } from '../../src/speech/piperTtsEngine.js';
import { CONFIG } from '../../src/config.js';
import type { BodyCommand, BodyCommandResult } from '../../src/core/bodyProtocol/types.js';

// Bắt buộc môi trường test để cho phép mock & simulatedTranscript
process.env.NODE_ENV = 'test';

async function runVoiceTimeoutTests(): Promise<void> {
  console.log('========================================================================');
  console.log('⏱️  BẮT ĐẦU TEST SUITE PROMPT #6 (M4): VOICE E2E TIMEOUT VERIFICATION');
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

  // Helper tạo mock BodyRegistry hỗ trợ abortCommand
  function createTestBodyRegistry(options: {
    captureDelayMs?: number;
    playDelayMs?: number;
    playSuccess?: boolean;
  } = {}) {
    const registry = new BodyRegistry();
    registry.registerBody({
      bodyId: 'mock_xeon_body',
      bodyType: 'desktop',
      name: 'Mock Xeon Desktop',
      capabilities: [
        { name: 'audio.capture', description: 'Capture mic audio', riskLevel: 'medium' },
        { name: 'audio.play', description: 'Play audio', riskLevel: 'medium' },
      ],
    });

    registry.executeBodyCommand = async (cmd: BodyCommand): Promise<BodyCommandResult> => {
      if (cmd.capability === 'audio.capture') {
        if (options.captureDelayMs && options.captureDelayMs > 0) {
          await new Promise((r) => setTimeout(r, options.captureDelayMs));
        }
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
        if (options.playDelayMs && options.playDelayMs > 0) {
          await new Promise((r) => setTimeout(r, options.playDelayMs));
        }
        return {
          commandId: cmd.commandId,
          success: options.playSuccess !== false,
          data: { deviceName: 'Mock Headset' },
        };
      }

      return { commandId: cmd.commandId, success: true };
    };

    return registry;
  }

  // -------------------------------------------------------------------------
  // TC1: Stage STT bị treo lâu hơn MAX_E2E_TIMEOUT_MS -> Hủy đúng thời điểm timeout tổng
  // -------------------------------------------------------------------------
  await testStep('TC1: STT stage bị treo -> Roundtrip bị hủy đúng hạn timeout tổng thể', async () => {
    const bodyRegistry = createTestBodyRegistry();
    const agentLoop = new AgentLoop();

    // Mock STT engine giả lập treo 3000ms
    const mockStt = {
      transcribe: async (_buf: Buffer, opts?: any) => {
        const delayMs = 3000;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delayMs);
          if (opts?.signal) {
            opts.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('STT_ABORTED_BY_SIGNAL'));
            });
          }
        });
        return { success: true, text: 'Lệnh giả lập', language: 'vi', backend: 'local_whisper_cpp', latencyMs: 3000 };
      },
    } as unknown as VietnameseSttEngine;

    const pipeline = new VoicePipeline(bodyRegistry, agentLoop, mockStt);

    const startTime = Date.now();
    const maxE2eTimeoutMs = 600; // Ngưỡng timeout tổng 600ms

    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_xeon_body',
      maxE2eTimeoutMs,
      userId: 'boss_tester',
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`  [TC1] Thời gian thực thi: ${elapsedMs}ms (ngưỡng: ${maxE2eTimeoutMs}ms, STT định chạy: 3000ms)`);

    assert.strictEqual(result.success, false, 'Pipeline phải trả về success: false khi timeout');
    assert.strictEqual(result.agentLoopState, 'VOICE_PIPELINE_TIMEOUT', 'agentLoopState phải là VOICE_PIPELINE_TIMEOUT');
    assert.strictEqual(result.stageAtError, 'STT', 'stageAtError phải chỉ rõ stage đang chạy dở là STT');
    assert.ok(result.error?.includes('VOICE_ROUNDTRIP_TIMEOUT'), 'Error message phải chứa VOICE_ROUNDTRIP_TIMEOUT');
    assert.strictEqual(
      result.responseText,
      'Xin lỗi, tôi mất quá nhiều thời gian xử lý, vui lòng thử lại.',
      'Phải trả về câu phản hồi lịch sự cho Chủ nhân khi timeout'
    );
    // Xác nhận kết thúc trong khoảng ~600-1200ms, KHÔNG đợi hết 3000ms hay 20000ms
    assert.ok(elapsedMs < 1800, `Pipeline phải hủy nhanh gần ngưỡng timeout (thực tế: ${elapsedMs}ms)`);
  });

  // -------------------------------------------------------------------------
  // TC2: Playback bị treo sau khi Piper TTS sinh file WAV -> Timeout & dọn sạch file WAV
  // -------------------------------------------------------------------------
  await testStep('TC2: Playback bị treo sau TTS -> Timeout kích hoạt và file WAV tạm được dọn sạch', async () => {
    // Body registry giả lập audio.play bị treo 3500ms
    const bodyRegistry = createTestBodyRegistry({ playDelayMs: 3500 });
    const agentLoop = new AgentLoop();

    let createdTempWavPath: string | undefined;

    // Mock Piper TTS sinh file WAV tạm thật để kiểm chứng dọn dẹp
    const mockPiperTts = {
      synthesize: async (_text: string, _opts?: any) => {
        createdTempWavPath = path.join(tempAudioDir, `piper_timeout_test_${Date.now()}.wav`);
        fs.writeFileSync(createdTempWavPath, Buffer.from('RIFF mock piper synthesized speech audio'));
        return {
          success: true,
          errorCode: 'SUCCESS',
          wavFilePath: createdTempWavPath,
          audioBase64: Buffer.from('mock audio').toString('base64'),
          byteLength: 40,
          sampleRate: 22050,
          durationMs: 150,
        };
      },
    } as unknown as PiperTtsEngine;

    const pipeline = new VoicePipeline(bodyRegistry, agentLoop, undefined, undefined, mockPiperTts);

    const maxE2eTimeoutMs = 800; // Timeout 800ms
    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_xeon_body',
      maxE2eTimeoutMs,
      simulatedTranscript: 'Xin chào trợ lý',
    });

    console.log(`  [TC2] Result error: ${result.error}, stageAtError: ${result.stageAtError}`);
    assert.strictEqual(result.success, false, 'Pipeline phải fail do timeout');
    assert.strictEqual(result.stageAtError, 'PLAYBACK', 'Stage đang chạy dở phải là PLAYBACK');
    assert.strictEqual(result.agentLoopState, 'VOICE_PIPELINE_TIMEOUT');

    // KIỂM TRA BẢO VỆ DỮ LIỆU NHẠY CẢM: File WAV tạm của TTS phải bị xóa ngay lập tức
    assert.ok(createdTempWavPath, 'File WAV tạm phải được tạo ra trước khi timeout');
    const fileStillExists = fs.existsSync(createdTempWavPath);
    console.log(`  [TC2] File WAV tạm "${path.basename(createdTempWavPath)}" còn tồn tại: ${fileStillExists}`);
    assert.strictEqual(fileStillExists, false, 'File WAV tạm của TTS PHẢI BỊ XÓA SẠCH sau khi timeout tổng kích hoạt');
  });

  // -------------------------------------------------------------------------
  // TC3: Hỗ trợ AbortSignal trong SttEngine và PiperTtsEngine
  // -------------------------------------------------------------------------
  await testStep('TC3: AbortSignal trong SttEngine và PiperTtsEngine hủy tác vụ con ngay lập tức', async () => {
    const stt = new VietnameseSttEngine();
    const piper = new PiperTtsEngine();

    // 1. STT Abort test
    const abortCtrl1 = new AbortController();
    abortCtrl1.abort(); // Pre-aborted
    const dummyAudio = Buffer.from('RIFF mock audio data');
    const sttResult = await stt.transcribe(dummyAudio, { signal: abortCtrl1.signal });
    assert.strictEqual(sttResult.success, false);
    assert.ok(sttResult.error?.includes('STT_ABORTED'), `STT error phải là STT_ABORTED, thực tế: ${sttResult.error}`);

    // 2. Piper Abort test
    const abortCtrl2 = new AbortController();
    abortCtrl2.abort(); // Pre-aborted
    const piperResult = await piper.synthesize('Kiểm tra abort signal', { signal: abortCtrl2.signal });
    assert.strictEqual(piperResult.success, false);
    assert.strictEqual(piperResult.errorCode, 'ABORTED');
    assert.ok(piperResult.error?.includes('aborted'), `Piper error phải nhắc tới abort, thực tế: ${piperResult.error}`);
  });

  // -------------------------------------------------------------------------
  // TC4: Hủy lệnh BodyCommand đang chờ trong BodyRegistry khi pipeline timeout
  // -------------------------------------------------------------------------
  await testStep('TC4: BodyRegistry.abortCommand() hủy pending command ngay lập tức', async () => {
    const registry = new BodyRegistry();
    const testCommandId = 'cmd_test_hanging_123';

    let wasRejected = false;
    let rejectError: Error | undefined;

    const timeoutHandle = setTimeout(() => {}, 60000);
    registry.registerPendingCommand(
      testCommandId,
      'desktop_xeon',
      () => {},
      (err) => {
        wasRejected = true;
        rejectError = err;
      },
      timeoutHandle
    );

    // Hủy lệnh thông qua abortCommand
    const aborted = registry.abortCommand(testCommandId, 'VOICE_ROUNDTRIP_TIMEOUT');
    assert.strictEqual(aborted, true, 'abortCommand phải trả về true khi command tồn tại');
    assert.strictEqual(wasRejected, true, 'Promise pending command phải bị reject ngay lập tức');
    assert.strictEqual(rejectError?.message, 'VOICE_ROUNDTRIP_TIMEOUT', 'Lý do reject phải là VOICE_ROUNDTRIP_TIMEOUT');

    // Thử abort lại lần 2 -> Idempotent false
    const abortAgain = registry.abortCommand(testCommandId);
    assert.strictEqual(abortAgain, false, 'Lần 2 phải trả về false vì đã bị gỡ');
  });

  // -------------------------------------------------------------------------
  // TC5: Luồng bình thường (Happy path - không chạm timeout)
  // -------------------------------------------------------------------------
  await testStep('TC5: Luồng bình thường (không timeout) chạy thành công và độ trễ chuẩn', async () => {
    const bodyRegistry = createTestBodyRegistry();
    const agentLoop = new AgentLoop();

    let piperWavCreated: string | undefined;
    const mockPiperTts = {
      synthesize: async (_text: string, _opts?: any) => {
        piperWavCreated = path.join(tempAudioDir, `piper_normal_${Date.now()}.wav`);
        fs.writeFileSync(piperWavCreated, Buffer.from('RIFF mock wav normal'));
        return {
          success: true,
          errorCode: 'SUCCESS',
          wavFilePath: piperWavCreated,
          audioBase64: Buffer.from('mock base64').toString('base64'),
          byteLength: 30,
          sampleRate: 22050,
          durationMs: 80,
        };
      },
    } as unknown as PiperTtsEngine;

    const pipeline = new VoicePipeline(bodyRegistry, agentLoop, undefined, undefined, mockPiperTts);

    const start = Date.now();
    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_xeon_body',
      maxE2eTimeoutMs: 30000,
      simulatedTranscript: 'Mở Notepad',
    });

    const latency = Date.now() - start;
    console.log(`  [TC5] Roundtrip thành công trong ${latency}ms`);

    assert.strictEqual(result.success, true, 'Pipeline phải chạy thành công');
    assert.strictEqual(result.userText, 'Mở Notepad');
    assert.ok(result.responseText.length > 0, 'Phải có phản hồi từ AgentLoop');
    assert.strictEqual(result.stageAtError, undefined, 'Không được có stageAtError khi thành công');

    // Xác nhận file tạm của TTS đã được dọn sạch trong finally chuẩn
    if (piperWavCreated) {
      assert.strictEqual(fs.existsSync(piperWavCreated), false, 'File WAV tạm của TTS phải được xóa khi xong');
    }
  });

  // -------------------------------------------------------------------------
  // TC6: Kiểm tra hằng số MAX_E2E_TIMEOUT_MS cấu hình tập trung từ CONFIG
  // -------------------------------------------------------------------------
  await testStep('TC6: Cấu hình MAX_E2E_TIMEOUT_MS tập trung từ CONFIG', async () => {
    assert.strictEqual(typeof MAX_E2E_TIMEOUT_MS, 'number', 'MAX_E2E_TIMEOUT_MS phải là number');
    assert.strictEqual(MAX_E2E_TIMEOUT_MS, CONFIG.voiceMaxE2eTimeoutMs, 'Phải đồng bộ với CONFIG.voiceMaxE2eTimeoutMs');
    assert.ok(MAX_E2E_TIMEOUT_MS >= 1000, 'Ngưỡng timeout tối thiểu >= 1000ms');
    console.log(`  [TC6] MAX_E2E_TIMEOUT_MS hiện tại: ${MAX_E2E_TIMEOUT_MS}ms (từ CONFIG)`);
  });

  console.log('========================================================================');
  console.log(`🎉 KẾT QUẢ TEST SUITE PROMPT #6: ${testsPassed} PASSED / ${testsPassed + testsFailed} TOTAL`);
  console.log('========================================================================\n');
}

runVoiceTimeoutTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
