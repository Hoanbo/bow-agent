// src/speech/voicePipelineConfig.ts
// BOWCON V4.0 — CENTRALIZED VOICE PIPELINE CONFIGURATION
//
// EN:
// Centralized configuration constants for the Voice Pipeline (Machine B <-> Machine A).
// Governs timeouts, audio formats, sample rates, binary/model paths, and temp directories.
// All values provide robust production defaults and can be tuned via environment variables.
//
// VI:
// Hằng số cấu hình tập trung cho Voice Pipeline (Machine B <-> Machine A).
// Quản lý các ngưỡng timeout, định dạng âm thanh, tần số lấy mẫu, đường dẫn mô hình và thư mục tạm.
// Toàn bộ giá trị có mặc định chuẩn cho production và có thể ghi đè qua biến môi trường.
import path from 'node:path';
import { CONFIG } from '../config.js';
function getEnvNumber(key, defaultValue) {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        const parsed = parseInt(process.env[key], 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
}
function getEnvString(key, defaultValue) {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key].trim();
    }
    return defaultValue;
}
export const VOICE_CONFIG = {
    /**
     * Thời gian timeout tối đa cho toàn bộ một lượt tương tác hỏi-đáp bằng giọng nói (Roundtrip E2E).
     * Mặc định: 30000ms (30 giây).
     * Ảnh hưởng: Nếu quá thời gian này, Promise.race sẽ kích hoạt, hủy tác vụ con (Whisper/Piper) và dọn dẹp file tạm.
     */
    get maxE2eTimeoutMs() {
        return Math.max(50, getEnvNumber('BOW_VOICE_MAX_E2E_TIMEOUT_MS', CONFIG.voiceMaxE2eTimeoutMs || 30000));
    },
    /**
     * Thời gian timeout mặc định cho tiến trình Speech-To-Text (Whisper.cpp).
     * Mặc định: 20000ms (20 giây).
     */
    get sttTimeoutMs() {
        return Math.max(100, getEnvNumber('BOW_STT_TIMEOUT_MS', 20000));
    },
    /**
     * Thời gian timeout mặc định cho tiến trình Text-To-Speech (Piper TTS).
     * Mặc định: 15000ms (15 giây).
     */
    get ttsTimeoutMs() {
        return Math.max(100, getEnvNumber('BOW_TTS_TIMEOUT_MS', 15000));
    },
    /**
     * Thời lượng thu âm mặc định qua microphone phần cứng (audio.capture).
     * Mặc định: 2000ms (2 giây).
     */
    get defaultCaptureDurationMs() {
        return Math.max(100, getEnvNumber('BOW_AUDIO_CAPTURE_DURATION_MS', 2000));
    },
    /**
     * Tần số lấy mẫu âm thanh mặc định cho STT/Microphone.
     * Mặc định: 16000Hz (chuẩn 16kHz 16-bit PCM cho Whisper).
     */
    get defaultSampleRate() {
        return getEnvNumber('BOW_AUDIO_SAMPLE_RATE', 16000);
    },
    /**
     * Số kênh âm thanh mặc định (1: Mono, 2: Stereo).
     * Mặc định: 1 (Mono).
     */
    get defaultChannels() {
        return getEnvNumber('BOW_AUDIO_CHANNELS', 1);
    },
    /**
     * Tần số lấy mẫu cho Piper TTS (Duy Oryx model).
     * Mặc định: 22050Hz.
     */
    piperSampleRate: 22050,
    /**
     * Ngôn ngữ mặc định cho STT.
     * Mặc định: 'vi' (tiếng Việt).
     */
    defaultLanguage: getEnvString('BOW_STT_LANGUAGE', 'vi'),
    /**
     * Thư mục lưu trữ tạm thời các file WAV âm thanh.
     * Mặc định: '.tmp/audio'.
     */
    tempAudioDir: path.resolve(getEnvString('BOW_TEMP_AUDIO_DIR', '.tmp/audio')),
    /**
     * Đường dẫn thực thi Whisper CLI.
     */
    whisperExePath: path.resolve(getEnvString('BOW_WHISPER_EXE', 'bin/whisper/whisper-cli.exe')),
    /**
     * Đường dẫn mô hình Whisper GGML.
     */
    whisperModelPath: path.resolve(getEnvString('BOW_WHISPER_MODEL', 'artifacts/voice-benchmark/models-cache/whisper/ggml-base.bin')),
    /**
     * Đường dẫn thực thi Piper TTS.
     */
    piperExePath: path.resolve(getEnvString('BOW_PIPER_EXE', 'bin/piper/piper.exe')),
    /**
     * Đường dẫn mô hình Piper TTS tiếng Việt (Duy Oryx).
     */
    piperModelPath: path.resolve(getEnvString('BOW_PIPER_MODEL', 'artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx')),
    /**
     * Đường dẫn file cấu hình json của mô hình Piper TTS.
     */
    piperConfigPath: path.resolve(getEnvString('BOW_PIPER_CONFIG', 'artifacts/voice-benchmark/models-cache/voice-07-duy-oryx/duyoryx3175.onnx.json')),
    /**
     * Thời gian tối đa file âm thanh tạm được coi là hợp lệ (sau thời gian này sẽ bị cleanupStaleTempFiles xóa khi khởi động).
     * Mặc định: 5 phút (300000ms).
     */
    staleAudioMaxAgeMs: Math.max(10000, getEnvNumber('BOW_STALE_AUDIO_MAX_AGE_MS', 5 * 60 * 1000)),
};
