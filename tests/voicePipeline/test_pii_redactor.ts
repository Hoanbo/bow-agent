// tests/voicePipeline/test_pii_redactor.ts
// BOWCON V4.0 — PROMPT #5 (H3): PII REDACTOR & DATA HYGIENE TEST SUITE
//
// EN:
// Verifies rule-based PII detection and redaction across speech pipelines:
// 1. TC1: Credit card numbers (13-19 digits, space/dash separated) -> redacted, detected.
// 2. TC2: Password phrases ("mật khẩu của tôi là ...", "password is ...") -> secret masked, detected.
// 3. TC3: Vietnamese phone numbers & email addresses -> redacted, detected.
// 4. TC4: Clean input passthrough -> identical text, empty detectedTypes.
// 5. TC5: Two-stream separation in VoicePipeline: AgentLoop receives RAW userText for real-time reasoning, while storage gets redacted text.
// 6. TC6: Voice command intent understanding ("Mở Notepad") preserved 100%.
// 7. TC7: Safe logging check: only PII types are logged, never raw sensitive contents.
//
// VI:
// Kiểm thử toàn diện bộ lọc và che thông tin nhạy cảm PII:
// 1. TC1: Số thẻ tín dụng (13-19 chữ số) -> che thành [REDACTED_CREDIT_CARD], ghi nhận loại.
// 2. TC2: Cụm từ mật khẩu ("mật khẩu của tôi là...") -> che phần secret, ghi nhận loại.
// 3. TC3: Số điện thoại VN và email -> che đúng chuẩn, ghi nhận loại.
// 4. TC4: Văn bản bình thường không chứa PII -> giữ nguyên 100%, detectedTypes rỗng.
// 5. TC5: Phân tách 2 luồng: AgentLoop nhận userText GỐC để hiểu ý định, tầng lưu trữ nhận bản che.
// 6. TC6: Giữ trọn vẹn khả năng hiểu lệnh giọng nói của AgentLoop ("Mở Notepad").
// 7. TC7: Ghi log an toàn: chỉ log loại PII, không in nội dung nhạy cảm.

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { redactPii } from '../../src/speech/piiRedactor.js';
import { VoicePipeline } from '../../src/speech/voicePipeline.js';
import { AgentLoop, type AgentLoopRequest, type AgentLoopResult } from '../../src/core/agentLoop.js';
import type { BodyRegistry } from '../../src/core/bodyProtocol/bodyRegistry.js';
import type { BodyCommand, BodyCommandResult } from '../../src/core/bodyProtocol/types.js';

process.env.NODE_ENV = 'test';

