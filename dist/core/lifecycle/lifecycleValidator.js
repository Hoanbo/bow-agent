// src/core/lifecycle/lifecycleValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.13: LIFECYCLE SECURITY & INVARIANT VALIDATOR
//
// EN:
// Authoritative security and invariant validator for the lifecycle subsystem.
// Enforces INV-STATE-03 (Isolation), INV-STATE-04 (No secrets), INV-STATE-07 (No risk downgrade),
// INV-STATE-08 (No governance downgrade), INV-STATE-09 (No approval removal),
// and defends against prototype pollution, null bytes, and path injection.
//
// VI:
// Tầng xác thực an ninh và bất biến có thẩm quyền cho phân hệ vòng đời.
// Thực thi INV-STATE-03 (Cô lập), INV-STATE-04 (Không bí mật), INV-STATE-07 (Không hạ cấp rủi ro),
// INV-STATE-08 (Không hạ cấp quản trị), INV-STATE-09 (Không xóa yêu cầu phê duyệt),
// và phòng thủ chống ô nhiễm prototype, null byte và chèn đường dẫn.
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
export function redactLifecycleSecrets(text) {
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
export function containsLifecycleSecret(val) {
    if (typeof val !== 'string')
        return false;
    return SECRET_PATTERNS.some(p => p.test(val));
}
export const containsSecret = containsLifecycleSecret;
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export function hasLifecyclePrototypePollution(target) {
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
        if (v && typeof v === 'object' && hasLifecyclePrototypePollution(v))
            return true;
    }
    return false;
}
export const hasPrototypePollution = hasLifecyclePrototypePollution;
/**
 * EN: Validates user and session scope inputs (INV-STATE-03).
 * VI: Xác thực phạm vi người dùng và phiên (INV-STATE-03).
 */
export function validateScope(userId, sessionId) {
    if (typeof userId !== 'string' || !userId.trim()) {
        return { valid: false, error: 'INVALID_USER_ID: User identifier must be a non-empty string.' };
    }
    const cleanUser = userId.trim().toLowerCase();
    if (DISALLOWED_USERS.has(cleanUser)) {
        return { valid: false, error: `DISALLOWED_USER_SCOPE: Anonymous or invalid user "${userId}" is forbidden.` };
    }
    if (userId.includes('\0')) {
        return { valid: false, error: 'NULL_BYTE_DETECTED: Null byte in userId is strictly rejected.' };
    }
    if (PROTOTYPE_POLLUTION_REGEX.test(userId)) {
        return { valid: false, error: 'PROTOTYPE_POLLUTION_KEY: Forbidden prototype token in userId.' };
    }
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
        return { valid: false, error: 'INVALID_SESSION_ID: Session identifier must be a non-empty string.' };
    }
    if (sessionId.includes('\0')) {
        return { valid: false, error: 'NULL_BYTE_DETECTED: Null byte in sessionId is strictly rejected.' };
    }
    if (PROTOTYPE_POLLUTION_REGEX.test(sessionId)) {
        return { valid: false, error: 'PROTOTYPE_POLLUTION_KEY: Forbidden prototype token in sessionId.' };
    }
    return { valid: true };
}
/**
 * EN: Scans metadata objects for safety, rejecting prototype pollution, null bytes, and secrets.
 * VI: Quét các đối tượng metadata để đảm bảo an toàn, loại bỏ ô nhiễm prototype, null byte và bí mật.
 */
export function validateSafeMetadata(metadata) {
    if (metadata === undefined || metadata === null) {
        return { valid: true };
    }
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        return { valid: false, error: 'INVALID_METADATA: Metadata must be a plain object.' };
    }
    if (hasPrototypePollution(metadata)) {
        return { valid: false, error: 'PROTOTYPE_POLLUTION_DETECTED: Metadata contains forbidden prototype properties.' };
    }
    for (const [k, v] of Object.entries(metadata)) {
        if (k.includes('\0')) {
            return { valid: false, error: `NULL_BYTE_IN_KEY: Key "${k}" contains a null byte.` };
        }
        if (typeof v === 'string') {
            if (v.includes('\0')) {
                return { valid: false, error: `NULL_BYTE_IN_VALUE: Property "${k}" contains a null byte.` };
            }
            if (containsSecret(v)) {
                return { valid: false, error: `SECRET_LEAKAGE_DETECTED: Property "${k}" contains sensitive credentials (INV-STATE-04).` };
            }
            if (k.toLowerCase().includes('path') || k.toLowerCase().includes('file')) {
                if (v.includes('..') || v.includes('/') || v.includes('\\')) {
                    return { valid: false, error: `PATH_TRAVERSAL_IN_METADATA: Key "${k}" contains path traversal tokens.` };
                }
                const base = v.split('.')[0].toUpperCase();
                if (WINDOWS_RESERVED_DEVICE_NAMES.has(base)) {
                    return { valid: false, error: `RESERVED_DEVICE_NAME: Key "${k}" refers to reserved device "${base}".` };
                }
            }
        }
    }
    return { valid: true };
}
/**
 * EN: Validates monotonic risk preservation (INV-STATE-07).
 * VI: Xác thực việc bảo tồn rủi ro đơn điệu (INV-STATE-07).
 */
export function assertRiskPreservation(previousRisk, newRisk) {
    if (!previousRisk || !newRisk)
        return;
    const prevScore = RISK_HIERARCHY[String(previousRisk).toUpperCase()] || 0;
    const newScore = RISK_HIERARCHY[String(newRisk).toUpperCase()] || 0;
    if (prevScore > 0 && newScore > 0 && newScore < prevScore) {
        throw new Error(`RISK_DOWNGRADE_FORBIDDEN: Cannot downgrade risk from "${previousRisk}" to "${newRisk}" (INV-STATE-07).`);
    }
}
/**
 * EN: Validates monotonic governance preservation (INV-STATE-08, INV-STATE-09).
 * VI: Xác thực việc bảo tồn quản trị đơn điệu (INV-STATE-08, INV-STATE-09).
 */
export function assertGovernancePreservation(prevGov, newGov, prevAppr, newAppr) {
    if (prevGov === true && newGov === false) {
        throw new Error('GOVERNANCE_DOWNGRADE_FORBIDDEN: governanceRequired cannot be cleared (INV-STATE-08).');
    }
    if (prevAppr === true && newAppr === false) {
        throw new Error('APPROVAL_REMOVAL_FORBIDDEN: approvalRequired cannot be cleared once demanded (INV-STATE-09).');
    }
}
