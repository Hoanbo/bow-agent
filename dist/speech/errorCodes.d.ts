export declare const VoicePipelineErrorCode: {
    /** Quá thời gian timeout tổng thể cho toàn bộ chu trình hỏi-đáp giọng nói */
    readonly VOICE_ROUNDTRIP_TIMEOUT: "VOICE_ROUNDTRIP_TIMEOUT";
    /** Chu trình hỏi-đáp bị hủy giữa chừng */
    readonly VOICE_ROUNDTRIP_ABORTED: "VOICE_ROUNDTRIP_ABORTED";
    /** Lỗi trong giai đoạn thu âm micro từ Body */
    readonly AUDIO_CAPTURE_FAILED: "AUDIO_CAPTURE_FAILED";
    /** Lỗi trong giai đoạn nhận dạng giọng nói thành văn bản (STT) */
    readonly STT_FAILED: "STT_FAILED";
    /** Quá thời gian chờ STT */
    readonly STT_TIMEOUT: "STT_TIMEOUT";
    /** Tác vụ STT bị hủy */
    readonly STT_ABORTED: "STT_ABORTED";
    /** Whisper STT không khả dụng (thiếu file binary hoặc model) */
    readonly STT_UNAVAILABLE: "STT_UNAVAILABLE";
    /** Lỗi thực thi tiến trình STT */
    readonly STT_EXECUTION_FAILED: "STT_EXECUTION_FAILED";
    /** Tiến trình Whisper thoát với mã lỗi */
    readonly STT_PROCESS_ERROR: "STT_PROCESS_ERROR";
    /** Lỗi trong giai đoạn tổng hợp giọng nói thành văn bản (TTS) */
    readonly TTS_SYNTHESIS_FAILED: "TTS_SYNTHESIS_FAILED";
    /** Lỗi khi phát âm thanh phản hồi trên loa Body */
    readonly AUDIO_PLAY_FAILED: "AUDIO_PLAY_FAILED";
    /** Không có Body nào kết nối có hỗ trợ audio */
    readonly NO_ACTIVE_BODY: "NO_ACTIVE_BODY";
    /** Dữ liệu âm thanh truyền vào không hợp lệ */
    readonly INVALID_AUDIO: "INVALID_AUDIO";
    /** Phương thức chỉ dành cho test bị gọi ngoài môi trường test */
    readonly TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV: "TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV";
};
export type VoicePipelineErrorCode = (typeof VoicePipelineErrorCode)[keyof typeof VoicePipelineErrorCode];
