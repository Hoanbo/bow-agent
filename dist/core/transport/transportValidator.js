// src/core/transport/transportValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT SECURITY & SCOPE VALIDATOR
//
// EN:
// Authoritative transport validation: 5-tuple multi-tenant scope isolation
// (${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}),
// prototype pollution defense, null-byte checks, path traversal checks,
// Windows reserved name defense, monotonic risk preservation, resource boundaries,
// and secret redaction.
//
// VI:
// Xác thực truyền tải có thẩm quyền: cô lập phạm vi đa người dùng bộ 5
// (${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}),
// chống ô nhiễm prototype, kiểm tra null-byte, duyệt đường dẫn,
// tên cấm Windows, bảo toàn rủi ro đơn điệu, giới hạn tài nguyên và lọc bí mật.
/**
 * EN: Windows reserved device names that must never appear in identifiers.
 * VI: Các tên thiết bị được bảo lưu của Windows không bao giờ được xuất hiện trong định danh.
 */
const WINDOWS_RESERVED_NAMES = Object.freeze(new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]));
/**
 * EN: Regex patterns detecting sensitive credentials, tokens, and keys.
 * VI: Các biểu thức chính quy phát hiện thông tin xác thực, token và khóa nhạy cảm.
 */
const SENSITIVE_PATTERNS = Object.freeze([
    /(?:api[_-]?key|secret|token|password|bearer|auth|private[_-]?key)\s*[:=\s]\s*["']?([a-zA-Z0-9_\-.]{8,})["']?/i,
    /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,})\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
]);
/**
 * EN: Resource boundary constants.
 * VI: Các hằng số giới hạn tài nguyên.
 */
export const MAX_TRANSPORT_MESSAGE_BYTES = 1024 * 1024; // 1 MB
export const MAX_METADATA_DEPTH = 8;
export const MAX_CORRELATION_LENGTH = 256;
export const MAX_QUEUE_DEPTH = 1000;
/**
 * EN: Validates a generic string identifier against injection, traversal, and reserved names.
 * VI: Kiểm tra một định danh chuỗi tổng quát chống lại tiêm nhiễm, duyệt đường dẫn và tên cấm.
 */
export function validateTransportIdentifier(name, value) {
    if (typeof value !== 'string') {
        throw new Error(`[TRANSPORT_VALIDATION_ERROR] Identifier "${name}" must be a non-empty string.`);
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new Error(`[TRANSPORT_VALIDATION_ERROR] Identifier "${name}" cannot be empty.`);
    }
    // Null byte injection check
    if (trimmed.includes('\0')) {
        throw new Error(`[TRANSPORT_SECURITY_ERROR] Null bytes forbidden in identifier "${name}".`);
    }
    // Prototype pollution tokens
    if (trimmed === '__proto__' ||
        trimmed === 'constructor' ||
        trimmed === 'prototype' ||
        trimmed.includes('__proto__') ||
        trimmed.includes('constructor.prototype')) {
        throw new Error(`[TRANSPORT_SECURITY_ERROR] Prototype pollution token forbidden in identifier "${name}".`);
    }
    // Path traversal check
    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
        throw new Error(`[TRANSPORT_SECURITY_ERROR] Path traversal tokens forbidden in identifier "${name}".`);
    }
    // Windows reserved device check
    const upper = trimmed.toUpperCase();
    if (WINDOWS_RESERVED_NAMES.has(upper)) {
        throw new Error(`[TRANSPORT_SECURITY_ERROR] Windows reserved device name forbidden in identifier "${name}": "${upper}".`);
    }
    return trimmed;
}
/**
 * EN: Validates 5-tuple multi-tenant scoped connection identities.
 * VI: Kiểm tra danh tính kết nối theo phạm vi đa người dùng bộ 5.
 */
export function validateTransportScope(params) {
    const userId = validateTransportIdentifier('userId', params.userId);
    const sessionId = validateTransportIdentifier('sessionId', params.sessionId);
    const brainId = validateTransportIdentifier('brainId', params.brainId);
    const surfaceId = validateTransportIdentifier('surfaceId', params.surfaceId);
    const transportId = validateTransportIdentifier('transportId', params.transportId);
    const scopeKey = `${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}`;
    return { userId, sessionId, brainId, surfaceId, transportId, scopeKey };
}
/**
 * EN: Checks whether a string contains sensitive patterns.
 * VI: Kiểm tra xem chuỗi có chứa mẫu hình nhạy cảm hay không.
 */
