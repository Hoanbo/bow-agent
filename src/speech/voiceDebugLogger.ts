// src/speech/voiceDebugLogger.ts
// BOWCON V4.0 — VOICE DEBUG LOGGER (PII-SAFE)
//
// Ghi nội dung nhạy cảm (transcript, response text) vào file log riêng biệt,
// CHỈ khi biến môi trường BOW_DEBUG_VOICE_CONTENT=true được đặt rõ ràng.
// Log tự xóa sau 24 giờ. File này PHẢI có trong .gitignore.
//
// QUAN TRỌNG: Đây là debug facility — KHÔNG bao giờ kích hoạt trong production.
// Trong production, chỉ metadata (độ dài, thời lượng, correlation ID) được ghi log.

import fs from 'node:fs';
import path from 'node:path';

const DEBUG_VOICE_CONTENT = process.env.BOW_DEBUG_VOICE_CONTENT === 'true';
const LOG_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 giờ
const DEBUG_LOG_DIR = path.resolve('.system_generated', 'voice_debug');
const DEBUG_LOG_FILE = path.join(DEBUG_LOG_DIR, 'voice_content.log');

/**
 * Ghi nội dung nhạy cảm vào debug log (CHỈ khi BOW_DEBUG_VOICE_CONTENT=true).
 * Trong production: no-op hoàn toàn.
 */
export function logVoiceContent(
  correlationId: string,
  stage: 'stt.complete' | 'brain.request' | 'brain.response' | 'voice_roundtrip.timeout' | string,
  content: string
): void {
  if (!DEBUG_VOICE_CONTENT) {
    // Production: tuyệt đối không ghi nội dung nhạy cảm
    return;
  }

  try {
    if (!fs.existsSync(DEBUG_LOG_DIR)) {
      fs.mkdirSync(DEBUG_LOG_DIR, { recursive: true });
      // Tạo .gitignore trong thư mục để đảm bảo không commit log lên repo
      fs.writeFileSync(
        path.join(DEBUG_LOG_DIR, '.gitignore'),
        '# DO NOT COMMIT — contains sensitive voice transcripts\n*\n'
      );
    }

    const entry = `${new Date().toISOString()} [${stage}] [${correlationId}] ${content}\n`;
    fs.appendFileSync(DEBUG_LOG_FILE, entry, 'utf8');
  } catch {
    // Fail silently — debug logger không được làm crash production pipeline
  }
}

/**
 * Xóa các dòng log cũ hơn 24 giờ trong debug log file.
 * Gọi một lần khi khởi động hoặc định kỳ.
 */
export function purgeStaleVoiceDebugLogs(): void {
  if (!fs.existsSync(DEBUG_LOG_FILE)) {
    return;
  }

  try {
    const now = Date.now();
    const lines = fs.readFileSync(DEBUG_LOG_FILE, 'utf8').split('\n');
    const freshLines = lines.filter((line) => {
      if (!line.trim()) return false;
      // Dòng log bắt đầu bằng ISO timestamp: 2026-09-20T...
      const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
      if (!match) return false;
      const ts = new Date(match[1]).getTime();
      return now - ts < LOG_MAX_AGE_MS;
    });

    if (freshLines.length === 0) {
      fs.unlinkSync(DEBUG_LOG_FILE);
    } else {
      fs.writeFileSync(DEBUG_LOG_FILE, freshLines.join('\n') + '\n', 'utf8');
    }
  } catch {
    // Fail silently
  }
}
