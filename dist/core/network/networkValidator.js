// src/core/network/networkValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.21: NETWORK SECURITY & BOUNDS VALIDATOR
//
// EN:
// Authoritative security and scope validation for the network layer.
// Enforces 7-tuple multi-tenant isolation, defends against prototype pollution,
// null bytes, path traversal, Windows reserved device names, oversized payloads,
// and secret leakage.
//
// VI:
// Trình xác thực bảo mật và phạm vi có thẩm quyền cho tầng mạng.
// Thực thi cô lập đa người thuê bộ 7, phòng thủ tấn công prototype pollution,
// ký tự null, duyệt đường dẫn, tên thiết bị Windows đặc biệt, tải dữ liệu quá khổ,
// và rò rỉ bí mật.
import { computeNetworkScopeKey } from './networkFingerprint.js';
export const MAX_NETWORK_IDENTIFIER_LENGTH = 128;
export const MAX_NETWORK_PAYLOAD_SIZE_BYTES = 64 * 1024; // 64 KB
export const MAX_NETWORK_NESTING_DEPTH = 8;
export const WINDOWS_RESERVED_DEVICE_NAMES = Object.freeze(new Set([
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
]));
export const PROTOTYPE_POLLUTION_KEYS = Object.freeze(new Set(['__proto__', 'constructor', 'prototype']));
const SECRET_PATTERNS = [
    /bearer\s+[a-z0-9_.-]+/gi,
    /auth(?:_token)?=["']?[a-z0-9_.-]+["']?/gi,
    /password=["']?[^\s"']+["']?/gi,
    /client_secret=["']?[^\s"']+["']?/gi,
    /api[_-]?key=["']?[a-z0-9_.-]+["']?/gi,
    /private[_-]?key=["']?[^\s"']+["']?/gi,
    /token=[a-z0-9_.-]+/gi,
];
/**
 * EN: Validates an identifier string against length, null bytes, prototype keys,
 * path traversal, and Windows reserved device names.
 *
 * VI: Xác thực chuỗi định danh chống lại độ dài quá mức, ký tự null, khóa prototype,
 * duyệt đường dẫn và tên thiết bị dành riêng của Windows.
 */
export function validateNetworkIdentifier(name, value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Identifier "${name}" must be a non-empty string.`);
    }
    if (value.length > MAX_NETWORK_IDENTIFIER_LENGTH) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Identifier "${name}" exceeds max length of ${MAX_NETWORK_IDENTIFIER_LENGTH} characters.`);
    }
    if (value.includes('\0')) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Identifier "${name}" contains forbidden null byte.`);
    }
    if (PROTOTYPE_POLLUTION_KEYS.has(value.toLowerCase())) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Identifier "${name}" attempts prototype pollution ("${value}").`);
    }
    if (value.includes('..') || value.includes('/') || value.includes('\\')) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Identifier "${name}" contains path traversal elements.`);
    }
    const upper = value.toUpperCase();
    if (WINDOWS_RESERVED_DEVICE_NAMES.has(upper)) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Identifier "${name}" matches Windows reserved device name "${value}".`);
    }
    return value;
}
/**
 * EN: Validates and freezes 7-tuple ScopedNetworkIdentity.
 * VI: Xác thực và đóng băng ScopedNetworkIdentity bộ 7.
 */
export function validateScopedNetworkIdentity(scope) {
    if (!scope || typeof scope !== 'object') {
        throw new Error('[NETWORK_SECURITY_ERROR] ScopedNetworkIdentity must be a defined object.');
    }
    const userId = validateNetworkIdentifier('userId', scope.userId);
    const sessionId = validateNetworkIdentifier('sessionId', scope.sessionId);
    const brainId = validateNetworkIdentifier('brainId', scope.brainId);
    const surfaceId = validateNetworkIdentifier('surfaceId', scope.surfaceId);
    const transportId = validateNetworkIdentifier('transportId', scope.transportId);
    const gatewayId = validateNetworkIdentifier('gatewayId', scope.gatewayId);
    const networkAdapterId = validateNetworkIdentifier('networkAdapterId', scope.networkAdapterId);
    const cleanScope = {
        userId,
        sessionId,
        brainId,
        surfaceId,
        transportId,
        gatewayId,
        networkAdapterId,
    };
    const scopeKey = computeNetworkScopeKey(cleanScope);
    return deepFreeze({
        ...cleanScope,
        scopeKey,
    });
}
/**
 * EN: Validates payload resource boundaries (max size and nesting depth).
 * VI: Xác thực giới hạn tài nguyên của payload (kích thước tối đa và độ sâu lồng nhau).
 */
export function validateNetworkPayloadBounds(payload, currentDepth = 0) {
    if (currentDepth > MAX_NETWORK_NESTING_DEPTH) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Payload nesting depth exceeds maximum of ${MAX_NETWORK_NESTING_DEPTH} levels.`);
    }
    if (payload === null || typeof payload !== 'object') {
        return;
    }
    // Size boundary check via serialized length estimation
    const serialized = JSON.stringify(payload);
    if (serialized && serialized.length > MAX_NETWORK_PAYLOAD_SIZE_BYTES) {
        throw new Error(`[NETWORK_SECURITY_ERROR] Payload size (${serialized.length} bytes) exceeds limit of ${MAX_NETWORK_PAYLOAD_SIZE_BYTES} bytes.`);
    }
    for (const key of Object.keys(payload)) {
        if (PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())) {
            throw new Error(`[NETWORK_SECURITY_ERROR] Payload key "${key}" violates prototype pollution boundary.`);
        }
        const val = payload[key];
        if (typeof val === 'object' && val !== null) {
            validateNetworkPayloadBounds(val, currentDepth + 1);
        }
    }
}
/**
 * EN: Redacts sensitive secrets, credentials, and tokens from strings.
 * VI: Khử các bí mật nhạy cảm, thông tin xác thực và token khỏi chuỗi.
 */
export function redactNetworkSecrets(text) {
    if (!text || typeof text !== 'string')
        return text;
    let result = text;
    for (const pattern of SECRET_PATTERNS) {
        result = result.replace(pattern, '[REDACTED_SECRET]');
    }
    return result;
}
/**
 * EN: Recursively freezes an object and all nested properties.
 * VI: Đóng băng đệ quy một đối tượng và toàn bộ thuộc tính lồng nhau.
 */
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
        const val = obj[key];
        if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
            deepFreeze(val);
        }
    }
    return obj;
}
