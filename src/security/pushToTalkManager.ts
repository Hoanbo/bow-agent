// src/security/pushToTalkManager.ts
// BOWCON V4.0 — HARDWARE PUSH-TO-TALK (PTT) PRIVACY GOVERNANCE
//
// EN:
// Physical safety mechanism on Machine B preventing remote unauthorized eavesdropping.
// When enabled (DEFAULT: TRUE), any 'audio.capture' command sent from Machine A (Brain)
// will NOT execute automatically, but waits for the user to physically confirm
// (e.g. pressing hotkey or physical button on Machine B) within N seconds.
// If timeout expires without physical confirmation, the command is aborted with 'USER_DID_NOT_CONFIRM'.
//
// VI:
// Cơ chế an toàn vật lý trên Machine B ngăn chặn nghe lén từ xa khi Brain bị xâm nhập.
// Khi bật (MẶC ĐỊNH: BẬT / TRUE), bất kỳ lệnh 'audio.capture' nào gửi từ Machine A
// sẽ KHÔNG tự động thực thi ngay, mà chuyển vào trạng thái chờ người dùng xác nhận vật lý
// tại chỗ (nhấn phím tắt trên Machine B) trong vòng N giây.
// Nếu hết thời hạn mà không có xác nhận vật lý, lệnh bị hủy với lỗi 'USER_DID_NOT_CONFIRM'.

import { execSync } from 'node:child_process';
import { BODY_CONFIG } from '../core/bodyProtocol/bodyProtocolConfig.js';
import { BodyProtocolErrorCode } from '../core/bodyProtocol/errorCodes.js';

export interface PendingPttRequest {
  commandId: string;
  createdAt: number;
  timeoutMs: number;
  resolve: (confirmed: boolean) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export type PttTimeoutBeepNotifier = (type: 'timeout') => Promise<void> | void;

export function isPushToTalkEnabled(): boolean {
  // MẶC ĐỊNH BẬT: Chỉ tắt khi có chỉ định rõ ràng 'false' trong cấu hình cục bộ Machine B
  const envVal = process.env.REQUIRE_PUSH_TO_TALK || process.env.BOW_REQUIRE_PUSH_TO_TALK;
  if (typeof envVal === 'string' && envVal.trim().toLowerCase() === 'false') {
    return false;
  }
  return true;
}

export class PushToTalkManager {
  private pendingRequests = new Map<string, PendingPttRequest>();
  private defaultTimeoutMs: number;
  private hotkey: string;

  /**
   * EN: Notifier callback or delegate to emit timeout alert beeps.
   * VI: Delegate/Callback phát âm báo cảnh báo timeout.
   */
  private beepNotifier?: PttTimeoutBeepNotifier;

  /**
   * EN: Hook invoked whenever timeout beep is emitted (useful for tests and auditing).
   * VI: Hook sự kiện được gọi mỗi khi phát tiếng beep cảnh báo timeout.
   */
  public onBeep?: (type: 'timeout') => void;

  /**
   * EN: Hook invoked whenever anomalous repeated timeouts (3+ in 60s) are detected.
   * VI: Hook sự kiện được gọi khi phát hiện bất thường (>= 3 lần timeout trong 60s).
   */
  public onAnomalyDetected?: (count: number) => void;

  private recentTimeoutTimestamps: number[] = [];
  private readonly anomalyThresholdCount = BODY_CONFIG.pttAnomalyThreshold;
  private readonly anomalyWindowMs = BODY_CONFIG.pttAnomalyWindowMs;

  constructor() {
    this.defaultTimeoutMs = BODY_CONFIG.pttConfirmationTimeoutMs;
    this.hotkey = process.env.BOW_PTT_HOTKEY || 'Ctrl+Alt+Space';
  }

  public setBeepNotifier(notifier: PttTimeoutBeepNotifier): void {
    this.beepNotifier = notifier;
  }

