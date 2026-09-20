// src/security/tlsCertManager.ts
// BOWCON V4.0 — INTERNAL CA & TLS CERTIFICATE INFRASTRUCTURE
//
// BỐI CẢNH AN NINH (LAN HOUSEHOLD SECURITY):
// Machine A (Central Brain: 192.168.0.100) và Machine B (Desktop Body: 192.168.0.103) kết nối
// cố định trong mạng LAN nội bộ, không sở hữu domain public hợp lệ (nên không thể dùng Let's Encrypt).
//
// NGUY CƠ:
// Trước đây, voice buffer (base64 WAV) và TTS audio truyền qua cleartext HTTP/WS (cổng 4000).
// Mọi thiết bị trên LAN (Wireshark, router bị chiếm quyền, IoT compromised) đều có thể nghe lén trọn vẹn.
//
// GIẢI PHÁP:
// 1. Thiết lập một Internal Local Root CA tự ký chuyên biệt cho BOWCON (2048-bit RSA, SHA-256).
// 2. Ký Server Certificate cho Machine A với Subject Alternative Names (SAN) bao gồm cả loopback và LAN IPs:
//    - IP: 127.0.0.1, 192.168.0.100
//    - DNS: localhost, MSI, và hostname máy chủ.
// 3. Machine B GHIM CỨNG (Certificate Pinning) public CA certificate (`ca.crt`) và SHA-256 fingerprint:
//    - TUYỆT ĐỐI KHÔNG tắt xác thực chứng chỉ TLS (luôn giữ strict rejectUnauthorized: true).
//    - Khi bắt tay TLS, Node.js kiểm tra chuỗi chữ ký dựa trên `ca` nội bộ và đối chiếu fingerprint.
//    - Nếu phát hiện giả mạo chứng chỉ, lập tức ngắt kết nối với cảnh báo MITM (Fail-Fast).
//
// =========================================================================================
// QUY TRÌNH TÁI TẠO HOẶC ĐỔI MÁY (CERTIFICATE RENEWAL & ROTATION WORKFLOW):
// =========================================================================================
// 1. Khi chứng chỉ hết hạn (Server cert: 825 ngày, CA cert: 5 năm) hoặc khi đổi IP/máy mới:
//    - Trên Machine A, chạy lệnh tái tạo:
//        npx tsx -e "import { ensureTlsCertificates } from './src/security/tlsCertManager.js'; ensureTlsCertificates({ forceRenew: true });"
//    - Toàn bộ ca.key, ca.crt, server.key, server.crt và fingerprint sẽ được sinh mới tự động.
// 2. Phân phối CA Certificate sang Machine B:
//    - CHỈ copy file public `data/certs/ca.crt` (và ca.fingerprint nếu ghim tĩnh) sang Machine B.
//    - TUYỆT ĐỐI KHÔNG copy `ca.key` hoặc `server.key` ra ngoài Machine A.
//    - `ca.key` và `server.key` được bảo vệ nghiêm ngặt trong .gitignore.
// 3. Trên Machine B, đặt `BOW_BRAIN_CA_PATH=./data/certs/ca.crt` và khởi động Desktop Body.
// =========================================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const CERTS_DIR = path.resolve(process.cwd(), 'data/certs');
export const CA_KEY_PATH = path.join(CERTS_DIR, 'ca.key');
export const CA_CRT_PATH = path.join(CERTS_DIR, 'ca.crt');
export const CA_FINGERPRINT_PATH = path.join(CERTS_DIR, 'ca.fingerprint');
export const SERVER_KEY_PATH = path.join(CERTS_DIR, 'server.key');
export const SERVER_CSR_PATH = path.join(CERTS_DIR, 'server.csr');
export const SERVER_CRT_PATH = path.join(CERTS_DIR, 'server.crt');
export const SERVER_EXT_PATH = path.join(CERTS_DIR, 'server_ext.cnf');
export const SERVER_FINGERPRINT_PATH = path.join(CERTS_DIR, 'server.fingerprint');

export interface TlsCertificatePaths {
  caCertPath: string;
  caKeyPath: string;
  serverCertPath: string;
  serverKeyPath: string;
  caFingerprint: string;
  serverFingerprint: string;
}