export function containsTransportSecret(input) {
    return SENSITIVE_PATTERNS.some(pat => pat.test(input));
}
/**
 * EN: Redacts sensitive secrets from strings, error messages, and logs.
 * VI: Che dấu các bí mật nhạy cảm khỏi chuỗi, thông báo lỗi và nhật ký.
 */
export function redactTransportSecrets(input) {
    let result = input;
    for (const pat of SENSITIVE_PATTERNS) {
        result = result.replace(pat, '[REDACTED_SECRET]');
    }
    return result;
}
/**
 * EN: Inspects metadata object depth recursively to enforce resource bounds.
 * VI: Kiểm tra độ sâu của đối tượng metadata đệ quy để thực thi giới hạn tài nguyên.
 */
export function validateMetadataDepth(obj, currentDepth = 1) {
    if (currentDepth > MAX_METADATA_DEPTH) {
        throw new Error(`[TRANSPORT_RESOURCE_ERROR] Metadata exceeds maximum nesting depth of ${MAX_METADATA_DEPTH}.`);
    }
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                throw new Error(`[TRANSPORT_SECURITY_ERROR] Prototype pollution key forbidden in metadata.`);
            }
            validateMetadataDepth(obj[key], currentDepth + 1);
        }
    }
}
/**
 * EN: Validates payload and metadata resource bounds.
 * VI: Kiểm tra các giới hạn tài nguyên của payload và metadata.
 */
export function validateMessageResourceBounds(payload) {
    if (payload !== undefined && payload !== null) {
        validateMetadataDepth(payload);
        const serialized = JSON.stringify(payload);
        if (serialized.length > MAX_TRANSPORT_MESSAGE_BYTES) {
            throw new Error(`[TRANSPORT_RESOURCE_ERROR] Message size (${serialized.length} bytes) exceeds maximum limit (${MAX_TRANSPORT_MESSAGE_BYTES} bytes).`);
        }
    }
}
/**
 * EN: Numerical rank for monotonic risk preservation.
 * VI: Thứ hạng số học để bảo toàn rủi ro đơn điệu.
 */
const RISK_ORDER = Object.freeze({
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
});
/**
 * EN: Asserts risk preservation: transport message must NEVER downgrade risk.
 * VI: Khẳng định bảo toàn rủi ro: thông điệp truyền tải KHÔNG BAO GIỜ được hạ cấp rủi ro.
 */
export function assertTransportRiskPreservation(priorRisk, newRisk) {
    const priorRank = RISK_ORDER[priorRisk] ?? 1;
    const newRank = RISK_ORDER[newRisk] ?? 1;
    if (newRank < priorRank) {
        throw new Error(`[TRANSPORT_RISK_DOWNGRADE_ERROR] Monotonic risk violation: cannot downgrade risk from ${priorRisk} to ${newRisk}.`);
    }
}
/**
 * EN: Asserts sequence monotonicity: sequence numbers must be positive integers.
 * VI: Khẳng định tính đơn điệu của chuỗi: số thứ tự phải là số nguyên dương.
 */
export function assertTransportSequenceMonotonicity(priorSequence, newSequence) {
    if (typeof newSequence !== 'number' ||
        isNaN(newSequence) ||
        !Number.isInteger(newSequence) ||
        newSequence <= 0) {
        throw new Error(`[TRANSPORT_SEQUENCE_ERROR] Invalid sequence number: ${newSequence}. Must be positive integer.`);
    }
    if (newSequence < priorSequence) {
        throw new Error(`[TRANSPORT_SEQUENCE_ERROR] Monotonic sequence violation: new sequence ${newSequence} is less than prior sequence ${priorSequence}.`);
    }
}
/**
 * EN: Recursively freezes an object and all nested properties for deep immutability.
 * VI: Đóng băng đệ quy một đối tượng và tất cả các thuộc tính lồng nhau để đảm bảo tính bất biến sâu.
 */
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
        const prop = obj[key];
        if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
            deepFreeze(prop);
        }
    }
    return obj;
}