  public getRecentTimeoutCount(): number {
    const now = Date.now();
    this.recentTimeoutTimestamps = this.recentTimeoutTimestamps.filter(
      (t) => now - t <= this.anomalyWindowMs
    );
    return this.recentTimeoutTimestamps.length;
  }

  public clearRecentTimeouts(): void {
    this.recentTimeoutTimestamps = [];
  }

  private recordTimeoutOccurrence(commandId: string): void {
    const now = Date.now();
    this.recentTimeoutTimestamps.push(now);
    this.recentTimeoutTimestamps = this.recentTimeoutTimestamps.filter(
      (t) => now - t <= this.anomalyWindowMs
    );

    if (this.recentTimeoutTimestamps.length >= this.anomalyThresholdCount) {
      console.error(
        `[PUSH-TO-TALK] 🚨 CẢNH BÁO AN NINH CẤP CAO (ANOMALY DETECTED): ` +
        `Phát hiện ${this.recentTimeoutTimestamps.length} lần Push-to-Talk timeout liên tiếp trong vòng 60 giây (Lệnh gần nhất: ${commandId})! ` +
        `Dấu hiệu bất thường: Có thể có tiến trình hoặc đối tượng từ xa đang cố gắng thăm dò / kích hoạt microphone trái phép!`
      );
      if (this.onAnomalyDetected) {
        try { this.onAnomalyDetected(this.recentTimeoutTimestamps.length); } catch {}
      }
    }
  }

  private async emitTimeoutAlertSound(): Promise<void> {
    if (this.onBeep) {
      try { this.onBeep('timeout'); } catch {}
    }

    if (this.beepNotifier) {
      await this.beepNotifier('timeout');
      return;
    }

    // Default fallback beep sound if no external notifier is configured
    if (process.platform === 'win32') {
      try {
        const { timeoutFreqHz, timeoutBurstDurationMs, timeoutPauseDurationMs } = BODY_CONFIG.beep;
        execSync(
          `powershell -NoProfile -NonInteractive -Command "[Console]::Beep(${timeoutFreqHz}, ${timeoutBurstDurationMs}); Start-Sleep -Milliseconds ${timeoutPauseDurationMs}; [Console]::Beep(${timeoutFreqHz}, ${timeoutBurstDurationMs}); Start-Sleep -Milliseconds ${timeoutPauseDurationMs}; [Console]::Beep(${timeoutFreqHz}, ${timeoutBurstDurationMs})"`,
          { stdio: 'ignore', timeout: 2000 }
        );
      } catch {}
    } else {
      console.log(`[PUSH-TO-TALK-BEEP] 🔔 PTT TIMEOUT ALERT BEEP (3x ${BODY_CONFIG.beep.timeoutFreqHz}Hz) emitted.`);
    }
  }

  public isEnabled(): boolean {
    return isPushToTalkEnabled();
  }

  public getHotkey(): string {
    return this.hotkey;
  }