/**
 * Tìm đường dẫn thực thi của OpenSSL trên hệ thống Windows/Linux/macOS
 */
export function findOpenSslBinary(): string {
  const candidates: string[] = [
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
    'C:\\OpenSSL-Win64\\bin\\openssl.exe',
    'C:\\OpenSSL\\bin\\openssl.exe',
    'openssl.exe',
    'openssl',
  ];

  for (const candidate of candidates) {
    try {
      execSync(`"${candidate}" version`, { stdio: 'pipe' });
      return candidate;
    } catch {
      // Tiếp tục tìm ứng viên khác
    }
  }

  throw new Error(
    'OPENSSL_NOT_FOUND: Không tìm thấy OpenSSL CLI trên hệ thống. ' +
    'Vui lòng cài đặt Git for Windows hoặc OpenSSL và thêm vào PATH.'
  );
}

/**
 * Tính toán SHA-256 fingerprint của certificate X509 (chuỗi hex viết hoa cách nhau bởi dấu hai chấm)
 */
export function calculateCertFingerprint(certPem: string): string {
  const x509 = new crypto.X509Certificate(certPem);
  return x509.fingerprint256.toUpperCase();
}

/**
 * Thu thập danh sách IP và hostname cần đưa vào Subject Alternative Name (SAN)
 */
function gatherSanEntries(customHosts: string[] = []): { dns: string[]; ips: string[] } {
  const dnsSet = new Set<string>(['localhost', 'MSI']);
  const ipSet = new Set<string>(['127.0.0.1', '192.168.0.100']);

  // Thêm hostname hiện tại của máy
  try {
    const hostname = os.hostname();
    if (hostname) dnsSet.add(hostname);
  } catch {}

  // Thu thập toàn bộ địa chỉ IPv4 nội bộ của máy chủ Machine A
  try {
    const interfaces = os.networkInterfaces();
    for (const netList of Object.values(interfaces)) {
      if (!netList) continue;
      for (const iface of netList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipSet.add(iface.address);
        }
      }
    }
  } catch {}

  // Bổ sung host truyền vào từ cấu hình hoặc options
  for (const h of customHosts) {
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) {
      ipSet.add(h);
    } else if (h.trim()) {
      dnsSet.add(h.trim());
    }
  }

  return {
    dns: Array.from(dnsSet),
    ips: Array.from(ipSet),
  };
}

/**
 * Tạo file cấu hình OpenSSL extension với đầy đủ Subject Alternative Names (SAN)
 */
function createOpenSslSanConfig(sanPath: string, san: { dns: string[]; ips: string[] }): void {
  let altNames = '';
  san.dns.forEach((dns, idx) => {
    altNames += `DNS.${idx + 1} = ${dns}\n`;
  });
  san.ips.forEach((ip, idx) => {
    altNames += `IP.${idx + 1} = ${ip}\n`;
  });

  const cnfContent = `[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = BOWCON Machine A Brain
O = BOWCON
OU = Autonomous Core

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
${altNames}`;

  fs.writeFileSync(sanPath, cnfContent, 'utf8');
}

/**
 * Khởi tạo hoặc nạp các chứng chỉ TLS (Internal CA và Machine A Server Certificate).
 * Nếu chứng chỉ chưa có hoặc được yêu cầu `forceRenew`, hệ thống sẽ tự sinh tự động.
 */
