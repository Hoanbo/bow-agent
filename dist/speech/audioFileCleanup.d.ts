/**
 * EN: Safely unlink a file without throwing if it does not exist or fails.
 * VI: Xóa file một cách an toàn, không ném ngoại lệ nếu file không tồn tại hoặc không thể xóa.
 *
 * @param filePath Đường dẫn file cần xóa (cho phép null/undefined).
 * @returns true nếu file tồn tại và đã xóa thành công, false nếu file không tồn tại hoặc lỗi.
 */
export declare function safeUnlink(filePath?: string | null): boolean;
/**
 * EN: Clean up stale files in a specific directory older than maxAgeMs.
 * VI: Dọn dẹp các file cũ hơn maxAgeMs trong một thư mục chỉ định.
 *
 * @param dirPath Đường dẫn thư mục cần quét.
 * @param maxAgeMs Tuổi tối đa của file tính bằng mili-giây.
 * @param filterPattern Biểu thức chính quy lọc tên file (mặc định: .wav và .tmp).
 * @returns Số lượng file đã được xóa.
 */
export declare function cleanupStaleFilesInDir(dirPath: string, maxAgeMs?: number, filterPattern?: RegExp): number;
/**
 * EN: Clean up stale audio files across all known audio temporary directories.
 * VI: Dọn dẹp file âm thanh tạm tồn đọng trên toàn bộ các thư mục tạm đã biết.
 *
 * @param additionalDirs Các thư mục bổ sung cần quét (tùy chọn).
 * @param maxAgeMs Tuổi tối đa của file (mặc định lấy từ VOICE_CONFIG.staleAudioMaxAgeMs).
 * @returns Tổng số file đã được dọn dẹp.
 */
export declare function cleanupAudioTempDirectories(additionalDirs?: string[], maxAgeMs?: number): number;
