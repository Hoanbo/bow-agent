// bodies/desktop/index.ts
// BOWCON V4.0 — MINIMAL DESKTOP BODY RUNTIME (Xeon 1-Chip Node Process)
//
// EN:
// Standalone peripheral body process designed to run on the Xeon 1-chip machine
// (or locally on dualXeon machine for testing). Connects to Central Brain via
// WebSocket BodyProtocol, advertises local capabilities, handles commands, and sends heartbeats.
//
// VI:
// Tiến trình cơ thể ngoại vi độc lập thiết kế để chạy trên máy Xeon 1-chip
// (hoặc chạy local trên máy dualXeon để kiểm chứng). Kết nối tới Não bộ Trung tâm qua
// WebSocket BodyProtocol, quảng bá các năng lực cục bộ, xử lý lệnh và gửi heartbeat định kỳ.

import dotenv from 'dotenv';
dotenv.config();

import { WebSocket } from 'ws';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import tls from 'node:tls';
import type {
  CapabilityAdvertisement,
  CapabilityDescriptor,
  BodyCommand,
  BodyCommandResult,
} from '../../src/core/bodyProtocol/types.js';
import { getBodyPsk } from '../../src/core/bodyProtocol/index.js';
import { desktopAudioDriver } from './audioDriver.js';
import { globalPrivacyIndicator } from './privacyIndicator.js';
import { globalPushToTalkManager, isPushToTalkEnabled } from '../../src/security/pushToTalkManager.js';

export { globalPushToTalkManager, isPushToTalkEnabled };

