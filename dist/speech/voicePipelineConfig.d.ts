export declare const VOICE_CONFIG: {
    /**
     * Thời gian timeout tối đa cho toàn bộ một lượt tương tác hỏi-đáp bằng giọng nói (Roundtrip E2E).
     * Mặc định: 30000ms (30 giây).
     * Ảnh hưởng: Nếu quá thời gian này, Promise.race sẽ kích hoạt, hủy tác vụ con (Whisper/Piper) và dọn dẹp file tạm.
     */
    readonly maxE2eTimeoutMs: number;
    /**
     * Thời gian timeout mặc định cho tiến trình Speech-To-Text (Whisper.cpp).
     * Mặc định: 20000ms (20 giây).
     */
    readonly sttTimeoutMs: number;
    /**
     * Thời gian timeout mặc định cho tiến trình Text-To-Speech (Piper TTS).
     * Mặc định: 15000ms (15 giây).
     */
    readonly ttsTimeoutMs: number;
    /**
     * Thời lượng thu âm mặc định qua microphone phần cứng (audio.capture).
     * Mặc định: 2000ms (2 giây).
     */
    readonly defaultCaptureDurationMs: number;
    /**
     * Tần số lấy mẫu âm thanh mặc định cho STT/Microphone.
     * Mặc định: 16000Hz (chuẩn 16kHz 16-bit PCM cho Whisper).
     */
    readonly defaultSampleRate: number;
    /**
     * Số kênh âm thanh mặc định (1: Mono, 2: Stereo).
     * Mặc định: 1 (Mono).
     */
    readonly defaultChannels: number;
    /**
     * Tần số lấy mẫu cho Piper TTS (Duy Oryx model).
     * Mặc định: 22050Hz.
     */
    readonly piperSampleRate: 22050;
    /**
     * Ngôn ngữ mặc định cho STT.
     * Mặc định: 'vi' (tiếng Việt).
     */
    readonly defaultLanguage: string;
    /**
     * Thư mục lưu trữ tạm thời các file WAV âm thanh.
     * Mặc định: '.tmp/audio'.
     */
    readonly tempAudioDir: string;
    /**
     * Đường dẫn thực thi Whisper CLI.
     */
    readonly whisperExePath: string;
    /**
     * Đường dẫn mô hình Whisper GGML.
     */
    readonly whisperModelPath: string;
    /**
     * Đường dẫn thực thi Piper TTS.
     */
    readonly piperExePath: string;
    /**
     * Đường dẫn mô hình Piper TTS tiếng Việt (Duy Oryx).
     */
    readonly piperModelPath: string;
    /**
     * Đường dẫn file cấu hình json của mô hình Piper TTS.
     */
    readonly piperConfigPath: string;
    /**
     * Thời gian tối đa file âm thanh tạm được coi là hợp lệ (sau thời gian này sẽ bị cleanupStaleTempFiles xóa khi khởi động).
     * Mặc định: 5 phút (300000ms).
     */
    readonly staleAudioMaxAgeMs: number;
};