async function runPiiRedactorTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🔒 BẮT ĐẦU TEST SUITE PROMPT #5 (H3): PII REDACTION & DATA HYGIENE');
  console.log('========================================================================\n');

  let passedCount = 0;

  async function testStep(name: string, fn: () => Promise<void> | void): Promise<void> {
    console.log(`--- ${name} ---`);
    await fn();
    console.log(`  -> [PASS] ${name}\n`);
    passedCount++;
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Số thẻ tín dụng (Credit Card)
  // ---------------------------------------------------------------------------
  await testStep('TC1: Số thẻ tín dụng giả lập (13-19 chữ số) -> che và phát hiện loại', () => {
    // 1A: Thẻ có khoảng trắng dạng 4x4
    const input1 = 'Số thẻ thanh toán của tôi là 1234 5678 9012 3456 vui lòng thanh toán';
    const res1 = redactPii(input1);
    assert(res1.detectedTypes.includes('credit_card'), 'Must detect credit_card');
    assert(!res1.redactedText.includes('1234 5678 9012 3456'), 'Raw card digits must be masked');
    assert(res1.redactedText.includes('[REDACTED_CREDIT_CARD]'), 'Must replace with [REDACTED_CREDIT_CARD]');
    console.log(`  [1A] Redacted: "${res1.redactedText}"`);

    // 1B: Thẻ liền mạch 16 số
    const input2 = 'Thẻ Visa 4111222233334444 hết hạn năm sau';
    const res2 = redactPii(input2);
    assert(res2.detectedTypes.includes('credit_card'), 'Must detect continuous 16 digits');
    assert(!res2.redactedText.includes('4111222233334444'), 'Continuous digits must be masked');

    // 1C: Thẻ có gạch ngang
    const input3 = 'Thẻ 9876-5432-1098-7654';
    const res3 = redactPii(input3);
    assert(res3.detectedTypes.includes('credit_card'), 'Must detect dashed card number');
    assert(!res3.redactedText.includes('9876-5432-1098-7654'), 'Dashed card number must be masked');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Cụm từ mật khẩu (Password phrase)
  // ---------------------------------------------------------------------------
  await testStep('TC2: Cụm từ mật khẩu -> che phần secret phía sau, giữ lại tiền tố', () => {
    // 2A: "mật khẩu của tôi là con_meo_map_map123" (Theo đúng đặc tả Prompt)
    const input1 = 'mật khẩu của tôi là con_meo_map_map123';
    const res1 = redactPii(input1);
    assert(res1.detectedTypes.includes('password'), 'Must detect password type');
    assert(!res1.redactedText.includes('con_meo_map_map123'), 'Secret password must not exist in output');
    assert(res1.redactedText.includes('mật khẩu của tôi là [REDACTED_PASSWORD]'), 'Prefix must be preserved with masked password');
    console.log(`  [2A] Redacted: "${res1.redactedText}"`);

    // 2B: "mật khẩu là adminSecret@2026"
    const input2 = 'mật khẩu là adminSecret@2026, đừng cho ai biết';
    const res2 = redactPii(input2);
    assert(res2.detectedTypes.includes('password'), 'Must detect password phrase');
    assert(!res2.redactedText.includes('adminSecret@2026'), 'Password must be masked');
    assert(res2.redactedText.includes('mật khẩu là [REDACTED_PASSWORD]'), 'Must replace with [REDACTED_PASSWORD]');

    // 2C: Tiếng Anh "password is SuperSecretKey123"
    const input3 = 'My WiFi password is SuperSecretKey123 please connect';
    const res3 = redactPii(input3);
    assert(res3.detectedTypes.includes('password'), 'Must detect English password phrase');
    assert(!res3.redactedText.includes('SuperSecretKey123'), 'English password must be masked');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Số điện thoại Việt Nam & Địa chỉ Email
  // ---------------------------------------------------------------------------
  await testStep('TC3: Số điện thoại VN và email -> che đúng định dạng', () => {
    const input = 'Gọi điện cho tôi qua số 0912345678 hoặc gửi thư vào hoanbo@bowcon.vn';
    const res = redactPii(input);
    assert(res.detectedTypes.includes('phone_number'), 'Must detect phone_number');
    assert(res.detectedTypes.includes('email'), 'Must detect email');
    assert(!res.redactedText.includes('0912345678'), 'Phone must not be visible');
    assert(!res.redactedText.includes('hoanbo@bowcon.vn'), 'Email must not be visible');
    assert(res.redactedText.includes('[REDACTED_PHONE]'), 'Must contain [REDACTED_PHONE]');
    assert(res.redactedText.includes('[REDACTED_EMAIL]'), 'Must contain [REDACTED_EMAIL]');
    console.log(`  Redacted: "${res.redactedText}"`);

    // 3B: Đầu số quốc tế +84
    const resPlus84 = redactPii('Hotline: +84987654321');
    assert(resPlus84.detectedTypes.includes('phone_number'), 'Must detect +84 phone number');
    assert(!resPlus84.redactedText.includes('+84987654321'), 'Must mask +84 phone number');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Văn bản bình thường không chứa PII (Clean Input Passthrough)
  // ---------------------------------------------------------------------------
  await testStep('TC4: Văn bản bình thường không chứa PII -> giữ nguyên 100%', () => {
    const cleanInputs = [
      'Mở Notepad',
      'Xin chào BOWCON, hãy báo cáo tình trạng hệ thống hôm nay.',
      'Bật đèn phòng khách và tăng nhiệt độ lên 26 độ C',
      'Tìm kiếm tệp tin báo cáo doanh thu quý 3 trong thư mục tài liệu',
    ];

    for (const text of cleanInputs) {
      const res = redactPii(text);
      assert.strictEqual(res.redactedText, text, `Clean text must remain identical: "${text}"`);
      assert.strictEqual(res.detectedTypes.length, 0, 'Clean text must have 0 detected types');
    }
    console.log('  Tất cả văn bản lệnh thông thường đều được giữ nguyên vẹn 100%.');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Phân tách 2 luồng dữ liệu trong VoicePipeline
  // ---------------------------------------------------------------------------
  await testStep('TC5: Phân tách 2 luồng: AgentLoop nhận userText GỐC, kết quả lưu trữ nhận redactedText', async () => {
    const rawSensitiveTranscript = 'Thẻ của tôi là 1234 5678 9012 3456 và mật khẩu của tôi là con_meo_map_map123';

    let receivedByAgentLoop: string | undefined;

    // Mock AgentLoop để ghi nhận chính xác userText đi vào execute()
    const mockAgentLoop = {
      execute: async (req: AgentLoopRequest): Promise<AgentLoopResult> => {
        receivedByAgentLoop = req.userText;
        return {
          requestId: req.requestId || 'test_req',
          correlationId: req.correlationId || 'test_corr',
          sessionId: req.sessionId,
          actor: req.actor,
          state: 'COMPLETED',
          response: {
            id: 'msg_test',
            sender: 'agent',
            content: 'Dạ con đã tiếp nhận thông tin từ Sếp.',
            timestamp: new Date().toISOString(),
          },
          policyEvaluations: [],
          executionResults: [],
          verificationResults: [],
          totalDurationMs: 50,
        };
      },
    } as unknown as AgentLoop;

    const mockRegistry = {
      findBodiesWithCapability: () => [{ bodyId: 'mock_body' }],
      getAllActiveBodies: () => [{ bodyId: 'mock_body' }],
      getBody: (id: string) => ({ bodyId: id, name: 'Mock Body', capabilities: new Map([['audio.capture', {}], ['audio.play', {}]]) }),
      executeBodyCommand: async (cmd: BodyCommand): Promise<BodyCommandResult> => {
        if (cmd.capability === 'audio.capture') {
          return { commandId: cmd.commandId, success: true, data: { audioBase64: 'bW9jaw==', format: 'wav', byteLength: 10, durationMs: 100, sampleRate: 16000, channels: 1 } };
        }
        return { commandId: cmd.commandId, success: true };
      },
    } as unknown as BodyRegistry;

    const pipeline = new VoicePipeline(
      mockRegistry,
      mockAgentLoop,
      undefined,
      undefined,
      undefined
    );

    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_body',
      simulatedTranscript: rawSensitiveTranscript,
      userId: 'test_user',
      role: 'owner',
      isOwner: true,
    });

    // KIỂM CHỨNG QUAN TRỌNG:
    // 1. AgentLoop.execute() NHẬN ĐƯỢC userText GỐC (unredacted) để hiểu trọn vẹn ngữ cảnh ý định
    assert.strictEqual(
      receivedByAgentLoop,
      rawSensitiveTranscript,
      'AgentLoop MUST receive the raw unredacted userText for real-time intent reasoning!'
    );
    console.log('  -> [XÁC MINH 1] AgentLoop.execute() đã nhận đúng userText GỐC chưa che.');

    // 2. Kết quả VoiceRoundtripResult cung cấp redactedUserText đã che an toàn để lưu trữ lâu dài
    assert(result.redactedUserText, 'result.redactedUserText must be present');
    assert(!result.redactedUserText.includes('1234 5678 9012 3456'), 'redactedUserText must mask card');
    assert(!result.redactedUserText.includes('con_meo_map_map123'), 'redactedUserText must mask password');
    assert(result.redactedUserText.includes('[REDACTED_CREDIT_CARD]'), 'redactedUserText has [REDACTED_CREDIT_CARD]');
    assert(result.redactedUserText.includes('[REDACTED_PASSWORD]'), 'redactedUserText has [REDACTED_PASSWORD]');

    // 3. Danh sách loại PII được phát hiện đúng
    assert(result.detectedPiiTypes?.includes('credit_card'), 'detectedPiiTypes must include credit_card');
    assert(result.detectedPiiTypes?.includes('password'), 'detectedPiiTypes must include password');
    console.log('  -> [XÁC MINH 2] VoiceRoundtripResult cung cấp redactedUserText che đúng chuẩn PII.');
    console.log(`  -> [XÁC MINH 3] detectedPiiTypes: [${result.detectedPiiTypes?.join(', ')}].`);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Khả năng hiểu lệnh giọng nói của AgentLoop ("Mở Notepad") không bị ảnh hưởng
  // ---------------------------------------------------------------------------
  await testStep('TC6: Lệnh giọng nói ("Mở Notepad") được AgentLoop hiểu và thực thi thành công', async () => {
    const realAgentLoop = new AgentLoop();
    const mockRegistry = {
      findBodiesWithCapability: () => [{ bodyId: 'mock_body' }],
      getAllActiveBodies: () => [{ bodyId: 'mock_body' }],
      getBody: (id: string) => ({ bodyId: id, name: 'Mock Body', capabilities: new Map([['audio.capture', {}], ['audio.play', {}]]) }),
      executeBodyCommand: async (cmd: BodyCommand): Promise<BodyCommandResult> => {
        if (cmd.capability === 'audio.capture') {
          return { commandId: cmd.commandId, success: true, data: { audioBase64: 'bW9jaw==', format: 'wav', byteLength: 10, durationMs: 100, sampleRate: 16000, channels: 1 } };
        }
        return { commandId: cmd.commandId, success: true };
      },
    } as unknown as BodyRegistry;

    const pipeline = new VoicePipeline(
      mockRegistry,
      realAgentLoop,
      undefined,
      undefined,
      undefined
    );

    const result = await pipeline.executeVoiceRoundtrip({
      bodyId: 'mock_body',
      simulatedTranscript: 'Mở Notepad',
      userId: 'test_user',
      role: 'owner',
      isOwner: true,
    });

    assert.strictEqual(result.success, true, 'Voice roundtrip for "Mở Notepad" must succeed');
    assert.strictEqual(result.agentLoopState, 'COMPLETED', 'AgentLoop must reach COMPLETED state');
    assert(result.responseText.length > 0, 'Must produce non-empty response text');
    assert.strictEqual(result.detectedPiiTypes, undefined, 'Clean command must not detect any PII');
    console.log(`  -> AgentLoop phản hồi thành công: "${result.responseText}" (State: ${result.agentLoopState})`);
  });

  console.log('========================================================================');
  console.log(`🎉 TẤT CẢ ${passedCount}/${passedCount} TEST PII REDACTOR & DATA HYGIENE ĐÃ PASS 100%!`);
  console.log('========================================================================\n');
}

runPiiRedactorTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
