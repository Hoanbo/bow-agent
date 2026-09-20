// scripts/generate_certs.ts
// BOWCON V4.0 — CERTIFICATE MANAGEMENT & RENEWAL CLI
//
// Cách sử dụng:
// 1. Kiểm tra trạng thái chứng chỉ hiện tại:
//      npx tsx scripts/generate_certs.ts
// 2. Tái tạo chứng chỉ mới (Renew / Rotation):
//      npx tsx scripts/generate_certs.ts --renew
// 3. Thêm IP / DNS tùy chỉnh cho máy Machine A mới:
//      npx tsx scripts/generate_certs.ts --renew --hosts 192.168.1.50,mybrain.local

import { ensureTlsCertificates, getCaCertPath, getCaFingerprint, getServerFingerprint } from '../src/security/tlsCertManager.js';

const args = process.argv.slice(2);
const forceRenew = args.includes('--renew') || args.includes('-r');
const hostsIdx = args.indexOf('--hosts');
const customHosts = hostsIdx !== -1 && args[hostsIdx + 1] ? args[hostsIdx + 1].split(',') : [];

console.log('================================================================');
console.log('  BOWCON V4.0 — TLS INTERNAL CA & SERVER CERTIFICATE MANAGER');
console.log('================================================================');

try {
  const result = ensureTlsCertificates({ forceRenew, hosts: customHosts });
  console.log(`[STATUS] Certificate status: ${forceRenew ? 'RENEWED / REGENERATED' : 'VALID & READY'}`);
  console.log(`[CA CERT]        ${result.caCertPath}`);
  console.log(`[CA FINGERPRINT] ${result.caFingerprint}`);
  console.log(`[SERVER CERT]    ${result.serverCertPath}`);
  console.log(`[SRV FINGERPRINT] ${result.serverFingerprint}`);
  console.log('----------------------------------------------------------------');
  console.log('HƯỚNG DẪN CẤU HÌNH MACHINE B:');
  console.log('1. Copy file CA công khai: "data/certs/ca.crt" sang Machine B.');
  console.log(`2. Ghim Fingerprint CA trên Machine B:`);
  console.log(`   BOW_PINNED_CERT_FINGERPRINT=${result.caFingerprint}`);
  console.log('3. TUYỆT ĐỐI KHÔNG COPY ca.key hoặc server.key ra ngoài Machine A!');
  console.log('================================================================');
} catch (err: any) {
  console.error('[ERROR] Failed to manage certificates:', err.message);
  process.exit(1);
}
