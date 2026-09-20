// tests/security/test_tls_wss_hardening.ts
// BOWCON V4.0 — PROMPT #2: TLS/WSS ENFORCEMENT & CERTIFICATE PINNING TEST SUITE
//
// Xác minh 3 yêu cầu cốt lõi theo tiêu chuẩn an ninh:
// 1. Kết nối qua ws:// (không mã hóa) tới server HTTPS/WSS -> Bị từ chối hoàn toàn, không truyền audio.
// 2. Kết nối wss:// với chứng chỉ hợp lệ và ghim CA -> Thành công kết nối và giao tiếp BodyProtocol.
// 3. Giả lập chứng chỉ sai hoặc fingerprint không khớp CA đã ghim -> Machine B (Desktop Body)
//    LẬP TỨC từ chối kết nối với lỗi "CERTIFICATE_MISMATCH — có thể đang bị tấn công trung gian (MITM)",
//    và KHÔNG BAO GIỜ fallback về plaintext.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocket } from 'ws';
import { BowCentralAgentServer } from '../../src/server.js';
import { DesktopBodyRunner } from '../../bodies/desktop/index.js';
import { getBodyPsk, globalBodyRegistry } from '../../src/core/bodyProtocol/index.js';
import {
  ensureTlsCertificates,
  getCaCertPath,
  getCaFingerprint,
  getServerFingerprint,
} from '../../src/security/tlsCertManager.js';

const TEST_PORT = 4195;

