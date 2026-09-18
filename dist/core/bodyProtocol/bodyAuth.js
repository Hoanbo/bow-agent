// src/core/bodyProtocol/bodyAuth.ts
// BOWCON V4.0 — PRE-SHARED KEY (PSK) AUTHENTICATION & CONSTANT-TIME VERIFICATION FOR BODY PROTOCOL
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
let cachedPsk = null;
/**
 * Retrieves or lazily initializes the persistent Body Pre-Shared Key (PSK).
 *
 * Priority:
 * 1. Environment variable: `BOW_BODY_PSK` or `BOW_BRAIN_PSK`
 * 2. Stored configuration file: `data/config/body-psk.local`
 * 3. Automatically generated 32-byte cryptographically secure random PSK (persisted to file)
 */
export function getBodyPsk() {
    if (cachedPsk) {
        return cachedPsk;
    }
    const envPsk = process.env.BOW_BODY_PSK?.trim() || process.env.BOW_BRAIN_PSK?.trim();
    if (envPsk) {
        cachedPsk = envPsk;
        return cachedPsk;
    }
    const configDir = path.resolve(process.cwd(), 'data', 'config');
    const pskFilePath = path.join(configDir, 'body-psk.local');
    // Check if file already exists to preserve PSK across restarts
    if (fs.existsSync(pskFilePath)) {
        try {
            const savedKey = fs.readFileSync(pskFilePath, 'utf8').trim();
            if (savedKey.length >= 32) {
                cachedPsk = savedKey;
                return cachedPsk;
            }
        }
        catch (err) {
            console.warn(`[BODY-AUTH] Could not read existing PSK file at ${pskFilePath}:`, err);
        }
    }
    // Not in env and no valid local file -> Warn and auto-generate persistent random 32-byte PSK
    console.warn('[BODY-AUTH] ⚠️ CẢNH BÁO: Biến môi trường BOW_BODY_PSK chưa được thiết lập!');
    console.warn('[BODY-AUTH] Đang tự động tạo Pre-Shared Key (PSK) 32-byte ngẫu nhiên và lưu vào file cục bộ...');
    const generated = crypto.randomBytes(32).toString('base64url');
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(pskFilePath, generated, { encoding: 'utf8', mode: 0o600 });
        if (process.platform === 'win32') {
            console.warn(`[BODY-AUTH] Đã lưu PSK vào ${pskFilePath}. Lưu ý: Hệ điều hành Windows không hỗ trợ đầy đủ POSIX 0o600 permission. Cần hạn chế quyền truy cập file này nếu cần thiết.`);
        }
        else {
            try {
                fs.chmodSync(pskFilePath, 0o600);
            }
            catch (chmodErr) {
                console.warn(`[BODY-AUTH] Không thể gán quyền 0o600 cho file PSK:`, chmodErr);
            }
        }
    }
    catch (writeErr) {
        console.error(`[BODY-AUTH] Lỗi khi ghi file PSK ${pskFilePath}:`, writeErr);
    }
    cachedPsk = generated;
    return cachedPsk;
}
/**
 * Validates a client-provided Bearer token against the authoritative Body PSK using constant-time comparison.
 * Uses SHA-256 digest before timingSafeEqual to guarantee equal length buffers, preventing both length and value timing leaks.
 */
export function validateBodyPsk(providedToken) {
    if (!providedToken || typeof providedToken !== 'string') {
        return false;
    }
    const cleanProvided = providedToken.trim();
    if (cleanProvided.length === 0) {
        return false;
    }
    const authoritativePsk = getBodyPsk();
    const hashProvided = crypto.createHash('sha256').update(cleanProvided, 'utf8').digest();
    const hashAuthoritative = crypto.createHash('sha256').update(authoritativePsk, 'utf8').digest();
    return crypto.timingSafeEqual(hashProvided, hashAuthoritative);
}
/**
 * Resets cached PSK in memory (useful for testing).
 */
export function _resetCachedPskForTesting() {
    cachedPsk = null;
}
