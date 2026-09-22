// src/speech/audioFileCleanup.ts
// BOWCON V4.0 — UNIFIED AUDIO FILE CLEANUP & SAFE UNLINK UTILITIES
//
// EN:
// Deduplicated file cleanup utilities for Voice Pipeline and Body Protocol.
// Ensures consistent, safe unlinking of temporary audio files (WAV, TMP)
// without throwing ENOENT or crashing when files are concurrently deleted.
//
// VI:
// Tiện ích dọn dẹp file âm thanh và xóa file an toàn dùng chung cho Voice Pipeline và Body Protocol.
// Đảm bảo xử lý nhất quán khi xóa file tạm (WAV, TMP), không throw ngoại lệ ENOENT
// khi file không tồn tại hoặc đã bị tiến trình khác dọn trước.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { VOICE_CONFIG } from './voicePipelineConfig.js';
/**
 * EN: Safely unlink a file without throwing if it does not exist or fails.
 * VI: Xóa file một cách an toàn, không ném ngoại lệ nếu file không tồn tại hoặc không thể xóa.
 *
 * @param filePath Đường dẫn file cần xóa (cho phép null/undefined).
 * @returns true nếu file tồn tại và đã xóa thành công, false nếu file không tồn tại hoặc lỗi.
 */
export function safeUnlink(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
    }
    catch {
        // Fail silently: file có thể đã bị xóa bởi tiến trình khác hoặc đang bị lock
    }
    return false;
}
/**
 * EN: Clean up stale files in a specific directory older than maxAgeMs.
 * VI: Dọn dẹp các file cũ hơn maxAgeMs trong một thư mục chỉ định.
 *
 * @param dirPath Đường dẫn thư mục cần quét.
 * @param maxAgeMs Tuổi tối đa của file tính bằng mili-giây.
 * @param filterPattern Biểu thức chính quy lọc tên file (mặc định: .wav và .tmp).
 * @returns Số lượng file đã được xóa.
 */
export function cleanupStaleFilesInDir(dirPath, maxAgeMs = VOICE_CONFIG.staleAudioMaxAgeMs, filterPattern = /\.(wav|tmp)$/i) {
    let cleanedCount = 0;
    try {
        if (!fs.existsSync(dirPath)) {
            return 0;
        }
        const now = Date.now();
        const entries = fs.readdirSync(dirPath);
        for (const file of entries) {
            if (!filterPattern.test(file)) {
                continue;
            }
            const filePath = path.join(dirPath, file);
            try {
                const stat = fs.statSync(filePath);
                if (stat.isFile() && (now - stat.mtimeMs >= maxAgeMs)) {
                    if (safeUnlink(filePath)) {
                        cleanedCount++;
                    }
                }
            }
            catch {
                // File có thể đang bị khóa hoặc vừa bị xóa
            }
        }
    }
    catch {
        // Fail silently: không làm gián đoạn luồng chính nếu quyền truy cập thư mục bị từ chối
    }
    return cleanedCount;
}
/**
 * EN: Clean up stale audio files across all known audio temporary directories.
 * VI: Dọn dẹp file âm thanh tạm tồn đọng trên toàn bộ các thư mục tạm đã biết.
 *
 * @param additionalDirs Các thư mục bổ sung cần quét (tùy chọn).
 * @param maxAgeMs Tuổi tối đa của file (mặc định lấy từ VOICE_CONFIG.staleAudioMaxAgeMs).
 * @returns Tổng số file đã được dọn dẹp.
 */
export function cleanupAudioTempDirectories(additionalDirs = [], maxAgeMs = VOICE_CONFIG.staleAudioMaxAgeMs) {
    const searchDirs = new Set();
    searchDirs.add(VOICE_CONFIG.tempAudioDir);
    searchDirs.add(path.resolve(process.cwd(), '.tmp', 'audio'));
    searchDirs.add(path.resolve('.tmp/audio'));
    searchDirs.add(path.join(os.tmpdir(), 'bow_audio'));
    if (process.env.BOW_AUDIO_TEMP_DIR) {
        searchDirs.add(path.resolve(process.env.BOW_AUDIO_TEMP_DIR));
    }
    for (const dir of additionalDirs) {
        if (dir)
            searchDirs.add(path.resolve(dir));
    }
    let totalCleaned = 0;
    for (const dir of searchDirs) {
        totalCleaned += cleanupStaleFilesInDir(dir, maxAgeMs);
    }
    return totalCleaned;
}
