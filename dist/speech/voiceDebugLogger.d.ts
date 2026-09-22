/**
 * Ghi nội dung nhạy cảm vào debug log (CHỈ khi BOW_DEBUG_VOICE_CONTENT=true).
 * Trong production: no-op hoàn toàn.
 */
export declare function logVoiceContent(correlationId: string, stage: 'stt.complete' | 'brain.request' | 'brain.response' | 'voice_roundtrip.timeout' | string, content: string): void;
/**
 * Xóa các dòng log cũ hơn 24 giờ trong debug log file.
 * Gọi một lần khi khởi động hoặc định kỳ.
 */
export declare function purgeStaleVoiceDebugLogs(): void;
