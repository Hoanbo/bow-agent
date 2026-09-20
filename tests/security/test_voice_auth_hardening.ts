// tests/security/test_voice_auth_hardening.ts
// BOWCON V4.0 — PROMPT #1 SECURITY HARDENING VERIFICATION TEST SUITE
//
// Verifies:
// 1. POST /api/body/command without BOW_ALLOW_DEBUG_ENDPOINTS returns 403 Forbidden.
// 2. POST /api/body/command with BOW_ALLOW_DEBUG_ENDPOINTS=true but missing/invalid token returns 401 Unauthorized.
// 3. POST /api/body/command with valid token but without PDP approval token for audio.capture returns 403 POLICY_DENIED.
// 4. /ws/audio-stream without secret is rejected with 401 (even in non-production).
// 5. /ws/audio-stream with invalid secret is rejected with 401.
// 6. /ws/robot without secret is rejected with 401.
// 7. /ws/robot with valid secret connects successfully (101).
// 8. /ws/desktop without token is rejected with 401.
// 9. Unknown WebSocket paths are rejected with 404.
// 10. BodyRegistry automatically overrides riskLevel to 'high' for any audio.* capability.

import assert from 'node:assert';
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { BowCentralAgentServer } from '../../src/server.js';
import { CONFIG } from '../../src/config.js';
import { globalBodyRegistry, getBodyPsk, type CapabilityAdvertisement } from '../../src/core/bodyProtocol/index.js';
import { ensureTlsCertificates } from '../../src/security/tlsCertManager.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const certPaths = ensureTlsCertificates();
const caCert = fs.readFileSync(certPaths.caCertPath);

const TEST_PORT = 4192;

function connectRawWs(url: string, headers: Record<string, string> = {}): Promise<{ httpStatus?: number; ws?: WebSocket; error?: any }> {
  return new Promise((resolve) => {
    let settled = false;
    const ws = new WebSocket(url, { headers, ca: caCert, rejectUnauthorized: false });

    ws.on('unexpected-response', (_req, res) => {
      if (!settled) {
        settled = true;
        resolve({ httpStatus: res.statusCode, ws });
      }
    });

    ws.on('open', () => {
      if (!settled) {
        settled = true;
        resolve({ httpStatus: 101, ws });
      }
    });

    ws.on('error', (err) => {
      if (!settled) {
        settled = true;
        resolve({ error: err, ws });
      }
    });
  });
}

