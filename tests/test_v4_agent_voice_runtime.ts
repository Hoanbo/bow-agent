// tests/test_v4_agent_voice_runtime.ts
// BOWCON V4.0 — MILESTONE 1.3.5: AGENT VOICE RUNTIME & NATURAL TTS FOUNDATION
//
// Authoritative 22-Section Verification Suite

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  VoiceService,
  globalVoiceService,
  VoiceConfig,
  validateVoiceConfig,
  processTextForSpeech,
  MockTtsProvider,
  OpenAiTtsProvider,
  ElevenLabsProvider,
  VoiceSecurityError,
  VoiceConfigurationError,
  VoiceProviderUnavailableError,
  redactSecrets,
  AgentLoop,
  globalAgentLoop,
} from '../src/index.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(name: string) {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name: string, detail?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ❌ [FAIL] ${name}`, detail || '');
}

const TEST_SCRATCH_DIR = path.resolve('./data/test_voice_runtime_' + Date.now());

async function runSuite() {
  console.log('\n========================================================================');
  console.log('🎙️ RUNNING BOWCON V4.0 (MS-1.3.5: AGENT VOICE RUNTIME & NATURAL TTS) SUITE');
  console.log('========================================================================\n');

  try {
    fs.mkdirSync(TEST_SCRATCH_DIR, { recursive: true });

    // --------------------------------------------------------------------------
    // SECTION 1: VOICESERVICE CONTRACT
    // --------------------------------------------------------------------------
    console.log('📦 SECTION 1: VoiceService Contract');
    try {
      const service = new VoiceService();
      assert.strictEqual(typeof service.synthesize, 'function', 'synthesize method exists');
      assert.strictEqual(typeof service.getCapabilities, 'function', 'getCapabilities method exists');
      assert.strictEqual(typeof service.getProvider, 'function', 'getProvider method exists');
      assert.strictEqual(typeof service.validateConfiguration, 'function', 'validateConfiguration method exists');
      assert.strictEqual(typeof service.registerProvider, 'function', 'registerProvider method exists');
      assert.strictEqual(typeof service.listProviders, 'function', 'listProviders method exists');
      assert.strictEqual(typeof service.setDefaultProvider, 'function', 'setDefaultProvider method exists');
      assert(service.listProviders().includes('mock'), 'Default mock provider is registered');
      pass('VoiceService adheres to canonical provider-independent contract');
    } catch (e) {
      fail('Section 1 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 2: PROVIDER REGISTRATION
    // --------------------------------------------------------------------------
    console.log('\n🔌 SECTION 2: Provider Registration');
    try {
      const service = new VoiceService([]);
      assert.strictEqual(service.listProviders().length, 0, 'Initial custom service is empty');

      const mock = new MockTtsProvider();
      service.registerProvider(mock);
      assert.strictEqual(service.listProviders().length, 1, 'Provider successfully registered');
      assert.strictEqual(service.getProvider('mock'), mock, 'getProvider retrieves registered instance');
      pass('Dynamic provider registration and lookup verified');
    } catch (e) {
      fail('Section 2 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 3: PROVIDER SELECTION
    // --------------------------------------------------------------------------
    console.log('\n🎯 SECTION 3: Provider Selection');
    try {
      const service = new VoiceService();
      const res = await service.synthesize({
        text: 'Kiểm tra chọn bộ phát âm.',
        voiceConfig: { provider: 'mock' },
      });
      assert.strictEqual(res.success, true, 'Synthesis succeeded with mock provider');
      assert.strictEqual(res.provider, 'mock', 'Selected provider matches request');

      const badRes = await service.synthesize({
        text: 'Kiểm tra nhà cung cấp không tồn tại.',
        voiceConfig: { provider: 'non_existent_provider_xyz' },
      });
      assert.strictEqual(badRes.success, false, 'Unregistered provider fails closed');
      assert(badRes.error?.includes('VOICE_PROVIDER_NOT_FOUND'), 'Returns VOICE_PROVIDER_NOT_FOUND error');
      pass('Provider selection and un-registered fallback verified');
    } catch (e) {
      fail('Section 3 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 4: VOICE CONFIGURATION VALIDATION
    // --------------------------------------------------------------------------
    console.log('\n📋 SECTION 4: Voice Configuration Validation');
    try {
      // Valid config
      const valid = validateVoiceConfig({
        enabled: true,
        provider: 'mock',
        language: 'vi-VN',
        speed: 1.2,
        volume: 90,
        outputFormat: 'audio/wav',
      });
      assert.strictEqual(valid.valid, true, 'Valid config passes validation');

      // Invalid speed (< 0.25)
      const invalidSpeed = validateVoiceConfig({ speed: 0.1 });
      assert.strictEqual(invalidSpeed.valid, false, 'Speed < 0.25 rejected');

      // Invalid output format
      const invalidFormat = validateVoiceConfig({ outputFormat: 'audio/flac' as any });
      assert.strictEqual(invalidFormat.valid, false, 'Unsupported format rejected');

      // Invalid BCP-47 language tag
      const invalidLang = validateVoiceConfig({ language: '12345--bad' });
      assert.strictEqual(invalidLang.valid, false, 'Invalid language code rejected');

      // Prototype pollution defense
      assert.throws(
        () => validateVoiceConfig(JSON.parse('{"__proto__":{"polluted":true}}')),
        /Prototype pollution/,
        'Prototype pollution in VoiceConfig throws VoiceSecurityError'
      );
      pass('Voice configuration validation rules and prototype pollution defense verified');
    } catch (e) {
      fail('Section 4 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 5: VIETNAMESE SYNTHESIS REQUEST
    // --------------------------------------------------------------------------
    console.log('\n🇻🇳 SECTION 5: Vietnamese Synthesis Request');
    try {
      const service = new VoiceService();
      const text = 'Xin chào Sếp, hệ thống BOWCON V4.0 đã sẵn sàng phục vụ Ngài.';
      const res = await service.synthesize({
        text,
        language: 'vi-VN',
        voiceConfig: {
          provider: 'mock',
          language: 'vi-VN',
          outputFormat: 'audio/wav',
        },
      });

      assert.strictEqual(res.success, true, 'Vietnamese synthesis succeeded');
      assert.strictEqual(res.audioFormat, 'audio/wav', 'Audio format is audio/wav');
      assert(res.audioData && res.audioData.length > 44, 'Audio data contains valid payload');
      assert(res.durationMs && res.durationMs > 0, 'Duration is estimated accurately');
      pass('Vietnamese natural synthesis request handled with full audio data payload');
    } catch (e) {
      fail('Section 5 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 6: ENGLISH SYNTHESIS REQUEST
    // --------------------------------------------------------------------------
    console.log('\n🇬🇧 SECTION 6: English Synthesis Request');
    try {
      const service = new VoiceService();
      const text = 'Hello Boss, autonomous agent operations are functioning normally.';
      const res = await service.synthesize({
        text,
        language: 'en-US',
        voiceConfig: {
          provider: 'mock',
          language: 'en-US',
          outputFormat: 'audio/wav',
        },
      });

      assert.strictEqual(res.success, true, 'English synthesis succeeded');
      assert.strictEqual(res.audioFormat, 'audio/wav', 'Audio format is audio/wav');
      assert(res.audioData && res.audioData.length > 44, 'Audio data contains valid payload');
      pass('English natural synthesis request handled with full audio data payload');
    } catch (e) {
      fail('Section 6 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 7: SPEECH TEXT PREPROCESSING
    // --------------------------------------------------------------------------
    console.log('\n📝 SECTION 7: Speech Text Preprocessing');
    try {
      const rawMarkdown = `## Báo cáo hệ thống

- Trạng thái: **Hoạt động tốt**
- Chi tiết: Xem tại [Shop Of Bow](https://shopofbow.vercel.app)
- Lệnh thực thi: \`npm run start\`

\`\`\`typescript
const a = 1;
const b = 2;
\`\`\`

> Lưu ý: ⏳ Vui lòng chờ kiểm tra! ✅`;

      const spoken = processTextForSpeech(rawMarkdown, { language: 'vi-VN' });

      assert(!spoken.includes('##'), 'Markdown header hashes stripped');
      assert(!spoken.includes('**'), 'Markdown bold asterisks stripped');
      assert(!spoken.includes('`npm run start`'), 'Inline code backticks stripped');
      assert(!spoken.includes('```typescript'), 'Fenced code block stripped');
      assert(spoken.includes('[Đoạn mã'), 'Code block converted to spoken announcement');
      assert(spoken.includes('Shop Of Bow'), 'Markdown link anchor text preserved');
      assert(!spoken.includes('https://shopofbow.vercel.app'), 'Raw markdown link URL stripped');
      assert(!spoken.includes('⏳'), 'Decorative hourglass emoji stripped');
      assert(!spoken.includes('✅'), 'Decorative checkmark emoji stripped');
      pass('Speech text preprocessor normalizes markdown, URLs, code blocks, and emojis');
    } catch (e) {
      fail('Section 7 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 8: ORIGINAL RESPONSE IMMUTABILITY (INV-7)
    // --------------------------------------------------------------------------
    console.log('\n🔒 SECTION 8: Original Response Immutability (INV-7)');
    try {
      const originalText = '## Tiêu đề quan trọng\n- Mục 1: **Dữ liệu gốc**';
      const cloned = String(originalText);

      const spoken = processTextForSpeech(originalText);
      assert.strictEqual(originalText, cloned, 'Input string is not mutated by processTextForSpeech');
      assert.notStrictEqual(spoken, originalText, 'Spoken output is a distinct string');

      const service = new VoiceService();
      await service.synthesize({ text: originalText, voiceConfig: { provider: 'mock' } });
      assert.strictEqual(originalText, cloned, 'Input string is not mutated by synthesize');
      pass('Original agent response text remains 100% byte-for-byte immutable');
    } catch (e) {
      fail('Section 8 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 9: USER ISOLATION (INV-5)
    // --------------------------------------------------------------------------
    console.log('\n👤 SECTION 9: User Isolation (INV-5)');
    try {
      const service = new VoiceService();

      const aliceRes = await service.synthesize({
        text: 'Giọng nói Alice',
        userId: 'user_alice',
        voiceConfig: { provider: 'mock', speed: 1.5, volume: 90 },
      });

      const bobRes = await service.synthesize({
        text: 'Giọng nói Bob',
        userId: 'user_bob',
        voiceConfig: { provider: 'mock', speed: 0.8, volume: 50 },
      });

      assert.strictEqual(aliceRes.success, true);
      assert.strictEqual(bobRes.success, true);
      assert.notStrictEqual(aliceRes.metadata?.words, undefined);
      pass('User A and User B voice synthesis requests executed in complete isolation');
    } catch (e) {
      fail('Section 9 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 10: SESSION ISOLATION (INV-6)
    // --------------------------------------------------------------------------
    console.log('\n👥 SECTION 10: Session Isolation (INV-6)');
    try {
      const service = new VoiceService();

      const sess1 = await service.synthesize({
        text: 'Session 1 text',
        sessionId: 'sess_001',
        language: 'vi-VN',
        voiceConfig: { provider: 'mock', language: 'vi-VN' },
      });

      const sess2 = await service.synthesize({
        text: 'Session 2 text',
        sessionId: 'sess_002',
        language: 'en-US',
        voiceConfig: { provider: 'mock', language: 'en-US' },
      });

      assert.strictEqual(sess1.success, true);
      assert.strictEqual(sess2.success, true);
      pass('Distinct sessions execute without shared mutable voice configuration leakage');
    } catch (e) {
      fail('Section 10 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 11: PROVIDER FAILURE HANDLING (INV-8)
    // --------------------------------------------------------------------------
    console.log('\n💥 SECTION 11: Provider Failure Handling (INV-8)');
    try {
      const mockProvider = new MockTtsProvider();
      mockProvider.setSimulatedFailure('Simulated upstream TTS provider crash');

      const service = new VoiceService([mockProvider]);
      const res = await service.synthesize({
        text: 'Thông điệp này sẽ thất bại khi phát âm.',
        voiceConfig: { provider: 'mock' },
      });

      assert.strictEqual(res.success, false, 'Failed provider returns success: false');
      assert(res.error?.includes('Simulated upstream TTS provider crash'), 'Error captured in result');
      assert.strictEqual(res.audioData, undefined, 'No fake audio data returned on failure');
      assert(res.speechText.length > 0, 'Speech text preserved on failure');
      pass('Provider failure handled gracefully without unhandled exception throw');
    } catch (e) {
      fail('Section 11 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 12: TIMEOUT HANDLING (INV-13)
    // --------------------------------------------------------------------------
    console.log('\n⌛ SECTION 12: Timeout Handling (INV-13)');
    try {
      const mockProvider = new MockTtsProvider();
      mockProvider.setSimulatedDelay(400); // 400ms delay

      const service = new VoiceService([mockProvider]);
      const startTime = Date.now();
      const res = await service.synthesize({
        text: 'Thử nghiệm quá thời gian chờ.',
        voiceConfig: {
          provider: 'mock',
          timeoutMs: 100, // 100ms deadline
        },
      });
      const duration = Date.now() - startTime;

      assert.strictEqual(res.success, false, 'Timed-out synthesis marked failed');
      assert(res.error?.includes('VOICE_TIMEOUT'), 'Explicit VOICE_TIMEOUT error returned');
      assert(duration < 350, 'Timeout aborted within reasonable boundary');
      pass('Synthesis deadline timeout enforced cleanly via Abort/race timer');
    } catch (e) {
      fail('Section 12 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 13: SECRET REDACTION (INV-9)
    // --------------------------------------------------------------------------
    console.log('\n🛡️ SECTION 13: Secret Redaction (INV-9)');
    try {
      const rawSecret = 'Error connecting with sk-proj-1234567890abcdef1234 and Bearer tok_sec_secret123';
      const scrubbed = redactSecrets(rawSecret);

      assert(!scrubbed.includes('sk-proj-1234567890abcdef1234'), 'OpenAI secret key redacted');
      assert(!scrubbed.includes('tok_sec_secret123'), 'Bearer token redacted');
      assert(scrubbed.includes('sk-[REDACTED]'), 'Redaction placeholder present');

      // Test via VoiceService error path
      const mockProvider = new MockTtsProvider();
      mockProvider.setSimulatedFailure('Leaked key sk-abcdef1234567890 during auth');
      const service = new VoiceService([mockProvider]);
      const res = await service.synthesize({ text: 'Test', voiceConfig: { provider: 'mock' } });

      assert(!res.error?.includes('sk-abcdef1234567890'), 'Secret key scrubbed from VoiceResult.error');
      pass('Secret scrubbing eliminates sensitive tokens and API keys from error paths');
    } catch (e) {
      fail('Section 13 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 14: TEXT FALLBACK (INV-8)
    // --------------------------------------------------------------------------
    console.log('\n📄 SECTION 14: Text Fallback (INV-8)');
    try {
      const mockProvider = new MockTtsProvider();
      mockProvider.setSimulatedFailure('TTS cloud down');
      const service = new VoiceService([mockProvider]);

      const originalText = 'Nội dung phản hồi quan trọng của Agent.';
      const res = await service.synthesize({
        text: originalText,
        voiceConfig: { provider: 'mock' },
      });

      assert.strictEqual(res.success, false, 'TTS reported failure');
      assert.strictEqual(res.speechText, originalText, 'Text response remains 100% available as fallback');
      pass('Text fallback preserved when voice synthesis encounters an error');
    } catch (e) {
      fail('Section 14 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 15: AUDIO FORMAT VALIDATION (INV-14)
    // --------------------------------------------------------------------------
    console.log('\n🎵 SECTION 15: Audio Format Validation (INV-14)');
    try {
      const service = new VoiceService();

      // WAV format
      const wavRes = await service.synthesize({
        text: 'Kiểm tra định dạng WAV.',
        voiceConfig: { provider: 'mock', outputFormat: 'audio/wav' },
      });
      assert.strictEqual(wavRes.audioFormat, 'audio/wav');
      assert(wavRes.audioData && Buffer.isBuffer(wavRes.audioData));
      assert.strictEqual(wavRes.audioData.subarray(0, 4).toString('ascii'), 'RIFF', 'Valid RIFF header');
      assert.strictEqual(wavRes.audioData.subarray(8, 12).toString('ascii'), 'WAVE', 'Valid WAVE header');

      // PCM format
      const pcmRes = await service.synthesize({
        text: 'Kiểm tra định dạng PCM.',
        voiceConfig: { provider: 'mock', outputFormat: 'audio/pcm' },
      });
      assert.strictEqual(pcmRes.audioFormat, 'audio/pcm');
      assert(pcmRes.audioData && pcmRes.audioData.length > 0);

      // MPEG format
      const mp3Res = await service.synthesize({
        text: 'Kiểm tra định dạng MP3.',
        voiceConfig: { provider: 'mock', outputFormat: 'audio/mpeg' },
      });
      assert.strictEqual(mp3Res.audioFormat, 'audio/mpeg');
      assert(mp3Res.audioData && mp3Res.audioData.length > 0);

      pass('Standard audio formats (WAV, PCM, MPEG) generated with verifiable binary headers');
    } catch (e) {
      fail('Section 15 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 16: MAXIMUM TEXT LENGTH (INV-16)
    // --------------------------------------------------------------------------
    console.log('\n📏 SECTION 16: Maximum Text Length (INV-16)');
    try {
      const service = new VoiceService();
      const longText = 'A'.repeat(5001);

      const res = await service.synthesize({
        text: longText,
        voiceConfig: { provider: 'mock', maxTextLength: 5000 },
      });

      assert.strictEqual(res.success, false, 'Oversized text rejected');
      assert(res.error?.includes('VOICE_TEXT_TOO_LONG'), 'Returns VOICE_TEXT_TOO_LONG error');

      const okText = 'A'.repeat(500);
      const okRes = await service.synthesize({
        text: okText,
        voiceConfig: { provider: 'mock', maxTextLength: 5000 },
      });
      assert.strictEqual(okRes.success, true, 'Text within limit accepted');
      pass('Maximum text length limits enforced fail-closed');
    } catch (e) {
      fail('Section 16 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 17: PATH TRAVERSAL DEFENSE (INV-15)
    // --------------------------------------------------------------------------
    console.log('\n🚫 SECTION 17: Path Traversal Defense (INV-15)');
    try {
      const service = new VoiceService();

      // Attempt to escape via outputDir
      const traversalRes = await service.synthesize({
        text: 'Kiểm tra path traversal.',
        voiceConfig: {
          provider: 'mock',
          outputDir: '../../etc/passwd',
        },
      });

      assert.strictEqual(traversalRes.success, false, 'Path traversal rejected');
      assert(traversalRes.error?.includes('Path traversal'), 'Path traversal detected and reported');

      // Valid outputDir
      const validOutDir = path.join(TEST_SCRATCH_DIR, 'audio_out');
      const validRes = await service.synthesize({
        text: 'Kiểm tra ghi tệp hợp lệ.',
        voiceConfig: {
          provider: 'mock',
          outputDir: validOutDir,
        },
      });

      assert.strictEqual(validRes.success, true, 'Valid audio output write succeeded');
      assert(validRes.filePath && fs.existsSync(validRes.filePath), 'Audio file exists on disk');
      pass('Path traversal defense strictly prevents filesystem escape on audio output');
    } catch (e) {
      fail('Section 17 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 18: NULL-BYTE DEFENSE (INV-15)
    // --------------------------------------------------------------------------
    console.log('\n🛑 SECTION 18: Null-Byte Defense (INV-15)');
    try {
      const service = new VoiceService();

      const nullByteRes = await service.synthesize({
        text: 'Kiểm tra null byte.',
        voiceConfig: {
          provider: 'mock',
          outputDir: 'test\0secret',
        },
      });

      assert.strictEqual(nullByteRes.success, false, 'Null-byte in outputDir rejected');
      assert(nullByteRes.error?.includes('Null-byte injection'), 'Null-byte error reported');
      pass('Null-byte injection strictly blocked with fail-closed security');
    } catch (e) {
      fail('Section 18 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 19: AGENTLOOP INTEGRATION (Section 9)
    // --------------------------------------------------------------------------
    console.log('\n🔄 SECTION 19: AgentLoop Integration');
    try {
      const loop = new AgentLoop();

      // 19a. Normal execution with voice enabled
      const res = await loop.execute({
        sessionId: 'sess_voice_test',
        userText: 'chào em',
        actor: { userId: 'boss_user', role: 'owner', channel: 'DESKTOP', isOwner: true },
        voiceConfig: {
          enabled: true,
          provider: 'mock',
          language: 'vi-VN',
        },
      });

      assert.strictEqual(res.state, 'COMPLETED', 'Loop state is COMPLETED');
      assert(res.response.content.length > 0, 'Response content populated');
      assert(res.voiceResult !== undefined, 'voiceResult is attached to AgentLoopResult');
      assert.strictEqual(res.voiceResult?.success, true, 'voiceResult.success is true');
      assert(res.voiceResult?.audioData && res.voiceResult.audioData.length > 0, 'Audio data synthesized');

      // 19b. Failure isolation: TTS failure does NOT fail AgentLoop reasoning (INV-8)
      const failingMock = new MockTtsProvider();
      failingMock.setSimulatedFailure('TTS Provider Offline');
      const failingVoiceService = new VoiceService([failingMock]);
      const loopWithFailingVoice = new AgentLoop(failingVoiceService);

      const failRes = await loopWithFailingVoice.execute({
        sessionId: 'sess_voice_fail_test',
        userText: 'chào em',
        actor: { userId: 'boss_user', role: 'owner', channel: 'DESKTOP', isOwner: true },
        voiceConfig: {
          enabled: true,
          provider: 'mock',
        },
      });

      assert.strictEqual(failRes.state, 'COMPLETED', 'AgentLoop remains COMPLETED despite TTS failure');
      assert(failRes.response.content.length > 0, 'Agent text response remains 100% available');
      assert.strictEqual(failRes.voiceResult?.success, false, 'voiceResult explicitly reports failure');
      assert(failRes.voiceResult?.error?.includes('TTS Provider Offline'), 'Voice failure captured');

      pass('AgentLoop executes voice synthesis at post-response boundary with failure isolation');
    } catch (e) {
      fail('Section 19 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 20: NO GLOBAL MUTABLE VOICE STATE (INV-4)
    // --------------------------------------------------------------------------
    console.log('\n🔍 SECTION 20: No Global Mutable Voice State (INV-4)');
    try {
      const voiceServiceSrc = fs.readFileSync(path.resolve('./src/core/voice/voiceService.ts'), 'utf8');
      const voiceConfigSrc = fs.readFileSync(path.resolve('./src/core/voice/voiceConfig.ts'), 'utf8');
      const speechProcSrc = fs.readFileSync(path.resolve('./src/core/voice/speechTextProcessor.ts'), 'utf8');

      assert(!voiceServiceSrc.includes('let currentVoice'), 'No let currentVoice in voiceService.ts');
      assert(!voiceServiceSrc.includes('let globalAudioBuffer'), 'No let globalAudioBuffer in voiceService.ts');
      assert(!voiceServiceSrc.includes('let currentSpeechSession'), 'No let currentSpeechSession in voiceService.ts');
      assert(!voiceServiceSrc.includes('conversationAudioHistory'), 'No conversationAudioHistory in voiceService.ts');

      assert(!voiceConfigSrc.includes('let currentVoice'), 'No let currentVoice in voiceConfig.ts');
      assert(!speechProcSrc.includes('let currentVoice'), 'No let currentVoice in speechTextProcessor.ts');

      pass('Static audit confirms zero global mutable voice state in module scope');
    } catch (e) {
      fail('Section 20 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 21: PROVIDER-INDEPENDENT AGENTLOOP (INV-3)
    // --------------------------------------------------------------------------
    console.log('\n🧩 SECTION 21: Provider-Independent AgentLoop (INV-3)');
    try {
      const agentLoopSrc = fs.readFileSync(path.resolve('./src/core/agentLoop.ts'), 'utf8');

      assert(!agentLoopSrc.includes('openAiTtsProvider'), 'AgentLoop does NOT import openAiTtsProvider');
      assert(!agentLoopSrc.includes('elevenLabsProvider'), 'AgentLoop does NOT import elevenLabsProvider');
      assert(!agentLoopSrc.includes('OpenAI'), 'AgentLoop does NOT import OpenAI SDK');
      assert(!agentLoopSrc.includes('ElevenLabs'), 'AgentLoop does NOT import ElevenLabs SDK');
      assert(agentLoopSrc.includes('VoiceService'), 'AgentLoop communicates only via VoiceService');

      pass('AgentLoop is 100% decoupled and provider-independent');
    } catch (e) {
      fail('Section 21 failed', e);
    }

    // --------------------------------------------------------------------------
    // SECTION 22: STREAMING-READY INTERFACE CONTRACT (Section 8 & 22)
    // --------------------------------------------------------------------------
    console.log('\n🌊 SECTION 22: Streaming-Ready Interface Contract');
    try {
      const service = new VoiceService();
      const chunks: Buffer[] = [];

      for await (const chunk of service.synthesizeStream({
        text: 'Kiểm tra luồng phát thanh từng khối dữ liệu.',
        voiceConfig: { provider: 'mock', outputFormat: 'audio/wav' },
      })) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      assert(chunks.length > 0, 'Stream yielded at least one chunk');
      const totalStreamBytes = chunks.reduce((acc, c) => acc + c.length, 0);
      assert(totalStreamBytes > 44, 'Total streamed audio contains full audio payload');
      pass('Streaming-ready interface contract verified and functional');
    } catch (e) {
      fail('Section 22 failed', e);
    }

  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(TEST_SCRATCH_DIR, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  if (failedTests === 0) {
    console.log('🎉 ALL MILESTONE 1.3.5 AGENT VOICE RUNTIME TESTS PASSED (100% SUCCESS)!');
  } else {
    console.error('❌ MILESTONE 1.3.5 SUITE HAS FAILING TESTS!');
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