async function runTlsHardeningTests(): Promise<void> {
  console.log('========================================================================');
  console.log('🔒  BẮT ĐẦU TEST SUITE PROMPT #2: MÃ HÓA TLS/WSS & CERTIFICATE PINNING');
  console.log('========================================================================\n');

  // Khởi tạo các chứng chỉ hợp lệ
  const certPaths = ensureTlsCertificates();
  const realCaCert = fs.readFileSync(certPaths.caCertPath);
  const realCaFingerprint = certPaths.caFingerprint;
  const psk = getBodyPsk();

  console.log(`[TEST-INIT] CA Cert Path: ${certPaths.caCertPath}`);
  console.log(`[TEST-INIT] CA Fingerprint: ${realCaFingerprint}`);
  console.log(`[TEST-INIT] Server Fingerprint: ${certPaths.serverFingerprint}\n`);

  // 1. Khởi động Central Brain Server (bắt buộc HTTPS/WSS)
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  console.log(`[TEST-INIT] Server đã khởi động trên cổng ${TEST_PORT} qua TLS/HTTPS.\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: KẾT NỐI QUA WS:// (PLAINTEXT) TỚI SERVER PHẢI BỊ TỪ CHỐI HOÀN TOÀN
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Plaintext ws:// connection to HTTPS/WSS port must fail ---');
    let plainWsConnected = false;
    let plainWsError: any = null;

    await new Promise<void>((resolve) => {
      const plainWs = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws/body`, {
        headers: { Authorization: `Bearer ${psk}` },
      });

      plainWs.on('open', () => {
        plainWsConnected = true;
        plainWs.close();
        resolve();
      });

      plainWs.on('error', (err) => {
        plainWsError = err;
        resolve();
      });

      // Timeout bảo vệ 3000ms
      setTimeout(() => resolve(), 3000);
    });

    assert.strictEqual(plainWsConnected, false, 'Plaintext ws:// MUST NOT connect to HTTPS/WSS port');
    assert(plainWsError !== null, 'Plaintext ws:// connection must emit error on TLS port');
    console.log(`[PASS] Plaintext ws:// bị từ chối chính xác. Lỗi bắt được: ${plainWsError?.message || plainWsError?.code}\n`);

    // -------------------------------------------------------------------------
    // TEST 2: REQUEST HTTP THUẦN (PLAINTEXT) TỚI HTTPS ENDPOINT PHẢI THẤT BẠI
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Plaintext http:// request to HTTPS port must fail ---');
    let plainHttpSuccess = false;
    let plainHttpError: any = null;

    await new Promise<void>((resolve) => {
      const req = http.get(`http://127.0.0.1:${TEST_PORT}/api/body/command`, (res) => {
        plainHttpSuccess = true;
        resolve();
      });

      req.on('error', (err) => {
        plainHttpError = err;
        resolve();
      });

      setTimeout(() => {
        req.destroy();
        resolve();
      }, 3000);
    });

    assert.strictEqual(plainHttpSuccess, false, 'Plaintext HTTP request must not succeed on HTTPS port');
    assert(plainHttpError !== null, 'Plaintext HTTP request must emit network/protocol error');
    console.log(`[PASS] Plaintext HTTP bị từ chối chính xác. Lỗi: ${plainHttpError?.message || plainHttpError?.code}\n`);

    // -------------------------------------------------------------------------
    // TEST 3: KẾT NỐI WSS:// VỚI CHỨNG CHỈ HỢP LỆ VÀ GHIM CA NỘI BỘ -> THÀNH CÔNG
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: wss:// with valid Internal CA cert and pinning connects successfully ---');
    const validBodyId = 'desktop_valid_tls_node';
    const bodyRunner = new DesktopBodyRunner(
      `wss://127.0.0.1:${TEST_PORT}/ws/body`,
      validBodyId,
      psk,
      certPaths.caCertPath,
      realCaFingerprint
    );

    await bodyRunner.start();
    // Chờ 300ms để Brain ghi nhận đăng ký
    await new Promise((r) => setTimeout(r, 300));

    const registeredBody = globalBodyRegistry.getBody(validBodyId);
    assert(registeredBody !== undefined, 'Body must be registered over wss:// with valid CA');
    assert.strictEqual(registeredBody.connection?.isAlive(), true, 'Body connection must be alive');
    console.log(`[PASS] wss:// kết nối thành công! Body "${validBodyId}" đã đăng ký trên Brain.\n`);

    // Dọn dẹp bodyRunner test 3
    bodyRunner.stop();
    await new Promise((r) => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // TEST 4: KẾT NỐI WSS:// VỚI CA GIẢ MẠO / KHÔNG TIN CẬY -> BỊ TỪ CHỐI
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: wss:// with untrusted/foreign CA must fail TLS handshake ---');
    const { execSync } = await import('node:child_process');
    const { findOpenSslBinary } = await import('../../src/security/tlsCertManager.js');
    const openssl = findOpenSslBinary();
    const foreignCaKey = path.join(path.dirname(certPaths.caCertPath), 'foreign_ca.key');
    const foreignCaCrt = path.join(path.dirname(certPaths.caCertPath), 'foreign_ca.crt');

    execSync(`"${openssl}" genrsa -out "${foreignCaKey}" 2048`, { stdio: 'pipe' });
    execSync(
      `"${openssl}" req -x509 -new -nodes -key "${foreignCaKey}" -sha256 -days 1 -out "${foreignCaCrt}" -subj "/CN=Foreign-Untrusted-CA"`,
      { stdio: 'pipe' }
    );

    let untrustedConnected = false;
    let untrustedError: any = null;

    try {
      const untrustedBodyRunner = new DesktopBodyRunner(
        `wss://127.0.0.1:${TEST_PORT}/ws/body`,
        'desktop_untrusted_node',
        psk,
        foreignCaCrt
      );
      await untrustedBodyRunner.start();
      untrustedConnected = true;
      untrustedBodyRunner.stop();
    } catch (err: any) {
      untrustedError = err;
    } finally {
      if (fs.existsSync(foreignCaKey)) fs.unlinkSync(foreignCaKey);
      if (fs.existsSync(foreignCaCrt)) fs.unlinkSync(foreignCaCrt);
    }

    assert.strictEqual(untrustedConnected, false, 'Connection with untrusted CA MUST be rejected');
    assert(untrustedError !== null, 'Connection with untrusted CA must throw error');
    console.log(`[PASS] wss:// với CA không tin cậy bị từ chối chính xác: ${untrustedError?.message || untrustedError?.code}\n`);

    // -------------------------------------------------------------------------
    // TEST 5: GIẢ LẬP MITM: FINGERPRINT KHÔNG KHỚP GHIM -> BỊ TỪ CHỐI FAIL-FAST
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: Certificate Pinning Mismatch (MITM simulation) must fail-fast ---');
    const attackerFingerprint = '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF';

    let mitmConnected = false;
    let mitmError: any = null;

    try {
      const mitmBodyRunner = new DesktopBodyRunner(
        `wss://127.0.0.1:${TEST_PORT}/ws/body`,
        'desktop_mitm_victim_node',
        psk,
        certPaths.caCertPath,
        attackerFingerprint // Ghim fingerprint khác với cert thật của server/CA
      );
      await mitmBodyRunner.start();
      mitmConnected = true;
      mitmBodyRunner.stop();
    } catch (err: any) {
      mitmError = err;
    }

    assert.strictEqual(mitmConnected, false, 'Connection with mismatched fingerprint MUST be rejected');
    assert(mitmError !== null, 'Connection with mismatched fingerprint must throw');
    const isMitmCaught = mitmError?.message?.includes('CERTIFICATE_MISMATCH') || mitmError?.code === 'CERTIFICATE_MISMATCH';
    assert(isMitmCaught, `Error message must indicate CERTIFICATE_MISMATCH / MITM. Got: ${mitmError?.message}`);
    console.log(`[PASS] Bắt trọn vẹn lỗi CERTIFICATE_MISMATCH. Lỗi: "${mitmError?.message}"\n`);

    // -------------------------------------------------------------------------
    // TEST 6: THỰC THI LỆNH THẬT QUA KÊNH WSS (KHÔNG FALLBACK)
    // -------------------------------------------------------------------------
    console.log('--- TEST 6: Command execution over verified TLS/WSS channel ---');
    const secureRunner = new DesktopBodyRunner(
      `wss://127.0.0.1:${TEST_PORT}/ws/body`,
      'desktop_secure_e2e_node',
      psk,
      certPaths.caCertPath,
      realCaFingerprint
    );
    await secureRunner.start();
    await new Promise((r) => setTimeout(r, 300));

    // Thực thi lệnh audio.status qua Brain BodyRegistry
    const cmdResult = await globalBodyRegistry.executeBodyCommand({
      commandId: 'cmd_secure_test_1',
      bodyId: 'desktop_secure_e2e_node',
      capability: 'audio.status',
      params: {},
    });

    assert(cmdResult.success === true, 'audio.status command over WSS must succeed');
    console.log(`[PASS] Thực thi lệnh qua kênh WSS mã hóa thành công! Dữ liệu audio.status: ${JSON.stringify(cmdResult.data)}\n`);
    secureRunner.stop();

    // -------------------------------------------------------------------------
    // TEST 7: KIỂM TRA TOÀN BỘ CODEBASE KHÔNG CÓ "rejectUnauthorized: false"
    // -------------------------------------------------------------------------
    console.log('--- TEST 7: Audit codebase for rejectUnauthorized: false or NODE_TLS_REJECT_UNAUTHORIZED ---');
    const filesToAudit = [
      'src/server.ts',
      'bodies/desktop/index.ts',
      'src/security/tlsCertManager.ts',
    ];

    for (const f of filesToAudit) {
      const content = fs.readFileSync(f, 'utf8');
      assert(!content.includes('rejectUnauthorized: false'), `File ${f} must NOT contain "rejectUnauthorized: false"`);
      assert(!content.includes('rejectUnauthorized:false'), `File ${f} must NOT contain "rejectUnauthorized:false"`);
      assert(!content.includes('NODE_TLS_REJECT_UNAUTHORIZED=0'), `File ${f} must NOT contain "NODE_TLS_REJECT_UNAUTHORIZED=0"`);
      assert(!content.includes("NODE_TLS_REJECT_UNAUTHORIZED = '0'"), `File ${f} must NOT contain "NODE_TLS_REJECT_UNAUTHORIZED = '0'"`);
    }
    console.log('[PASS] Toàn bộ code production TUYỆT ĐỐI KHÔNG chứa rejectUnauthorized: false!\n');

    console.log('========================================================================');
    console.log('🎉 TOÀN BỘ 7/7 TEST CASE MÃ HÓA TLS/WSS ĐÃ PASS 100%!');
    console.log('========================================================================');
  } finally {
    await server.stop();
  }
}

runTlsHardeningTests().catch((err) => {
  console.error('❌ TLS/WSS Hardening Test FAILED:', err);
  process.exit(1);
});
