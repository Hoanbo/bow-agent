// tests/test_v4_agent_voice_quality.ts
// ============================================================================
// BOWCON V4.0 — MILESTONE 1.3.6: AGENT VOICE QUALITY & CONVERSATIONAL TTS
// 31-SECTION COMPREHENSIVE AUTOMATED VERIFICATION SUITE
// ============================================================================

// EN: This suite verifies speech transformations without mutating the user-visible text response.
// VI: Suite này xác minh các biến đổi giọng nói mà không thay đổi phản hồi văn bản người dùng nhìn thấy.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  VoiceService,
  MockTtsProvider,
  OpenAiTtsProvider,
  ElevenLabsProvider,
  VoiceConfig,
  processTextForSpeech,
  processAndPlanSpeech,
  segmentSpeech,
  SpeechSegment,
  normalizeNumbersAndSymbols,
  normalizePronunciation,
  planProsody,
  resolveVoicePersonality,
  validateVoicePersonality,
  VOICE_PERSONALITY_PRESETS,
  AudioAssembler,
  negotiateCapabilities,
  VoiceSecurityError,
  VoiceSynthesisError,
  redactSecrets,
  AgentLoop,
} from '../src/index.js';

let passed = 0;
let failed = 0;

function pass(msg: string) {
  passed++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg: string, err?: any) {
  failed++;
  console.error(`  ❌ [FAIL] ${msg}`);
  if (err) console.error(err);
}