export function ensureTlsCertificates(options: { hosts?: string[]; forceRenew?: boolean } = {}): TlsCertificatePaths {
  fs.mkdirSync(CERTS_DIR, { recursive: true });

  const caExists = fs.existsSync(CA_KEY_PATH) && fs.existsSync(CA_CRT_PATH);
  const serverExists = fs.existsSync(SERVER_KEY_PATH) && fs.existsSync(SERVER_CRT_PATH);

  // Kiểm tra tính hợp lệ của chứng chỉ nếu đã tồn tại
  let needGenerate = !caExists || !serverExists || options.forceRenew;

  if (!needGenerate && caExists && serverExists) {
    try {
      const caCert = new crypto.X509Certificate(fs.readFileSync(CA_CRT_PATH));
      const srvCert = new crypto.X509Certificate(fs.readFileSync(SERVER_CRT_PATH));
      const now = Date.now();
      const caExpiry = new Date(caCert.validTo).getTime();
      const srvExpiry = new Date(srvCert.validTo).getTime();

      // Nếu còn hạn ít hơn 7 ngày thì tái tạo
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (caExpiry - now < sevenDaysMs || srvExpiry - now < sevenDaysMs) {
        needGenerate = true;
      }
    } catch {
      needGenerate = true;
    }
  }

  if (needGenerate) {
    const openssl = findOpenSslBinary();

    // 1. Sinh Root CA nếu chưa có hoặc cần renew
    if (!caExists || options.forceRenew) {
      execSync(`"${openssl}" genrsa -out "${CA_KEY_PATH}" 2048`, { stdio: 'pipe' });
      execSync(
        `"${openssl}" req -x509 -new -nodes -key "${CA_KEY_PATH}" -sha256 -days 1825 ` +
        `-out "${CA_CRT_PATH}" -subj "/CN=BOWCON-Local-Root-CA/O=BOWCON/OU=Security"`,
        { stdio: 'pipe' }
      );
      const caFingerprint = calculateCertFingerprint(fs.readFileSync(CA_CRT_PATH, 'utf8'));
      fs.writeFileSync(CA_FINGERPRINT_PATH, caFingerprint, 'utf8');
    }

    // 2. Sinh Server Key & CSR với SAN
    const san = gatherSanEntries(options.hosts);
    createOpenSslSanConfig(SERVER_EXT_PATH, san);

    execSync(`"${openssl}" genrsa -out "${SERVER_KEY_PATH}" 2048`, { stdio: 'pipe' });
    execSync(
      `"${openssl}" req -new -key "${SERVER_KEY_PATH}" -out "${SERVER_CSR_PATH}" -config "${SERVER_EXT_PATH}"`,
      { stdio: 'pipe' }
    );

    // 3. Ký Server Certificate bằng Root CA
    execSync(
      `"${openssl}" x509 -req -in "${SERVER_CSR_PATH}" -CA "${CA_CRT_PATH}" -CAkey "${CA_KEY_PATH}" ` +
      `-CAcreateserial -out "${SERVER_CRT_PATH}" -days 825 -sha256 -extfile "${SERVER_EXT_PATH}" -extensions v3_req`,
      { stdio: 'pipe' }
    );

    const srvFingerprint = calculateCertFingerprint(fs.readFileSync(SERVER_CRT_PATH, 'utf8'));
    fs.writeFileSync(SERVER_FINGERPRINT_PATH, srvFingerprint, 'utf8');
  }

  const caFingerprint = fs.existsSync(CA_FINGERPRINT_PATH)
    ? fs.readFileSync(CA_FINGERPRINT_PATH, 'utf8').trim()
    : calculateCertFingerprint(fs.readFileSync(CA_CRT_PATH, 'utf8'));

  const serverFingerprint = fs.existsSync(SERVER_FINGERPRINT_PATH)
    ? fs.readFileSync(SERVER_FINGERPRINT_PATH, 'utf8').trim()
    : calculateCertFingerprint(fs.readFileSync(SERVER_CRT_PATH, 'utf8'));

  return {
    caCertPath: CA_CRT_PATH,
    caKeyPath: CA_KEY_PATH,
    serverCertPath: SERVER_CRT_PATH,
    serverKeyPath: SERVER_KEY_PATH,
    caFingerprint,
    serverFingerprint,
  };
}

/**
 * Trả về đường dẫn tới Root CA Certificate
 */
export function getCaCertPath(): string {
  if (!fs.existsSync(CA_CRT_PATH)) {
    ensureTlsCertificates();
  }
  return CA_CRT_PATH;
}

/**
 * Trả về SHA-256 fingerprint của Root CA Certificate
 */
export function getCaFingerprint(): string {
  if (!fs.existsSync(CA_FINGERPRINT_PATH)) {
    ensureTlsCertificates();
  }
  return fs.readFileSync(CA_FINGERPRINT_PATH, 'utf8').trim();
}

/**
 * Trả về SHA-256 fingerprint của Server Certificate
 */
export function getServerFingerprint(): string {
  if (!fs.existsSync(SERVER_FINGERPRINT_PATH)) {
    ensureTlsCertificates();
  }
  return fs.readFileSync(SERVER_FINGERPRINT_PATH, 'utf8').trim();
}
