// src/speech/errorCodes.ts
// BOWCON V4.0 — CENTRALIZED ERROR CODES FOR VOICE PIPELINE & SPEECH ENGINES
//
// EN:
// Authoritative error code constants for Voice Pipeline, Whisper STT, and Piper TTS.
// Guarantees type safety across STT/LLM/TTS roundtrip and abort/timeout handlers.
//
// VI:
// Mã lỗi chuẩn hóa tập trung cho Voice Pipeline, Whisper STT và Piper TTS.
// Đảm bảo an toàn kiểu dữ liệu trong toàn bộ quy trình Roundtrip và xử lý hủy/timeout.

export const VoicePipelineErrorCode = {
  /** Quá thời gian timeout tổng thể cho toàn bộ chu trình hỏi-đáp giọng nói */
  VOICE_ROUNDTRIP_TIMEOUT: 'VOICE_ROUNDTRIP_TIMEOUT',

  /** Chu trình hỏi-đáp bị hủy giữa chừng */
  VOICE_ROUNDTRIP_ABORTED: 'VOICE_ROUNDTRIP_ABORTED',

  /** Lỗi trong giai đoạn thu âm micro từ Body */
  AUDIO_CAPTURE_FAILED: 'AUDIO_CAPTURE_FAILED',

  /** Lỗi trong giai đoạn nhận dạng giọng nói thành văn bản (STT) */
  STT_FAILED: 'STT_FAILED',

  /** Quá thời gian chờ STT */
  STT_TIMEOUT: 'STT_TIMEOUT',

  /** Tác vụ STT bị hủy */
  STT_ABORTED: 'STT_ABORTED',

  /** Whisper STT không khả dụng (thiếu file binary hoặc model) */
  STT_UNAVAILABLE: 'STT_UNAVAILABLE',

  /** Lỗi thực thi tiến trình STT */
  STT_EXECUTION_FAILED: 'STT_EXECUTION_FAILED',

  /** Tiến trình Whisper thoát với mã lỗi */
  STT_PROCESS_ERROR: 'STT_PROCESS_ERROR',

  /** Lỗi trong giai đoạn tổng hợp giọng nói thành văn bản (TTS) */
  TTS_SYNTHESIS_FAILED: 'TTS_SYNTHESIS_FAILED',

  /** Lỗi khi phát âm thanh phản hồi trên loa Body */
  AUDIO_PLAY_FAILED: 'AUDIO_PLAY_FAILED',

  /** Không có Body nào kết nối có hỗ trợ audio */
  NO_ACTIVE_BODY: 'NO_ACTIVE_BODY',

  /** Dữ liệu âm thanh truyền vào không hợp lệ */
  INVALID_AUDIO: 'INVALID_AUDIO',

  /** Phương thức chỉ dành cho test bị gọi ngoài môi trường test */
  TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV: 'TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV',
} as const;

export type VoicePipelineErrorCode = (typeof VoicePipelineErrorCode)[keyof typeof VoicePipelineErrorCode];