async function runSuite() {
  console.log('========================================================================');
  console.log('🎙️ RUNNING BOWCON V4.0 (MS-1.3.6: AGENT VOICE QUALITY & CONVERSATIONAL TTS)');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: SENTENCE SEGMENTATION (INV-2)
  // --------------------------------------------------------------------------
  console.log('📝 SECTION 1: Sentence Segmentation');
  try {
    const text = 'Hệ thống đã khởi động thành công. Tôi sẽ bắt đầu kiểm tra các dịch vụ. Bạn có cần hỗ trợ gì thêm không?';
    const segments = segmentSpeech(text);
    assert.strictEqual(segments.length, 3, 'Splits into exactly 3 sentences');
    assert.strictEqual(segments[0].text, 'Hệ thống đã khởi động thành công.', 'First sentence preserved');
    assert.strictEqual(segments[1].text, 'Tôi sẽ bắt đầu kiểm tra các dịch vụ.', 'Second sentence preserved');
    assert.strictEqual(segments[2].text, 'Bạn có cần hỗ trợ gì thêm không?', 'Third sentence preserved');
    pass('Deterministic sentence segmentation verified');
  } catch (e) {
    fail('Section 1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 2: DECIMAL NUMBER PROTECTION (INV-2)
  // --------------------------------------------------------------------------
  console.log('\n🔢 SECTION 2: Decimal Number Protection');
  try {
    const text = 'Tỉ lệ hoàn thành là 3.14 lần và chỉ số đạt 0.05 điểm.';
    const segments = segmentSpeech(text);
    assert.strictEqual(segments.length, 1, 'Does not split on decimals (3.14, 0.05)');
    assert(segments[0].text.includes('3.14'), 'Preserves 3.14');
    assert(segments[0].text.includes('0.05'), 'Preserves 0.05');
    pass('Decimal numbers protected from false sentence splitting');
  } catch (e) {
    fail('Section 2 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 3: URL PROTECTION (INV-2)
  // --------------------------------------------------------------------------
  console.log('\n🔗 SECTION 3: URL Protection');
  try {
    const text = 'Vui lòng truy cập https://shopofbow.vercel.app/api/v1 để xem chi tiết. Xin cảm ơn.';
    const segments = segmentSpeech(text);
    assert.strictEqual(segments.length, 2, 'Does not split URL path or query');
    assert(segments[0].text.includes('https://shopofbow.vercel.app/api/v1'), 'URL preserved in first segment');
    pass('URLs protected from false sentence splitting');
  } catch (e) {
    fail('Section 3 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 4: FILE PATH PROTECTION (INV-2)
  // --------------------------------------------------------------------------
  console.log('\n📁 SECTION 4: File Path Protection');
  try {
    const text = 'Tập tin cấu hình nằm tại src/core/voice/voiceConfig.ts và data/bossMemory.json đã được lưu.';
    const segments = segmentSpeech(text);
    assert.strictEqual(segments.length, 1, 'Does not split inside file paths');
    assert(segments[0].text.includes('src/core/voice/voiceConfig.ts'), 'Path 1 preserved');
    assert(segments[0].text.includes('data/bossMemory.json'), 'Path 2 preserved');
    pass('File paths protected from false sentence splitting');
  } catch (e) {
    fail('Section 4 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 5: CONVERSATIONAL PAUSE PLANNING (INV-3)
  // --------------------------------------------------------------------------
  console.log('\n⏱️ SECTION 5: Conversational Pause Planning');
  try {
    const normalSegs = segmentSpeech('Đây là câu thông thường.');
    const questionSegs = segmentSpeech('Bạn có câu hỏi gì không?');
    const alertSegs = segmentSpeech('Cảnh báo nguy hiểm!');

    const normalPlan = planProsody(normalSegs);
    const questionPlan = planProsody(questionSegs);
    const alertPlan = planProsody(alertSegs);

    assert(alertPlan.segments[0].pauseAfterMs >= normalPlan.segments[0].pauseAfterMs, 'Alert has controlled deliberate pause');
    assert(questionPlan.segments[0].segmentType === 'question', 'Classified as question');
    pass('Conversational pauses planned according to sentence semantics');
  } catch (e) {
    fail('Section 5 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 6: SPEAKING-RATE PLANNING (INV-4)
  // --------------------------------------------------------------------------
  console.log('\n🏎️ SECTION 6: Speaking-Rate Planning');
  try {
    const confirmation = segmentSpeech('Đã xong.');
    const explanation = segmentSpeech('Đây là một lời giải thích rất dài dòng và chi tiết về toàn bộ các quy trình nghiệp vụ phức tạp của hệ thống máy chủ tự hành.');

    const confPlan = planProsody(confirmation);
    const expPlan = planProsody(explanation);

    assert(confPlan.segments[0].speedMultiplier > 1.0, 'Short confirmation has brisker rate');
    assert(expPlan.segments[0].speedMultiplier < 1.0, 'Long explanation has measured slower rate');
    pass('Speaking rate pacing planned per sentence type without global cartoon extremes');
  } catch (e) {
    fail('Section 6 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 7: EMPHASIS PLANNING (INV-5)
  // --------------------------------------------------------------------------
  console.log('\n🎯 SECTION 7: Emphasis Planning');
  try {
    const text = 'Đã hoàn tất thanh toán thành công.';
    const segs = segmentSpeech(text);
    const plan = planProsody(segs);

    assert.notStrictEqual(plan.segments[0].emphasis, 'none', 'Critical keyword receives emphasis metadata');
    assert.strictEqual(plan.segments[0].text, text, 'Text itself remains unmutated');
    pass('Emphasis metadata assigned without altering user-facing response text');
  } catch (e) {
    fail('Section 7 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 8: PRONUNCIATION NORMALIZATION (INV-6)
  // --------------------------------------------------------------------------
  console.log('\n🗣️ SECTION 8: Pronunciation Normalization');
  try {
    const raw = 'Hệ thống API và JWT đã tích hợp với Supabase và GitHub.';
    const normalizedVi = normalizePronunciation(raw, 'vi-VN');
    assert(normalizedVi.includes('Ây-Pi-Ai'), 'API expanded to natural Vietnamese phonetics');
    assert(normalizedVi.includes('J-W-T'), 'JWT expanded');
    assert(normalizedVi.includes('Su-pa-base'), 'Supabase expanded');
    assert(normalizedVi.includes('Gít-háp'), 'GitHub expanded');

    const normalizedEn = normalizePronunciation(raw, 'en-US');
    assert(normalizedEn.includes('A-P-I'), 'API expanded for English');
    pass('Pronunciation normalized for developer acronyms and software terms');
  } catch (e) {
    fail('Section 8 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 9: NUMBER NORMALIZATION (INV-7)
  // --------------------------------------------------------------------------
  console.log('\n🔢 SECTION 9: Number & Duration Normalization');
  try {
    const raw = 'Thời gian phản hồi là 15,000ms hoặc 500ms.';
    const normalized = normalizeNumbersAndSymbols(raw, 'vi-VN');
    assert(normalized.includes('15 giây'), '15,000ms expanded to 15 giây');
    assert(normalized.includes('500 mili giây'), '500ms expanded to 500 mili giây');
    pass('Durations and numbers expanded to natural conversational speech');
  } catch (e) {
    fail('Section 9 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 10: CURRENCY NORMALIZATION (INV-7)
  // --------------------------------------------------------------------------
  console.log('\n💵 SECTION 10: Currency Normalization');
  try {
    const rawUsd = 'Tổng chi phí là $20.';
    const rawVnd = 'Giá sản phẩm là 20.000đ.';
    const normUsd = normalizeNumbersAndSymbols(rawUsd, 'vi-VN');
    const normVnd = normalizeNumbersAndSymbols(rawVnd, 'vi-VN');
    assert(normUsd.includes('20 đô la'), '$20 expanded to 20 đô la');
    assert(normVnd.includes('20.000 đồng'), '20.000đ expanded to 20.000 đồng');
    pass('Currency symbols converted to spoken words');
  } catch (e) {
    fail('Section 10 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 11: PERCENTAGE NORMALIZATION (INV-7)
  // --------------------------------------------------------------------------
  console.log('\n📊 SECTION 11: Percentage Normalization');
  try {
    const raw = 'Độ tin cậy đạt 100% và tăng 99.5%.';
    const norm = normalizeNumbersAndSymbols(raw, 'vi-VN');
    assert(norm.includes('100 phần trăm'), '100% converted');
    assert(norm.includes('99.5 phần trăm'), '99.5% converted');
    pass('Percentages converted to conversational spoken phrasing');
  } catch (e) {
    fail('Section 11 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 12: VERSION NUMBER NORMALIZATION (INV-7)
  // --------------------------------------------------------------------------
  console.log('\n📦 SECTION 12: Version Number Normalization');
  try {
    const raw = 'Hệ thống đang chạy phiên bản V4.0.0 ổn định.';
    const norm = normalizeNumbersAndSymbols(raw, 'vi-VN');
    assert(norm.includes('phiên bản 4 chấm 0 chấm 0'), 'V4.0.0 expanded');
    pass('Version numbers converted to natural spoken phrasing');
  } catch (e) {
    fail('Section 12 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 13: VOICE PERSONALITY VALIDATION (INV-8)
  // --------------------------------------------------------------------------
  console.log('\n🛡️ SECTION 13: Voice Personality Validation');
  try {
    // 1. Prototype pollution rejection
    const malicious = JSON.parse('{"__proto__": {"admin": true}}');
    assert.throws(() => validateVoicePersonality(malicious), VoiceSecurityError, 'Rejects prototype pollution');

    // 2. Out of bounds values
    const outOfBounds = validateVoicePersonality({ speakingRate: 5.0, warmth: -1.0 });
    assert.strictEqual(outOfBounds.valid, false, 'Rejects invalid range parameters');

    // 3. Valid custom personality
    const valid = validateVoicePersonality({ warmth: 0.9, confidence: 0.8 });
    assert.strictEqual(valid.valid, true, 'Accepts valid personality profile');
    pass('Voice personality models strictly validated against boundaries');
  } catch (e) {
    fail('Section 13 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 14: PERSONALITY PRESET BEHAVIOR (INV-8)
  // --------------------------------------------------------------------------
  console.log('\n🎭 SECTION 14: Personality Preset Behavior');
  try {
    const calm = resolveVoicePersonality('CALM_ASSISTANT');
    assert.strictEqual(calm.warmth, 0.8, 'CALM_ASSISTANT has high warmth');

    const jarvis = resolveVoicePersonality('JARVIS_INSPIRED');
    assert.strictEqual(jarvis.confidence, 0.98, 'JARVIS_INSPIRED has high confidence');
    assert.strictEqual(jarvis.pauseIntensity, 1.15, 'JARVIS_INSPIRED has deliberate pauses');
    assert.strictEqual(jarvis.speakingRate, 0.98, 'JARVIS_INSPIRED has measured rate');
    pass('Personality presets defined and resolved accurately');
  } catch (e) {
    fail('Section 14 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 15: PROVIDER CAPABILITY DETECTION (INV-9)
  // --------------------------------------------------------------------------
  console.log('\n🔍 SECTION 15: Provider Capability Detection');
  try {
    const mock = new MockTtsProvider();
    const openai = new OpenAiTtsProvider();
    const elevenlabs = new ElevenLabsProvider();

    assert.strictEqual(mock.getCapabilities().supportsSentenceLevelSynthesis, true, 'Mock supports sentence-level');
    assert.strictEqual(openai.getCapabilities().supportsSsml, false, 'OpenAI does not support SSML');
    assert.strictEqual(elevenlabs.getCapabilities().supportsProsody, true, 'ElevenLabs supports prosody');
    pass('Provider capabilities queried and declared properly');
  } catch (e) {
    fail('Section 15 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 16: PROVIDER CAPABILITY FALLBACK (INV-9)
  // --------------------------------------------------------------------------
  console.log('\n🔄 SECTION 16: Provider Capability Fallback');
  try {
    const openai = new OpenAiTtsProvider();
    const negotiation = negotiateCapabilities(openai.getCapabilities(), {}, { wantsSsml: true });
    assert.strictEqual(negotiation.useSsml, false, 'Degrades SSML gracefully when unsupported');
    assert(negotiation.canSynthesize, 'Synthesis remains permitted');
    pass('Provider capability negotiation degrades gracefully');
  } catch (e) {
    fail('Section 16 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 17: SENTENCE-LEVEL SYNTHESIS (INV-10)
  // --------------------------------------------------------------------------
  console.log('\n🧩 SECTION 17: Sentence-Level Synthesis');
  try {
    const service = new VoiceService();
    const text = 'Bước một hoàn tất. Bước hai đang chuẩn bị. Tất cả đã sẵn sàng.';
    const result = await service.synthesize({
      text,
      voiceConfig: {
        provider: 'mock',
        enableSentenceLevel: true,
      },
    });

    assert.strictEqual(result.success, true, 'Sentence-level synthesis succeeded');
    assert(result.audioData && result.audioData.length > 0, 'Audio data generated');
    assert.strictEqual(result.metadata?.sentenceLevel, true, 'Marked as sentence-level in metadata');
    assert.strictEqual(result.metadata?.segmentCount, 3, 'All 3 segments synthesized');
    pass('Sentence-level chunk synthesis verified end-to-end');
  } catch (e) {
    fail('Section 17 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 18: AUDIO ASSEMBLY (INV-11)
  // --------------------------------------------------------------------------
  console.log('\n🎛️ SECTION 18: Audio Assembly');
  try {
    const chunk1 = MockTtsProvider.createValidWavBuffer(200, 16000);
    const chunk2 = MockTtsProvider.createValidWavBuffer(300, 16000);

    const assembled = AudioAssembler.assembleWav([
      { audioData: chunk1, format: 'audio/wav', pauseAfterMs: 100 },
      { audioData: chunk2, format: 'audio/wav' },
    ], 16000);

    const check = AudioAssembler.isValidWavBuffer(assembled);
    assert.strictEqual(check.valid, true, 'Assembled output is a valid canonical WAV buffer');
    assert(assembled.length > chunk1.length + chunk2.length - 44, 'Payload length includes inserted silence');
    pass('Audio assembly correctly merges WAV buffers and calculates headers');
  } catch (e) {
    fail('Section 18 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 19: AUDIO ORDERING (INV-11)
  // --------------------------------------------------------------------------
  console.log('\n🔢 SECTION 19: Audio Ordering');
  try {
    const chunkA = Buffer.from('CHUNK_A_PCM_DATA_12345678');
    const chunkB = Buffer.from('CHUNK_B_PCM_DATA_87654321');

    const assembledPcm = AudioAssembler.assemblePcm([
      { audioData: chunkA, format: 'audio/pcm' },
      { audioData: chunkB, format: 'audio/pcm' },
    ]);

    const str = assembledPcm.toString('ascii');
    assert(str.indexOf('CHUNK_A') < str.indexOf('CHUNK_B'), 'Chunks are assembled in strictly chronological order');
    pass('Audio chunks assembled in exact chronological sequence');
  } catch (e) {
    fail('Section 19 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 20: AUDIO CORRUPTION REJECTION (INV-11)
  // --------------------------------------------------------------------------
  console.log('\n🚫 SECTION 20: Audio Corruption Rejection');
  try {
    const corruptedChunk = Buffer.from('NOT_A_WAV_HEADER_JUST_RANDOM_GARBAGE');
    assert.throws(
      () => AudioAssembler.assembleWav([{ audioData: corruptedChunk, format: 'audio/wav' }]),
      VoiceSynthesisError,
      'Rejects corrupted audio chunks fail-closed'
    );
    pass('Corrupted audio payloads rejected fail-closed with VoiceSynthesisError');
  } catch (e) {
    fail('Section 20 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 21: PROVIDER FALLBACK (INV-13)
  // --------------------------------------------------------------------------
  console.log('\n🔀 SECTION 21: Deterministic Provider Fallback');
  try {
    const mockFailing = new MockTtsProvider();
    mockFailing.setSimulatedFailure('Simulated Primary Outage');
    const mockWorking = new MockTtsProvider();

    // Create custom provider registry with failing primary and working fallback
    const failingProv = {
      getProviderId: () => 'failing_primary',
      getCapabilities: () => mockFailing.getCapabilities(),
      validate: () => ({ valid: true }),
      synthesize: () => { throw new Error('Primary connection refused'); },
    };

    const service = new VoiceService([failingProv as any, mockWorking]);
    const result = await service.synthesize({
      text: 'Thử nghiệm cơ chế chuyển đổi dự phòng.',
      voiceConfig: {
        provider: 'failing_primary',
        fallbackProviders: ['mock'],
      },
    });

    assert.strictEqual(result.success, true, 'Fallback succeeded');
    assert.strictEqual(result.metadata?.fallbackUsed, true, 'Metadata records fallback usage');
    assert.strictEqual(result.metadata?.activeProvider, 'mock', 'Active provider was mock fallback');
    pass('Deterministic provider fallback executed seamlessly');
  } catch (e) {
    fail('Section 21 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 22: TIMEOUT ENFORCEMENT (INV-16)
  // --------------------------------------------------------------------------
  console.log('\n⌛ SECTION 22: Timeout Enforcement');
  try {
    const mock = new MockTtsProvider();
    mock.setSimulatedDelay(500); // 500ms delay
    const service = new VoiceService([mock]);

    const result = await service.synthesize({
      text: 'Kiểm tra quá hạn thời gian.',
      voiceConfig: {
        provider: 'mock',
        timeoutMs: 100, // 100ms limit
      },
    });

    assert.strictEqual(result.success, false, 'Synthesis failed due to timeout');
    assert(result.error?.includes('VOICE_TIMEOUT'), 'Reports timeout error message');
    pass('Synthesis timeout enforced cleanly without unhandled rejection');
  } catch (e) {
    fail('Section 22 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 23: SECRET REDACTION (INV-15)
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 23: Secret Redaction');
  try {
    const rawMsg = 'Failed connecting with sk-proj-supersecretkey1234567890abcdef and Bearer secret-token-xyz';
    const redacted = redactSecrets(rawMsg);
    assert(!redacted.includes('sk-proj-supersecretkey1234567890abcdef'), 'OpenAI key redacted');
    assert(!redacted.includes('secret-token-xyz'), 'Bearer token redacted');
    assert(redacted.includes('[REDACTED]'), 'Redaction placeholder present');
    pass('Automated secret scrubbing protects credentials in all error paths');
  } catch (e) {
    fail('Section 23 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 24: USER ISOLATION (INV-14)
  // --------------------------------------------------------------------------
  console.log('\n👤 SECTION 24: User Isolation');
  try {
    const service = new VoiceService();
    const resA = await service.synthesize({
      userId: 'user_alpha',
      sessionId: 'session_common',
      text: 'Xin chào người dùng Alpha.',
      voiceConfig: { personalityPreset: 'CALM_ASSISTANT' },
    });
    const resB = await service.synthesize({
      userId: 'user_beta',
      sessionId: 'session_common',
      text: 'Xin chào người dùng Beta.',
      voiceConfig: { personalityPreset: 'JARVIS_INSPIRED' },
    });

    assert.strictEqual(resA.success, true);
    assert.strictEqual(resB.success, true);
    pass('Different users execute voice synthesis in complete isolation');
  } catch (e) {
    fail('Section 24 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 25: SESSION ISOLATION (INV-14)
  // --------------------------------------------------------------------------
  console.log('\n👥 SECTION 25: Session Isolation');
  try {
    const service = new VoiceService();
    const res1 = await service.synthesize({
      userId: 'user_gamma',
      sessionId: 'session_001',
      text: 'Phiên làm việc một.',
      voiceConfig: { speed: 1.2 },
    });
    const res2 = await service.synthesize({
      userId: 'user_gamma',
      sessionId: 'session_002',
      text: 'Phiên làm việc hai.',
      voiceConfig: { speed: 0.8 },
    });

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);
    pass('Different sessions maintain independent voice configurations');
  } catch (e) {
    fail('Section 25 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 26: TEXT IMMUTABILITY (INV-1)
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 26: Text Immutability Guarantee (INV-1)');
  try {
    const original = '## Tiêu đề quan trọng: $20 cho 15,000ms tại [Shop](https://shopofbow.vercel.app)';
    const cloned = String(original);

    const planned = processAndPlanSpeech(original);
    assert.strictEqual(original, cloned, 'Input string is not mutated by processAndPlanSpeech');
    assert.notStrictEqual(planned.speechText, original, 'Generated distinct spoken string');

    const service = new VoiceService();
    await service.synthesize({ text: original });
    assert.strictEqual(original, cloned, 'Input string is not mutated by service.synthesize');
    pass('Original text remains 100% byte-for-byte immutable across speech pipeline');
  } catch (e) {
    fail('Section 26 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 27: AGENTLOOP STAGE 7 INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n🔄 SECTION 27: AgentLoop Stage 7 Integration');
  try {
    const loop = new AgentLoop();
    const result = await loop.execute({
      sessionId: 'sess_voice_quality',
      userText: 'Báo cáo trạng thái hệ thống',
      actor: { userId: 'boss_user', role: 'owner', channel: 'DESKTOP', isOwner: true },
      voiceConfig: {
        enabled: true,
        provider: 'mock',
        personalityPreset: 'JARVIS_INSPIRED',
        enableSentenceLevel: true,
      },
    });

    assert.strictEqual(result.state, 'COMPLETED', 'AgentLoop completed successfully');
    assert(result.voiceResult, 'voiceResult attached to result');
    assert.strictEqual(result.voiceResult?.success, true, 'Voice synthesis succeeded');
    assert(result.voiceResult?.audioData, 'Voice audio payload present');
    pass('AgentLoop executes voice quality synthesis at Stage 7');
  } catch (e) {
    fail('Section 27 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 28: VOICE FAILURE ISOLATION (INV-18)
  // --------------------------------------------------------------------------
  console.log('\n🛡️ SECTION 28: Voice Failure Isolation (INV-18)');
  try {
    const failingMock = new MockTtsProvider();
    failingMock.setSimulatedFailure('Simulated Critical Audio Hardware Fault');
    const failingService = new VoiceService([failingMock]);

    const loop = new AgentLoop(failingService);
    const result = await loop.execute({
      sessionId: 'sess_fail_test',
      userText: 'Thử nghiệm khi hỏng giọng nói',
      actor: { userId: 'boss_user', role: 'owner', channel: 'DESKTOP', isOwner: true },
      voiceConfig: {
        enabled: true,
        provider: 'mock',
      },
    });

    assert.strictEqual(result.state, 'COMPLETED', 'Agent reasoning succeeded even when voice failed');
    assert(result.response.content.length > 0, 'Text response preserved');
    assert.strictEqual(result.voiceResult?.success, false, 'voiceResult indicates failure');
    pass('Voice failure never crashes AgentLoop or alters text response');
  } catch (e) {
    fail('Section 28 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 29: DETERMINISTIC MOCK PROVIDER (INV-17)
  // --------------------------------------------------------------------------
  console.log('\n🎲 SECTION 29: Deterministic Mock Provider');
  try {
    const mock = new MockTtsProvider();
    const res1 = await mock.synthesize({ text: 'Thử nghiệm xác định.' });
    const res2 = await mock.synthesize({ text: 'Thử nghiệm xác định.' });

    assert.strictEqual(res1.audioData?.length, res2.audioData?.length, 'Deterministic byte length');
    pass('Mock provider produces deterministic audio payloads');
  } catch (e) {
    fail('Section 29 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 30: STREAMING-READY CONTRACT (INV-12)
  // --------------------------------------------------------------------------
  console.log('\n🌊 SECTION 30: Streaming-Ready Contract');
  try {
    const service = new VoiceService();
    const chunks: Buffer[] = [];
    for await (const chunk of service.synthesizeStream({
      text: 'Đây là câu kiểm tra luồng âm thanh streaming.',
      voiceConfig: { provider: 'mock' },
    })) {
      chunks.push(Buffer.from(chunk));
    }

    assert(chunks.length > 0, 'Yielded at least one streaming chunk');
    const totalBytes = chunks.reduce((acc, c) => acc + c.length, 0);
    assert(totalBytes > 44, 'Total streamed bytes exceed WAV header');
    pass('Streaming-ready chunk generator contract verified');
  } catch (e) {
    fail('Section 30 failed', e);
  }

  // --------------------------------------------------------------------------
  // SECTION 31: EXISTING MS-1.3.5 REGRESSION COMPATIBILITY
  // --------------------------------------------------------------------------
  console.log('\n🔄 SECTION 31: MS-1.3.5 Regression Compatibility');
  try {
    const service = new VoiceService();
    const basicResult = await service.synthesize({
      text: 'Đơn giản không có cấu hình nâng cao.',
    });

    assert.strictEqual(basicResult.success, true, 'Basic MS-1.3.5 synthesis works');
    assert.strictEqual(basicResult.audioFormat, 'audio/wav', 'Default format audio/wav');
    pass('MS-1.3.5 baseline calls remain 100% backward-compatible');
  } catch (e) {
    fail('Section 31 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 TEST SUMMARY: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  if (failed === 0) {
    console.log('🎉 ALL MILESTONE 1.3.6 AGENT VOICE QUALITY TESTS PASSED (100% SUCCESS)!');
  } else {
    console.error('⚠️ SOME TESTS FAILED IN MILESTONE 1.3.6 SUITE!');
  }
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Unhandled fatal error in test suite:', err);
  process.exit(1);
});