async function runHardeningTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🛡️  BẮT ĐẦU KIỂM THỬ BẢO MẬT: VOICE PIPELINE & BODY PROTOCOL HARDENING');
  console.log('========================================================================\n');

  // Đảm bảo không có cờ debug trước khi bắt đầu
  delete process.env.BOW_ALLOW_DEBUG_ENDPOINTS;

  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  console.log(`[TEST-HARDENING] Test server listening on port ${TEST_PORT}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: POST /api/body/command khi chưa bật BOW_ALLOW_DEBUG_ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: POST /api/body/command khi cờ debug TẮT ---');
    const res1 = await fetch(`https://127.0.0.1:${TEST_PORT}/api/body/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'audio.capture', params: { durationMs: 2000 } }),
    });
    console.log(`HTTP Status: ${res1.status}`);
    const json1 = await res1.json();
    console.log(`Response body:`, JSON.stringify(json1));
    assert.strictEqual(res1.status, 403, 'Kỳ vọng HTTP 403 Forbidden khi cờ debug bị tắt');
    assert.strictEqual(json1.error, 'DEBUG_ENDPOINT_DISABLED');
    console.log('✅ PASS Test 1: Endpoint /api/body/command mặc định bị KHÓA hoàn toàn.\n');

    // -------------------------------------------------------------------------
    // TEST 2: POST /api/body/command khi bật debug nhưng KHÔNG có Bearer Token
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: POST /api/body/command khi bật debug nhưng KHÔNG có Auth Token ---');
    process.env.BOW_ALLOW_DEBUG_ENDPOINTS = 'true';
    const res2 = await fetch(`https://127.0.0.1:${TEST_PORT}/api/body/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'audio.capture', params: { durationMs: 2000 } }),
    });
    console.log(`HTTP Status: ${res2.status}`);
    const json2 = await res2.json();
    console.log(`Response body:`, JSON.stringify(json2));
    assert.strictEqual(res2.status, 401, 'Kỳ vọng HTTP 401 Unauthorized khi thiếu token');
    assert.strictEqual(json2.error, 'UNAUTHORIZED');
    console.log('✅ PASS Test 2: Yêu cầu không có Auth Token bị từ chối 401 Unauthorized.\n');

    // -------------------------------------------------------------------------
    // TEST 3: POST /api/body/command với token sai
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: POST /api/body/command với Auth Token sai / giả mạo ---');
    const res3 = await fetch(`https://127.0.0.1:${TEST_PORT}/api/body/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_tampered_token_xyz',
      },
      body: JSON.stringify({ capability: 'audio.capture', params: { durationMs: 2000 } }),
    });
    console.log(`HTTP Status: ${res3.status}`);
    const json3 = await res3.json();
    assert.strictEqual(res3.status, 401, 'Kỳ vọng HTTP 401 Unauthorized khi token sai');
    console.log('✅ PASS Test 3: Token sai bị từ chối 401 Unauthorized.\n');

    // -------------------------------------------------------------------------
    // TEST 4: POST /api/body/command với token hợp lệ nhưng gọi audio.capture
    // mà không có ExecutionToken duyệt bởi PDP (khi PTT tắt -> HIGH_IMPACT)
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: POST /api/body/command với token đúng nhưng thiếu PDP Approval Token ---');
    process.env.REQUIRE_PUSH_TO_TALK = 'false';
    const validPsk = getBodyPsk();
    const res4 = await fetch(`https://127.0.0.1:${TEST_PORT}/api/body/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validPsk}`,
      },
      body: JSON.stringify({ capability: 'audio.capture', params: { durationMs: 2000 } }),
    });
    delete process.env.REQUIRE_PUSH_TO_TALK;
    console.log(`HTTP Status: ${res4.status}`);
    const json4 = await res4.json();
    console.log(`Response body:`, JSON.stringify(json4));
    assert.strictEqual(res4.status, 403, 'Kỳ vọng HTTP 403 Forbidden khi thiếu approval token cho HIGH_IMPACT action');
    assert.strictEqual(json4.error, 'POLICY_DENIED');
    assert.strictEqual(json4.classification, 'HIGH_IMPACT');
    assert.strictEqual(json4.requiresApproval, true);
    console.log('✅ PASS Test 4: Lệnh audio.capture bị PDP chặn (POLICY_DENIED, HIGH_IMPACT) vì chưa qua phê duyệt.\n');

    // -------------------------------------------------------------------------
    // TEST 5: /ws/audio-stream KHÔNG có robot secret -> Bị từ chối 401
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: Kết nối /ws/audio-stream KHÔNG có secret ---');
    const wsRes5 = await connectRawWs(`wss://127.0.0.1:${TEST_PORT}/ws/audio-stream`);
    console.log(`HTTP Status: ${wsRes5.httpStatus}`);
    assert.strictEqual(wsRes5.httpStatus, 401, 'Kỳ vọng HTTP 401 Unauthorized khi thiếu secret');
    if (wsRes5.ws) wsRes5.ws.terminate();
    console.log('✅ PASS Test 5: /ws/audio-stream không có secret bị từ chối 401.\n');

    // -------------------------------------------------------------------------
    // TEST 6: /ws/audio-stream với secret SAI -> Bị từ chối 401
    // -------------------------------------------------------------------------
    console.log('--- TEST 6: Kết nối /ws/audio-stream với secret SAI ---');
    const wsRes6 = await connectRawWs(`wss://127.0.0.1:${TEST_PORT}/ws/audio-stream?secret=wrong_secret_123`);
    console.log(`HTTP Status: ${wsRes6.httpStatus}`);
    assert.strictEqual(wsRes6.httpStatus, 401, 'Kỳ vọng HTTP 401 Unauthorized khi secret sai');
    if (wsRes6.ws) wsRes6.ws.terminate();
    console.log('✅ PASS Test 6: /ws/audio-stream với secret sai bị từ chối 401.\n');

    // -------------------------------------------------------------------------
    // TEST 7: /ws/robot KHÔNG có secret -> Bị từ chối 401
    // -------------------------------------------------------------------------
    console.log('--- TEST 7: Kết nối /ws/robot KHÔNG có secret ---');
    const wsRes7 = await connectRawWs(`wss://127.0.0.1:${TEST_PORT}/ws/robot`);
    console.log(`HTTP Status: ${wsRes7.httpStatus}`);
    assert.strictEqual(wsRes7.httpStatus, 401, 'Kỳ vọng HTTP 401 Unauthorized khi thiếu secret');
    if (wsRes7.ws) wsRes7.ws.terminate();
    console.log('✅ PASS Test 7: /ws/robot không có secret bị từ chối 401.\n');

    // -------------------------------------------------------------------------
    // TEST 8: /ws/robot với secret HỢP LỆ -> Thành công (101 Switching Protocols)
    // -------------------------------------------------------------------------
    console.log('--- TEST 8: Kết nối /ws/robot với secret ĐÚNG ---');
    const wsRes8 = await connectRawWs(`wss://127.0.0.1:${TEST_PORT}/ws/robot?secret=${encodeURIComponent(CONFIG.robotGatewaySecret)}`);
    console.log(`HTTP Status: ${wsRes8.httpStatus}`);
    assert.strictEqual(wsRes8.httpStatus, 101, 'Kỳ vọng HTTP 101 khi secret đúng');
    if (wsRes8.ws) wsRes8.ws.terminate();
    console.log('✅ PASS Test 8: /ws/robot với secret hợp lệ kết nối thành công.\n');

    // -------------------------------------------------------------------------
    // TEST 9: /ws/desktop KHÔNG có auth token -> Bị từ chối 401
    // -------------------------------------------------------------------------
    console.log('--- TEST 9: Kết nối /ws/desktop KHÔNG có auth token ---');
    const wsRes9 = await connectRawWs(`wss://127.0.0.1:${TEST_PORT}/ws/desktop`);
    console.log(`HTTP Status: ${wsRes9.httpStatus}`);
    assert.strictEqual(wsRes9.httpStatus, 401, 'Kỳ vọng HTTP 401 Unauthorized khi thiếu desktop token');
    if (wsRes9.ws) wsRes9.ws.terminate();
    console.log('✅ PASS Test 9: /ws/desktop không có token bị từ chối 401.\n');

    // -------------------------------------------------------------------------
    // TEST 10: WebSocket path lạ -> Bị từ chối 404 Not Found
    // -------------------------------------------------------------------------
    console.log('--- TEST 10: Kết nối đường dẫn WebSocket lạ /ws/unauthorized_random_path ---');
    const wsRes10 = await connectRawWs(`wss://127.0.0.1:${TEST_PORT}/ws/unauthorized_random_path`);
    console.log(`HTTP Status: ${wsRes10.httpStatus}`);
    assert.strictEqual(wsRes10.httpStatus, 404, 'Kỳ vọng HTTP 404 Not Found cho đường dẫn không hợp lệ');
    if (wsRes10.ws) wsRes10.ws.terminate();
    console.log('✅ PASS Test 10: Đường dẫn WebSocket lạ bị từ chối 404 Not Found.\n');

    // -------------------------------------------------------------------------
    // TEST 11: BodyRegistry tự động ép riskLevel = 'high' cho mọi capability audio.*
    // -------------------------------------------------------------------------
    console.log('--- TEST 11: BodyRegistry tự động override riskLevel cho audio.capture và audio.play ---');
    const ad: CapabilityAdvertisement = {
      bodyId: 'test_hardening_body_audio',
      bodyType: 'desktop',
      name: 'Test Hardening Body',
      capabilities: [
        {
          name: 'audio.capture',
          description: 'Microphone capture (self-declared low risk)',
          riskLevel: 'low', // Body tự khai báo low
        },
        {
          name: 'audio.play',
          description: 'Speaker playback (self-declared low risk)',
          riskLevel: 'low', // Body tự khai báo low
        },
        {
          name: 'system.open_app',
          description: 'Open app',
          riskLevel: 'low',
        },
      ],
      timestamp: Date.now(),
    };

    process.env.REQUIRE_PUSH_TO_TALK = 'false';
    const registered = globalBodyRegistry.registerBody(ad);
    delete process.env.REQUIRE_PUSH_TO_TALK;
    const capCapture = registered.capabilities.get('audio.capture');
    const capPlay = registered.capabilities.get('audio.play');
    const capOpenApp = registered.capabilities.get('system.open_app');

    console.log(`audio.capture riskLevel: ${capCapture?.riskLevel}`);
    console.log(`audio.play riskLevel: ${capPlay?.riskLevel}`);
    console.log(`system.open_app riskLevel: ${capOpenApp?.riskLevel}`);

    assert.strictEqual(capCapture?.riskLevel, 'high', 'audio.capture phải bị ép thành high');
    assert.strictEqual(capPlay?.riskLevel, 'high', 'audio.play phải bị ép thành high');
    assert.strictEqual(capOpenApp?.riskLevel, 'low', 'system.open_app giữ nguyên riskLevel ban đầu');

    globalBodyRegistry.unregisterBody('test_hardening_body_audio');
    console.log('✅ PASS Test 11: BodyRegistry đã gán cứng riskLevel = high cho mọi capability audio.* thành công.\n');

    console.log('========================================================================');
    console.log('🎉 TOÀN BỘ 11/11 TEST BẢO MẬT ĐÃ PASS THÀNH CÔNG!');
    console.log('========================================================================\n');
  } finally {
    delete process.env.BOW_ALLOW_DEBUG_ENDPOINTS;
    await server.stop();
  }
}

runHardeningTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