  /**
   * Đợi xác nhận vật lý (Push-to-Talk) từ người dùng cục bộ tại Machine B.
   */
  public async waitForConfirmation(commandId: string, customTimeoutMs?: number): Promise<boolean> {
    if (!this.isEnabled()) {
      return true; // PTT tắt -> cho phép thực thi (vẫn có Beep bắt buộc)
    }

    const timeoutMs = customTimeoutMs || this.defaultTimeoutMs;

    return new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(async () => {
        this.pendingRequests.delete(commandId);

        // 1. Ghi nhận thời điểm timeout và phát hiện pattern bất thường
        this.recordTimeoutOccurrence(commandId);

        console.warn(
          `[PUSH-TO-TALK] ⏱️ TIMEOUT: Hết thời hạn (${timeoutMs}ms) mà không nhận được xác nhận vật lý. ` +
          `Hủy lệnh thu âm ID: ${commandId}.`
        );

        // 2. Phát tín hiệu âm thanh cảnh báo bắt buộc TRƯỚC KHI resolve
        try {
          await this.emitTimeoutAlertSound();
        } catch (err: any) {
          console.error(`[PUSH-TO-TALK] ❌ Không thể phát beep cảnh báo timeout: ${err?.message}`);
        }

        // 3. Trả về false hủy lệnh
        resolve(false);
      }, timeoutMs);

      this.pendingRequests.set(commandId, {
        commandId,
        createdAt: Date.now(),
        timeoutMs,
        resolve,
        reject,
        timer,
      });

      console.log(
        `[PUSH-TO-TALK] 🛡️ Đang chờ Chủ nhân nhấn phím vật lý [${this.hotkey}] ` +
        `hoặc xác nhận tại Machine B (ID: ${commandId}, Thời hạn: ${timeoutMs}ms)...`
      );
    });
  }

  /**
   * EN: Simulates physical key press. STRICTLY RESTRICTED TO TEST ENVIRONMENT (NODE_ENV=test).
   * VI: Giả lập việc bấm phím vật lý xác nhận PTT. BẮT BUỘC CHỈ ĐƯỢC GỌI TRONG MÔI TRƯỜNG TEST (NODE_ENV=test).
   * 
   * @throws Error with code TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV if NODE_ENV !== 'test'
   */
  public __testOnly_simulatePhysicalPress(commandId?: string): boolean {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV: __testOnly_simulatePhysicalPress ' +
        'can only be executed in test environment (NODE_ENV=test). Access denied in current environment.'
      );
    }

    if (commandId && this.pendingRequests.has(commandId)) {
      const req = this.pendingRequests.get(commandId)!;
      clearTimeout(req.timer);
      this.pendingRequests.delete(commandId);
      req.resolve(true);
      console.log(`[PUSH-TO-TALK] [TEST-SIM] ✓ Đã nhận xác nhận vật lý (giả lập) cho lệnh ID: ${commandId}`);
      return true;
    }

    // Nếu không truyền commandId, xác nhận cho request đầu tiên đang chờ
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      this.pendingRequests.delete(id);
      req.resolve(true);
      console.log(`[PUSH-TO-TALK] [TEST-SIM] ✓ Đã nhận xác nhận vật lý (giả lập) cho lệnh ID: ${id}`);
      return true;
    }

    return false;
  }

  /**
   * @deprecated REMOVED FOR SECURITY. Do not call in production or test.
   */
  public simulatePhysicalPress(commandId?: string): boolean {
    throw new Error(
      `${BodyProtocolErrorCode.TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV}: simulatePhysicalPress has been locked down and removed for security. ` +
      'Use __testOnly_simulatePhysicalPress() or TestOnlyPushToTalkController exclusively in test environment (NODE_ENV=test).'
    );
  }

  /**
   * Hủy bỏ toàn bộ request đang chờ
   */
  public cancelAll(): void {
    for (const [, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.resolve(false);
    }
    this.pendingRequests.clear();
  }

  public getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

export const globalPushToTalkManager = new PushToTalkManager();

/**
 * EN: Dedicated test-only controller for Push-to-Talk simulation.
 * VI: Bộ điều khiển chuyên dụng CHỈ DÙNG CHO TEST để mô phỏng xác nhận Push-to-Talk.
 * 
 * LƯU Ý BẢO MẬT:
 * 1. Tuyệt đối không được import hay sử dụng trong bất kỳ file production/runtime nào.
 * 2. Bắt buộc có guard NODE_ENV === 'test'.
 */
export class TestOnlyPushToTalkController {
  constructor(private manager: PushToTalkManager = globalPushToTalkManager) {}

  public simulatePhysicalPress(commandId?: string): boolean {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        `${BodyProtocolErrorCode.TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV}: TestOnlyPushToTalkController.simulatePhysicalPress ` +
        'can only be executed in test environment (NODE_ENV=test).'
      );
    }
    return this.manager.__testOnly_simulatePhysicalPress(commandId);
  }
}