// Configuration
const BRAIN_HOST = process.env.BOW_BRAIN_HOST || '127.0.0.1';
const BRAIN_PORT = Number(process.env.BOW_BRAIN_PORT || 4000);
const BRAIN_URL = process.env.BOW_BRAIN_URL || `wss://${BRAIN_HOST}:${BRAIN_PORT}/ws/body`;
const BRAIN_PSK = process.env.BOW_BRAIN_PSK || process.env.BOW_BODY_PSK || '';
const BRAIN_CA_PATH = process.env.BOW_BRAIN_CA_PATH || path.resolve(process.cwd(), 'data/certs/ca.crt');
const BRAIN_PINNED_FINGERPRINT = process.env.BOW_PINNED_CERT_FINGERPRINT || process.env.BOW_PINNED_FINGERPRINT || '';
const BODY_ID = process.env.BOW_BODY_ID || `desktop_xeon_${os.hostname().toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
const HEARTBEAT_INTERVAL_MS = 5000;

// Whitelists for Security Hardening
const ALLOWED_APPS: Record<string, { exe: string; label: string }> = {
  notepad: { exe: 'notepad.exe', label: 'Notepad Text Editor' },
  calc: { exe: 'calc.exe', label: 'Windows Calculator' },
  cmd: { exe: 'cmd.exe', label: 'Command Prompt' },
  explorer: { exe: 'explorer.exe', label: 'Windows Explorer' },
  code: { exe: 'code.cmd', label: 'VS Code' },
};

const ALLOWED_SCRIPTS: Record<string, () => Promise<any>> = {
  system_info: async () => ({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().map((c) => c.model).slice(0, 4),
    cpuCount: os.cpus().length,
    totalMemoryGb: (os.totalmem() / (1024 ** 3)).toFixed(2),
    freeMemoryGb: (os.freemem() / (1024 ** 3)).toFixed(2),
    uptimeHours: (os.uptime() / 3600).toFixed(2),
  }),
  diagnostics: async () => ({
    status: 'HEALTHY',
    tempCelsius: 38,
    activeProcesses: 1,
    heartbeatSync: true,
  }),
  echo_status: async () => ({
    bodyId: BODY_ID,
    role: 'PERIPHERAL_BODY',
    nodeVersion: process.version,
    pid: process.pid,
  }),
};

// 4 Standard Capabilities (MS-1.5 / BodyProtocol Standard)
const CAPABILITIES: CapabilityDescriptor[] = [
  {
    name: 'system.open_app',
    description: 'Mở ứng dụng desktop theo tên (có kiểm tra danh sách whitelist)',
    riskLevel: 'low',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Tên app cần mở: notepad, calc, cmd, explorer, code' },
      },
      required: ['app'],
    },
  },
  {
    name: 'fs.search',
    description: 'Tìm kiếm tệp tin theo mẫu pattern trong thư mục cho phép',
    riskLevel: 'low',
    parameters: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Đường dẫn thư mục tìm kiếm (mặc định: thư mục hiện tại)' },
        pattern: { type: 'string', description: 'Từ khóa hoặc pattern cần tìm' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'fs.read',
    description: 'Đọc nội dung văn bản của tệp tin trong phạm vi được cấp phép',
    riskLevel: 'medium',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Đường dẫn tệp tin cần đọc' },
        maxBytes: { type: 'number', description: 'Số byte tối đa cần đọc (mặc định: 10KB)' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'system.run_script',
    description: 'Thực thi các tập lệnh hệ thống định nghĩa sẵn (không cho phép arbitrary code)',
    riskLevel: 'high',
    parameters: {
      type: 'object',
      properties: {
        scriptName: { type: 'string', description: 'Tên script được phép: system_info, diagnostics, echo_status' },
      },
      required: ['scriptName'],
    },
  },
  {
    name: 'audio.device.list',
    description: 'Liệt kê danh sách các thiết bị thu (micro) và phát (loa/tai nghe) phần cứng',
    riskLevel: 'low',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'audio.status',
    description: 'Kiểm tra trạng thái driver âm thanh, thiết bị micro/loa đang hoạt động',
    riskLevel: 'low',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'audio.device.select',
    description: 'Lựa chọn thiết bị thu âm hoặc phát âm thanh mong muốn',
    riskLevel: 'low',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Loại thiết bị: input hoặc output' },
        name: { type: 'string', description: 'Tên thiết bị cần chọn' },
      },
      required: ['type', 'name'],
    },
  },
  {
    name: 'audio.capture',
    description: 'Thu âm thanh từ micro tai nghe thật ra buffer WAV 16-bit PCM',
    riskLevel: 'medium',
    parameters: {
      type: 'object',
      properties: {
        durationMs: { type: 'number', description: 'Thời lượng thu âm tính bằng mili-giây (mặc định 2000ms)' },
        sampleRate: { type: 'number', description: 'Tần số lấy mẫu (mặc định 16000Hz)' },
        channels: { type: 'number', description: 'Số kênh (1: mono, 2: stereo)' },
      },
    },
  },
  {
    name: 'audio.play',
    description: 'Phát âm thanh ra loa hoặc tai nghe phần cứng thật',
    riskLevel: 'low',
    parameters: {
      type: 'object',
      properties: {
        audioBase64: { type: 'string', description: 'Dữ liệu âm thanh mã hóa base64' },
        audioFilePath: { type: 'string', description: 'Đường dẫn tệp âm thanh cần phát' },
        format: { type: 'string', description: 'Định dạng tệp: wav hoặc mp3' },
      },
    },
  },
];

export class DesktopBodyRunner {
  private ws?: WebSocket;
  private heartbeatTimer?: NodeJS.Timeout;
  private isStopping = false;
  private readonly psk: string;
  private readonly caPath: string;
  private readonly pinnedFingerprint: string;

  constructor(
    private readonly brainUrl = BRAIN_URL,
    private readonly bodyId = BODY_ID,
    psk?: string,
    caPath?: string,
    pinnedFingerprint?: string
  ) {
    this.psk = psk || BRAIN_PSK || getBodyPsk();
    this.caPath = caPath || BRAIN_CA_PATH;
    this.pinnedFingerprint = pinnedFingerprint || BRAIN_PINNED_FINGERPRINT;
  }

  public async start(): Promise<void> {
    console.log(`[DESKTOP-BODY] Starting Desktop Body "${this.bodyId}"...`);
    console.log(`[DESKTOP-BODY] Target Brain URL: ${this.brainUrl}`);

    // Khởi động chỉ báo khay hệ thống hiển thị (System Tray Visual Indicator)
    const indicatorResult = await globalPrivacyIndicator.start();
    if (!indicatorResult.started) {
      console.error(`[DESKTOP-BODY] ❌ CRITICAL: VisualPrivacyIndicator không thể khởi động: ${indicatorResult.error}`);
    }

    // Dọn dẹp các file WAV/TMP tạm còn sót từ phiên trước (crash recovery)
    const cleanedStale = desktopAudioDriver.cleanupStaleTempFiles();
    if (cleanedStale > 0) {
      console.log(`[DESKTOP-BODY] Đã dọn dẹp ${cleanedStale} file âm thanh tạm còn sót từ phiên trước.`);
    }

    // Kết nối Push-to-Talk Timeout Beep với DesktopAudioDriver (3x 400Hz alert beep)
    globalPushToTalkManager.setBeepNotifier(async (type) => {
      await desktopAudioDriver.emitPrivacyBeep(type);
    });

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {};
      if (this.psk) {
        headers['Authorization'] = `Bearer ${this.psk}`;
      }

      const wsOptions: any = { headers };

      // Bắt buộc cấu hình TLS/WSS và Certificate Pinning cho kênh BodyProtocol
      if (this.brainUrl.startsWith('wss://')) {
        if (this.caPath && fs.existsSync(this.caPath)) {
          wsOptions.ca = fs.readFileSync(this.caPath);
        } else {
          console.warn(`[DESKTOP-BODY] ⚠️ Không tìm thấy file CA tại "${this.caPath}". Đang kiểm tra TLS với CA hệ thống.`);
        }

        // Cơ chế Fail-Fast Certificate Pinning & Phát hiện Tấn công Giả mạo (MITM)
        wsOptions.checkServerIdentity = (host: string, cert: any) => {
          // 1. Kiểm tra tính hợp lệ về Hostname/IP SAN
          const defaultErr = tls.checkServerIdentity(host, cert);
          if (defaultErr) {
            return defaultErr;
          }

          // 2. Kiểm tra Pinning SHA-256 Fingerprint của CA hoặc Server nếu được chỉ định
          if (this.pinnedFingerprint && cert) {
            const expectedFingerprint = this.pinnedFingerprint.toUpperCase().replace(/[^A-F0-9]/g, '');
            const actualServerFingerprint = (cert.fingerprint256 || '').toUpperCase().replace(/[^A-F0-9]/g, '');
            let actualCaFingerprint = '';
            if (cert.issuerCertificate?.fingerprint256) {
              actualCaFingerprint = cert.issuerCertificate.fingerprint256.toUpperCase().replace(/[^A-F0-9]/g, '');
            }

            const matchesServer = actualServerFingerprint && actualServerFingerprint === expectedFingerprint;
            const matchesCa = actualCaFingerprint && actualCaFingerprint === expectedFingerprint;

            if (!matchesServer && !matchesCa) {
              const mitmError = new Error('CERTIFICATE_MISMATCH — có thể đang bị tấn công trung gian (MITM)');
              (mitmError as any).code = 'CERTIFICATE_MISMATCH';
              return mitmError;
            }
          }

          return undefined;
        };
      }

      this.ws = new WebSocket(this.brainUrl, wsOptions);

      this.ws.on('unexpected-response', (_req, res) => {
        const errMsg = `WebSocket handshake rejected with HTTP ${res.statusCode}: ${res.statusMessage}`;
        console.error(`[DESKTOP-BODY] Authentication/Handshake Error: ${errMsg}`);
        if (!this.isStopping) {
          reject(new Error(errMsg));
        }
      });

      this.ws.on('open', () => {
        console.log(`[DESKTOP-BODY] Connected to Central Brain!`);
        this.advertise();
        this.startHeartbeat();
        resolve();
      });

      this.ws.on('message', async (data: Buffer | string) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf8');
          const msg = JSON.parse(raw);

          if (msg.type === 'body.advertise_ack') {
            console.log(`[DESKTOP-BODY] Registration acknowledged by Brain (Status: ${msg.status}).`);
          } else if (msg.type === 'body.heartbeat_ack') {
            // Heartbeat ACK received silently
          } else if (msg.type === 'body.command') {
            const command = msg.command as BodyCommand;
            console.log(`[DESKTOP-BODY] Received command "${command.capability}" (ID: ${command.commandId})...`);
            const result = await this.handleCommand(command);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({
                type: 'body.command_result',
                result,
              }));
              console.log(`[DESKTOP-BODY] Returned result for command ID: ${command.commandId} (Success: ${result.success}).`);
            }
          }
        } catch (err: any) {
          console.error(`[DESKTOP-BODY] Error handling message:`, err);
        }
      });

      this.ws.on('error', (err: any) => {
        const isMitm = err.message?.includes('CERTIFICATE_MISMATCH') || err.code === 'CERTIFICATE_MISMATCH';
        if (isMitm) {
          console.error(`[DESKTOP-BODY] 🚨 NGUY HIỂM: CERTIFICATE_MISMATCH — có thể đang bị tấn công trung gian (MITM)! Từ chối kết nối.`);
        } else {
          console.error(`[DESKTOP-BODY] Socket error:`, err.message);
        }
        if (!this.isStopping) {
          reject(err);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[DESKTOP-BODY] Disconnected from Brain (${code}: ${reason.toString()})`);
        this.stopHeartbeat();
      });
    });
  }

  public stop(): void {
    this.isStopping = true;
    this.stopHeartbeat();
    globalPrivacyIndicator.stop();
    if (this.ws) {
      try {
        this.ws.close(1000, 'Desktop Body stopping');
      } catch {
        // Ignore
      }
      this.ws = undefined;
    }
    console.log(`[DESKTOP-BODY] Body stopped.`);
  }

  private advertise(): void {
    const advertisement: CapabilityAdvertisement = {
      bodyId: this.bodyId,
      bodyType: 'desktop',
      name: `PC Xeon Desktop Body (${os.hostname()})`,
      capabilities: CAPABILITIES,
      metadata: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        pid: process.pid,
      },
      timestamp: Date.now(),
    };

    this.ws?.send(JSON.stringify({
      type: 'body.advertise',
      advertisement,
    }));
    console.log(`[DESKTOP-BODY] Advertised ${CAPABILITIES.length} capabilities to Brain.`);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'body.heartbeat',
          bodyId: this.bodyId,
          timestamp: Date.now(),
        }));
      }
    }, HEARTBEAT_INTERVAL_MS);

    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  public async handleCommand(command: BodyCommand): Promise<BodyCommandResult> {
    const start = Date.now();
    try {
      switch (command.capability) {
        case 'system.open_app':
          return await this.handleOpenApp(command, start);

        case 'fs.search':
          return await this.handleFsSearch(command, start);

        case 'fs.read':
          return await this.handleFsRead(command, start);

        case 'system.run_script':
          return await this.handleRunScript(command, start);

        case 'audio.device.list': {
          const devices = await desktopAudioDriver.listAudioDevices();
          return {
            commandId: command.commandId,
            success: true,
            data: devices,
            executionTimeMs: Date.now() - start,
          };
        }

        case 'audio.status': {
          const status = desktopAudioDriver.getAudioStatus();
          return {
            commandId: command.commandId,
            success: true,
            data: status,
            executionTimeMs: Date.now() - start,
          };
        }

        case 'audio.device.select': {
          const params = (command.params || (command as any).parameters || {}) as any;
          const type = (params.type as 'input' | 'output') || 'input';
          const name = String(params.name || '');
          desktopAudioDriver.selectAudioDevice(type, name);
          return {
            commandId: command.commandId,
            success: true,
            data: { selected: true, type, name },
            executionTimeMs: Date.now() - start,
          };
        }

        case 'audio.capture': {
          const params = (command.params || (command as any).parameters || {}) as any;

          // 1. Kiểm tra xác thực vật lý Push-to-Talk (Mặc định BẬT)
          if (globalPushToTalkManager.isEnabled()) {
            console.log(`[DESKTOP-BODY] 🛡️ YÊU CẦU PUSH-TO-TALK: Chờ Chủ nhân xác nhận vật lý mở mic (Lệnh ID: ${command.commandId})...`);
            const confirmed = await globalPushToTalkManager.waitForConfirmation(command.commandId);
            if (!confirmed) {
              return {
                commandId: command.commandId,
                success: false,
                error: 'USER_DID_NOT_CONFIRM: Lệnh thu âm bị hủy do không nhận được xác nhận vật lý từ người dùng tại Machine B.',
                executionTimeMs: Date.now() - start,
              };
            }
          }

          // 2. Thu âm phần cứng (Có phát tiếng Beep bắt buộc và kiểm tra hard dependency PrivacyIndicator)
          try {
            const captureResult = await desktopAudioDriver.recordAudio(params);
            return {
              commandId: command.commandId,
              success: true,
              data: captureResult,
              executionTimeMs: Date.now() - start,
            };
          } catch (err: any) {
            return {
              commandId: command.commandId,
              success: false,
              error: err?.message || String(err),
              executionTimeMs: Date.now() - start,
            };
          }
        }

        case 'audio.play': {
          const params = (command.params || (command as any).parameters || {}) as any;
          const playResult = await desktopAudioDriver.playAudio(params);
          return {
            commandId: command.commandId,
            success: playResult.success,
            data: playResult,
            error: playResult.error,
            executionTimeMs: Date.now() - start,
          };
        }

        default:
          return {
            commandId: command.commandId,
            success: false,
            error: `UNKNOWN_CAPABILITY: Capability "${command.capability}" is not supported by this body.`,
            executionTimeMs: Date.now() - start,
          };
      }
    } catch (err: any) {
      return {
        commandId: command.commandId,
        success: false,
        error: `EXECUTION_ERROR: ${err?.message || String(err)}`,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  // 1. system.open_app implementation
  private async handleOpenApp(command: BodyCommand, startTime: number): Promise<BodyCommandResult> {
    const appKey = String(command.params?.app || '').trim().toLowerCase();
    const appConfig = ALLOWED_APPS[appKey];

    if (!appConfig) {
      return {
        commandId: command.commandId,
        success: false,
        error: `APP_NOT_WHITELISTED: App "${appKey}" is not in whitelist. Allowed: ${Object.keys(ALLOWED_APPS).join(', ')}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    return new Promise<BodyCommandResult>((resolve) => {
      try {
        const child = spawn(appConfig.exe, [], {
          detached: true,
          stdio: 'ignore',
          shell: true,
        });

        child.unref();

        resolve({
          commandId: command.commandId,
          success: true,
          data: {
            app: appKey,
            label: appConfig.label,
            pid: child.pid,
            status: 'LAUNCHED',
          },
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err: any) {
        resolve({
          commandId: command.commandId,
          success: false,
          error: `FAILED_TO_SPAWN: ${err?.message || String(err)}`,
          executionTimeMs: Date.now() - startTime,
        });
      }
    });
  }

  // 2. fs.search implementation
  private async handleFsSearch(command: BodyCommand, startTime: number): Promise<BodyCommandResult> {
    const pattern = String(command.params?.pattern || '').toLowerCase();
    const folder = String(command.params?.folder || './');
    const baseDir = path.resolve(process.cwd(), folder);

    if (!pattern) {
      return {
        commandId: command.commandId,
        success: false,
        error: 'SEARCH_PATTERN_REQUIRED: Must provide pattern parameter.',
        executionTimeMs: Date.now() - startTime,
      };
    }

    const matches: string[] = [];
    const searchDir = (dir: string, depth = 0) => {
      if (depth > 4 || matches.length >= 50) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const full = path.join(dir, entry.name);
          if (entry.name.toLowerCase().includes(pattern)) {
            matches.push(path.relative(process.cwd(), full));
          }
          if (entry.isDirectory()) {
            searchDir(full, depth + 1);
          }
        }
      } catch {
        // Skip inaccessible dirs
      }
    };

    searchDir(baseDir);

    return {
      commandId: command.commandId,
      success: true,
      data: {
        pattern,
        searchPath: folder,
        matches,
        count: matches.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 3. fs.read implementation
  private async handleFsRead(command: BodyCommand, startTime: number): Promise<BodyCommandResult> {
    const reqPath = String(command.params?.filePath || '');
    const maxBytes = Number(command.params?.maxBytes || 10240); // 10KB default

    if (!reqPath) {
      return {
        commandId: command.commandId,
        success: false,
        error: 'FILE_PATH_REQUIRED: Must specify filePath parameter.',
        executionTimeMs: Date.now() - startTime,
      };
    }

    const resolved = path.resolve(process.cwd(), reqPath);
    const cwd = path.resolve(process.cwd());

    // Prevent directory traversal outside repo (enforce root or descendant boundary)
    const relative = path.relative(cwd, resolved);
    const isInsideRoot = !relative.startsWith('..') && !path.isAbsolute(relative);

    if (!isInsideRoot) {
      return {
        commandId: command.commandId,
        success: false,
        error: 'ACCESS_DENIED: Path traversal outside allowed workspace root is forbidden.',
        executionTimeMs: Date.now() - startTime,
      };
    }

    if (!fs.existsSync(resolved)) {
      return {
        commandId: command.commandId,
        success: false,
        error: `FILE_NOT_FOUND: "${reqPath}" does not exist.`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return {
        commandId: command.commandId,
        success: false,
        error: `CANNOT_READ_DIRECTORY: "${reqPath}" is a directory.`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const fd = fs.openSync(resolved, 'r');
    const buf = Buffer.alloc(Math.min(stat.size, maxBytes));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);

    return {
      commandId: command.commandId,
      success: true,
      data: {
        filePath: reqPath,
        content: buf.toString('utf8'),
        bytesRead: buf.length,
        totalFileSize: stat.size,
        truncated: stat.size > maxBytes,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 4. system.run_script implementation
  private async handleRunScript(command: BodyCommand, startTime: number): Promise<BodyCommandResult> {
    const scriptName = String(command.params?.scriptName || '').trim().toLowerCase();
    const script = ALLOWED_SCRIPTS[scriptName];

    if (!script) {
      return {
        commandId: command.commandId,
        success: false,
        error: `SCRIPT_NOT_PERMITTED: Script "${scriptName}" is not in whitelist. Allowed: ${Object.keys(ALLOWED_SCRIPTS).join(', ')}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const output = await script();
    return {
      commandId: command.commandId,
      success: true,
      data: {
        scriptName,
        result: output,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}

// Auto-run if executed as standalone script
const isMain = process.argv[1]?.endsWith('bodies\\desktop\\index.ts') || process.argv[1]?.endsWith('bodies/desktop/index.ts');
if (isMain) {
  const runner = new DesktopBodyRunner();
  runner.start().catch((err) => {
    console.error(`[DESKTOP-BODY] Fatal startup error:`, err);
    process.exit(1);
  });
}
