// tests/test_body_auth.ts
// BOWCON V4.0 — BODY PROTOCOL PSK AUTHENTICATION VERIFICATION
//
// Verifies:
// 1. Connection without Authorization header is rejected with HTTP 401 Unauthorized.
// 2. Connection with invalid/tampered Bearer PSK is rejected with HTTP 401 Unauthorized.
// 3. Rejected bodies NEVER get registered in BodyRegistry.
// 4. Connection with valid PSK succeeds and registers into BodyRegistry.

import { WebSocket } from 'ws';
import { BowCentralAgentServer } from '../src/server.js';
import { globalBodyRegistry, getBodyPsk, type CapabilityAdvertisement } from '../src/core/bodyProtocol/index.js';

const TEST_PORT = 4091;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws/body`;

function connectRawWebSocket(url: string, headers: Record<string, string>): Promise<{ ws?: WebSocket; httpStatus?: number; error?: any }> {
  return new Promise((resolve) => {
    let settled = false;
    const ws = new WebSocket(url, { headers });

    ws.on('unexpected-response', (_req, res) => {
      if (!settled) {
        settled = true;
        resolve({ ws, httpStatus: res.statusCode });
      }
    });

    ws.on('open', () => {
      if (!settled) {
        settled = true;
        resolve({ ws, httpStatus: 101 });
      }
    });

    ws.on('error', (err) => {
      if (!settled) {
        settled = true;
        resolve({ ws, error: err });
      }
    });
  });
}

async function runBodyAuthTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🔒 BẮT ĐẦU KIỂM CHỨNG BẢO MẬT BODY PROTOCOL PSK AUTHENTICATION');
  console.log('========================================================================\n');

  // Start Central Brain
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  console.log(`[TEST-AUTH] Central Brain server đã khởi động trên cổng ${TEST_PORT}.\n`);

  const authoritativePsk = getBodyPsk();
  console.log(`[TEST-AUTH] PSK xác thực hiện tại: ${authoritativePsk.slice(0, 8)}... (độ dài: ${authoritativePsk.length})\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: KẾT NỐI KHÔNG CÓ HEADER AUTHORIZATION
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: KẾT NỐI KHÔNG CÓ HEADER AUTHORIZATION ---');
    const res1 = await connectRawWebSocket(WS_URL, {});
    console.log(`Kết quả Test 1 HTTP Status: ${res1.httpStatus}`);
    if (res1.httpStatus !== 401) {
      throw new Error(`FAIL Test 1: Kỳ vọng HTTP 401 Unauthorized nhưng nhận status: ${res1.httpStatus}`);
    }
    if (res1.ws) {
      res1.ws.terminate();
    }

    // Đợi 200ms và kiểm tra BodyRegistry
    await new Promise((r) => setTimeout(r, 200));
    const allBodies1 = globalBodyRegistry.getAllActiveBodies();
    if (allBodies1.length !== 0) {
      throw new Error(`FAIL Test 1: BodyRegistry có ${allBodies1.length} body sau kết nối trái phép!`);
    }
    console.log('✅ PASS Test 1: Kết nối không header bị từ chối với 401 và không lọt vào BodyRegistry.\n');

    // -------------------------------------------------------------------------
    // TEST 2: KẾT NỐI VỚI PSK SAI / GIẢ MẠO
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: KẾT NỐI VỚI PSK SAI / GIẢ MẠO ---');
    const res2 = await connectRawWebSocket(WS_URL, {
      Authorization: 'Bearer invalid_tampered_psk_99999999999999999999999999999999',
    });
    console.log(`Kết quả Test 2 HTTP Status: ${res2.httpStatus}`);
    if (res2.httpStatus !== 401) {
      throw new Error(`FAIL Test 2: Kỳ vọng HTTP 401 Unauthorized khi PSK sai nhưng nhận status: ${res2.httpStatus}`);
    }
    if (res2.ws) {
      res2.ws.terminate();
    }

    await new Promise((r) => setTimeout(r, 200));
    const allBodies2 = globalBodyRegistry.getAllActiveBodies();
    if (allBodies2.length !== 0) {
      throw new Error(`FAIL Test 2: BodyRegistry có ${allBodies2.length} body sau kết nối PSK sai!`);
    }
    console.log('✅ PASS Test 2: Kết nối với PSK sai bị từ chối với 401 và không lọt vào BodyRegistry.\n');

    // -------------------------------------------------------------------------
    // TEST 3: KẾT NỐI VỚI PSK HỢP LỆ VÀ ĐĂNG KÝ
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: KẾT NỐI VỚI PSK HỢP LỆ (AUTHORIZATION: BEARER <PSK>) ---');
    const res3 = await connectRawWebSocket(WS_URL, {
      Authorization: `Bearer ${authoritativePsk}`,
    });
    console.log(`Kết quả Test 3 HTTP Status: ${res3.httpStatus}`);
    if (res3.httpStatus !== 101 || !res3.ws) {
      throw new Error(`FAIL Test 3: Kết nối hợp lệ thất bại! HTTP Status: ${res3.httpStatus}`);
    }

    const testBodyId = 'authorized_test_body_01';
    const advertisement: CapabilityAdvertisement = {
      bodyId: testBodyId,
      bodyType: 'desktop',
      name: 'Authorized Test Body',
      capabilities: [
        {
          name: 'system.open_app',
          description: 'Mở app test',
          parameters: { app: { type: 'string', description: 'Tên app', required: true } },
          riskLevel: 'low',
        },
      ],
      timestamp: Date.now(),
    };

    res3.ws.send(
      JSON.stringify({
        type: 'body.advertise',
        advertisement,
      })
    );

    // Chờ ack / đăng ký
    await new Promise((r) => setTimeout(r, 400));
    const registered = globalBodyRegistry.getBody(testBodyId);
    if (!registered) {
      throw new Error(`FAIL Test 3: Body hợp lệ không được tìm thấy trong BodyRegistry!`);
    }
    console.log(`Body đã đăng ký thành công: ID=${registered.bodyId}, Capabilities=${registered.capabilities.size}`);
    console.log('✅ PASS Test 3: Kết nối với PSK hợp lệ thành công và đăng ký đúng vào BodyRegistry.\n');

    // Cleanup
    res3.ws.close();
    globalBodyRegistry.unregisterBody(testBodyId);
    console.log('========================================================================');
    console.log('🎉 TẤT CẢ TEST XÁC THỰC PSK ĐÃ PASS THÀNH CÔNG 100%!');
    console.log('========================================================================\n');
  } finally {
    await server.stop();
  }
}

runBodyAuthTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
