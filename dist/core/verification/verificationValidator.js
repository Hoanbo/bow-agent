// src/core/verification/verificationValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.14: VERIFICATION SECURITY & INVARIANT VALIDATOR
//
// EN:
// Authoritative security and invariant validator for the verification subsystem.
// Enforces multi-tenant isolation, secret scrubbing, safe path access, prototype pollution defense,
// null-byte defense, confidence clamping, and risk preservation.
//
// VI:
// Bộ xác thực an ninh và bất biến có thẩm quyền cho phân hệ xác minh.
// Thực thi cô lập multi-tenant, tẩy sạch bí mật, truy cập đường dẫn an toàn, chống ô nhiễm prototype,
// chống null-byte, giới hạn confidence và bảo toàn rủi ro.
const DISALLOWED_USERS = new Set([
    '',
    'anonymous',
    'anon',
    'unknown',
    'unauthenticated',
    'null',
    'undefined',
]);
const SECRET_PATTERNS = [
    /bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
    /api[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}['"]?/i,
    /authorization\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}['"]?/i,
    /password\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/i,
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
    /credentials?\s*[:=]/i,
    /sk-[a-zA-Z0-9]{20,}/i,
    /pwd=([^\s;]+)/i,
];
const PROTOTYPE_POLLUTION_REGEX = /(__proto__|constructor|prototype)/i;
const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);
const RISK_HIERARCHY = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
};
/**
 * EN: Scrubs and redacts secrets from any string.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi ký tự nào.
 */
export function redactVerificationSecrets(text) {
    if (typeof text !== 'string')
        return '';
    let sanitized = text;
    for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }
    return sanitized;
}
/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export function containsVerificationSecret(val) {
    if (typeof val !== 'string')
        return false;
    return SECRET_PATTERNS.some(p => p.test(val));
}
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export function hasVerificationPrototypePollution(target) {
    if (!target || typeof target !== 'object')
        return false;
    if (Object.prototype.hasOwnProperty.call(target, '__proto__'))
        return true;
    if (Object.prototype.hasOwnProperty.call(target, 'prototype'))
        return true;
    if (Object.prototype.hasOwnProperty.call(target, 'constructor') && typeof target.constructor !== 'function')
        return true;
    const proto = Object.getPrototypeOf(target);
    if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) {
        return true;
    }
    for (const [k, v] of Object.entries(target)) {
        if (PROTOTYPE_POLLUTION_REGEX.test(k))
            return true;
        if (v && typeof v === 'object' && hasVerificationPrototypePollution(v))
            return true;
    }
    return false;
}
/**
 * EN: Validates that a target property path is strictly safe against traversal and injection.
 * VI: Xác thực rằng đường dẫn thuộc tính mục tiêu hoàn toàn an toàn chống traversal và chèn mã.
 */
export function validateSafePath(path) {
    if (typeof path !== 'string' || path.trim().length === 0) {
        return false;
    }
    // Reject null bytes
    if (path.includes('\0') || path.includes('%00')) {
        return false;
    }
    // Reject path traversal
    if (path.includes('..') || path.includes('/../') || path.includes('\\..\\')) {
        return false;
    }
    // Reject prototype pollution keywords
    if (PROTOTYPE_POLLUTION_REGEX.test(path)) {
        return false;
    }
    // Validate each segment
    const segments = path.split('.');
    for (const seg of segments) {
        const trimmed = seg.trim().toUpperCase();
        if (trimmed.length === 0)
            return false;
        if (WINDOWS_RESERVED_DEVICE_NAMES.has(trimmed))
            return false;
        if (PROTOTYPE_POLLUTION_REGEX.test(seg))
            return false;
    }
    return true;
}
/**
 * EN: Validates and bounds a confidence score into [0.0, 1.0], strictly rejecting NaN or Infinity.
 * VI: Xác thực và giới hạn điểm tin cậy trong khoảng [0.0, 1.0], nghiêm cấm NaN hoặc Infinity.
 */
export function validateConfidence(confidence) {
    if (typeof confidence !== 'number' || Number.isNaN(confidence) || !Number.isFinite(confidence)) {
        throw new Error(`INVALID_CONFIDENCE: Confidence score must be a finite number, received: ${confidence}`);
    }
    if (confidence < 0.0 || confidence > 1.0) {
        throw new Error(`CONFIDENCE_OUT_OF_BOUNDS: Confidence must be within [0.0, 1.0], received: ${confidence}`);
    }
    return Math.round(confidence * 1000) / 1000;
}
/**
 * EN: Enforces valid tenant identity and multi-tenant session isolation.
 * VI: Thực thi định danh tenant hợp lệ và cô lập phiên làm việc multi-tenant.
 */
export function validateVerificationScope(userId, sessionId) {
    if (!userId || typeof userId !== 'string' || DISALLOWED_USERS.has(userId.trim().toLowerCase())) {
        throw new Error(`INVALID_USER_SCOPE: Access denied for invalid or anonymous userId: "${userId}"`);
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw new Error(`INVALID_SESSION_SCOPE: Access denied for missing or invalid sessionId`);
    }
    if (userId.includes('\0') || sessionId.includes('\0')) {
        throw new Error('NULL_BYTE_DETECTED: Null bytes in scope identity are strictly forbidden');
    }
    if (PROTOTYPE_POLLUTION_REGEX.test(userId) || PROTOTYPE_POLLUTION_REGEX.test(sessionId)) {
        throw new Error('PROTOTYPE_POLLUTION: Scope identity contains disallowed prototype pollution keys');
    }
}
/**
 * EN: Enforces that risk level is never downgraded during verification.
 * VI: Thực thi việc không bao giờ hạ cấp mức độ rủi ro trong quá trình xác minh.
 */
export function assertVerificationRiskPreservation(priorRisk, currentRisk) {
    const priorRank = RISK_HIERARCHY[priorRisk] ?? 1;
    const currentRank = RISK_HIERARCHY[currentRisk] ?? 1;
    if (currentRank < priorRank) {
        throw new Error(`RISK_DOWNGRADE_FORBIDDEN: Cannot downgrade verification risk from ${priorRisk} to ${currentRisk}`);
    }
}
