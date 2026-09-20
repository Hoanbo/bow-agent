// src/core/bodyProtocol/bodyProtocolConfig.ts
// BOWCON V4.0 — CENTRALIZED BODY PROTOCOL CONFIGURATION
//
// EN:
// Centralized configuration constants for the Body Protocol (Central Brain <-> Peripheral Bodies).
// Governs timeouts, heartbeats, Push-to-Talk confirmation windows, anomaly thresholds, and beep patterns.
// All values provide robust defaults and support environment variable overrides.
//
// VI:
// Hằng số cấu hình tập trung cho Body Protocol (Não bộ Trung tâm <-> Thể xác Ngoại vi).
// Quản lý các ngưỡng timeout, heartbeat, cửa sổ xác nhận Push-to-Talk, ngưỡng phát hiện bất thường và âm beep.
// Toàn bộ giá trị có mặc định chuẩn và hỗ trợ ghi đè qua biến môi trường.

function getEnvNumber(key: string, defaultValue: number): number {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    const parsed = parseInt(process.env[key]!, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

function getEnvString(key: string, defaultValue: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!.trim();
  }
  return defaultValue;
}

export const BODY_CONFIG = {
  /**
   * Timeout tối đa chờ phản hồi cho một lệnh điều phối xuống Body ngoại vi.
   * Mặc định: 10000ms (10 giây).
   * Ảnh hưởng: Nếu Body không phản hồi trong khoảng này, Promise lệnh sẽ bị reject với COMMAND_TIMEOUT.
   */
  get commandTimeoutMs(): number {
    return Math.max(100, getEnvNumber('BOW_BODY_COMMAND_TIMEOUT_MS', 10000));
  },

  /**
   * Thời gian timeout cho Heartbeat từ Body.
   * Mặc định: 15000ms (15 giây).
   * Ảnh hưởng: Nếu quá 15s không nhận được heartbeat, Body sẽ bị coi là mất kết nối và gỡ khỏi registry.
   */
  get heartbeatTimeoutMs(): number {
    return Math.max(500, getEnvNumber('BOW_BODY_HEARTBEAT_TIMEOUT_MS', 15000));
  },

  /**
   * Chu kỳ chạy dọn dẹp (sweep) kiểm tra các Body hết hạn heartbeat.
   * Mặc định: 5000ms (5 giây).
   */
  get sweepIntervalMs(): number {
    return Math.max(200, getEnvNumber('BOW_BODY_SWEEP_INTERVAL_MS', 5000));
  },

  /**
   * Chu kỳ Body gửi heartbeat ping lên Brain.
   * Mặc định: 5000ms (5 giây).
   */
  get heartbeatIntervalMs(): number {
    return Math.max(200, getEnvNumber('BOW_BODY_HEARTBEAT_INTERVAL_MS', 5000));
  },

  /**
   * Thời gian chờ người dùng nhấn phím vật lý xác nhận Push-to-Talk (PTT).
   * Mặc định: 5000ms (5 giây).
   * Ảnh hưởng: Hết thời gian này lệnh thu âm tự động bị hủy để bảo vệ quyền riêng tư.
   */
  get pttConfirmationTimeoutMs(): number {
    return Math.max(50, getEnvNumber('BOW_PTT_TIMEOUT_MS', 5000));
  },

  /**
   * Ngưỡng phát hiện bất thường PTT (Anomaly Detection Threshold).
   * Mặc định: 3 lần timeout liên tiếp.
   */
  get pttAnomalyThreshold(): number {
    return Math.max(2, getEnvNumber('BOW_PTT_ANOMALY_THRESHOLD', 3));
  },

  /**
   * Khoảng thời gian cửa sổ trượt để đếm số lần timeout bất thường (Anomaly Detection Window).
   * Mặc định: 60000ms (60 giây).
   */
  get pttAnomalyWindowMs(): number {
    return Math.max(1000, getEnvNumber('BOW_PTT_ANOMALY_WINDOW_MS', 60000));
  },

  /**
   * Cấu hình âm thanh chỉ báo an toàn vật lý (Privacy Beep Tones):
   */
  beep: {
    /** Tiếng Beep bắt đầu thu âm: 1200Hz cao, 1 tiếng 120ms */
    startFreqHz: 1200,
    startDurationMs: 120,

    /** Tiếng Beep kết thúc thu âm: 600Hz trầm, 1 tiếng 150ms */
    stopFreqHz: 600,
    stopDurationMs: 150,

    /** Tiếng Beep cảnh báo timeout PTT: 400Hz trầm, 3 tiếng ngắn 80ms ngắt quãng 40ms */
    timeoutFreqHz: 400,
    timeoutBurstCount: 3,
    timeoutBurstDurationMs: 80,
    timeoutPauseDurationMs: 40,
  },

  /**
   * Đường dẫn file script khay hệ thống chỉ báo quyền riêng tư (Privacy Indicator).
   */
  get privacyIndicatorScriptPath(): string {
    return getEnvString('BOW_PRIVACY_INDICATOR_SCRIPT', 'scripts/privacy_tray_indicator.ps1');
  },

  /**
   * Đường dẫn chứng chỉ CA mặc định.
   */
  get defaultCaCertPath(): string {
    return getEnvString('BOW_BRAIN_CA_PATH', 'data/certs/ca.crt');
  },
} as const;
