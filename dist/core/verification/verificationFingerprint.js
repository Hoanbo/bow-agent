// src/core/verification/verificationFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.14: DETERMINISTIC VERIFICATION FINGERPRINTING
//
// EN:
// Computes deterministic FNV-1a 32-bit hashes for verification identities, evidence, postconditions, and failures.
// Guarantees 100% deterministic identity without random numbers or timestamps.
//
// VI:
// Tính toán mã băm FNV-1a 32-bit tất định cho định danh xác minh, bằng chứng, postcondition và lỗi.
// Bảo đảm định danh tất định 100% không dùng số ngẫu nhiên hoặc timestamp.
/**
 * EN: Computes a 32-bit FNV-1a hash over an array of normalized string tokens.
 * VI: Tính toán mã băm FNV-1a 32-bit trên một mảng các token chuỗi chuẩn hóa.
 */
function fnv1a32(tokens) {
    const payload = tokens.join('::');
    let hash = 2166136261;
    for (let i = 0; i < payload.length; i++) {
        hash = Math.imul(hash ^ payload.charCodeAt(i), 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/**
 * EN: Computes deterministic fingerprint for an entire verification result.
 * VI: Tính toán fingerprint tất định cho toàn bộ kết quả xác minh.
 */
export function computeVerificationFingerprint(userId, sessionId, toolName, status, postconditionHash, riskLevel, requestId) {
    return `ver_${fnv1a32([
        userId,
        sessionId,
        toolName,
        status,
        postconditionHash,
        riskLevel || 'LOW',
        requestId || 'NONE',
    ])}`;
}
/**
 * EN: Computes deterministic fingerprint for a piece of verification evidence.
 * VI: Tính toán fingerprint tất định cho một mảnh bằng chứng xác minh.
 */
export function computeEvidenceFingerprint(source, path, observedValue) {
    const serializedValue = typeof observedValue === 'object' && observedValue !== null
        ? JSON.stringify(observedValue)
        : String(observedValue);
    return `evi_${fnv1a32([source, path, serializedValue])}`;
}
/**
 * EN: Computes deterministic fingerprint for an evaluated postcondition.
 * VI: Tính toán fingerprint tất định cho một postcondition đã được đánh giá.
 */
export function computePostconditionFingerprint(postconditionId, operator, targetPath, expectedValue) {
    const serializedExpected = typeof expectedValue === 'object' && expectedValue !== null
        ? JSON.stringify(expectedValue)
        : String(expectedValue ?? 'UNDEFINED');
    return `post_${fnv1a32([postconditionId, operator, targetPath, serializedExpected])}`;
}
/**
 * EN: Computes deterministic fingerprint for a verification failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả lỗi xác minh.
 */
export function computeVerificationFailureFingerprint(userId, sessionId, category, message) {
    return `verfail_${fnv1a32([userId, sessionId, category, message])}`;
}
