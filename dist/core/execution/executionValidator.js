// src/core/execution/executionValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.12: EXECUTION SECURITY & PATH VALIDATOR
//
// EN:
// Authoritative security validation layer for tool execution.
// Defends against prototype pollution (INV-13), null-byte injection (INV-14),
// path traversal & reserved Windows devices (INV-15), and secret leakage (INV-12).
//
// VI:
// Tầng xác thực an ninh có thẩm quyền cho việc thực thi tool.
// Phòng thủ chống ô nhiễm prototype (INV-13), chèn null-byte (INV-14),
// duyệt đường dẫn & tên thiết bị Windows dành riêng (INV-15), và rò rỉ bí mật (INV-12).
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
/**
 * EN: Detects if any value contains secret patterns.
 * VI: Phát hiện nếu bất kỳ giá trị nào chứa mẫu bí mật.
 */
export function containsSecret(val) {
    if (typeof val !== 'string')
        return false;
    return SECRET_PATTERNS.some(p => p.test(val));
}
/**
 * EN: Scrubs and redacts secrets from any text (INV-12).
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi văn bản nào (INV-12).
 */
export function redactExecutionSecrets(text) {
    if (typeof text !== 'string')
        return '';
    let sanitized = text;
    for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }
    return sanitized;
}
export const redactSecrets = redactExecutionSecrets;
/**
 * EN: Checks for prototype pollution vectors in an object.
 * VI: Kiểm tra các vector ô nhiễm prototype trong object.
 */
export function hasExecutionPrototypePollution(target) {
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
    return false;
}
/**
 * EN: Validates path safety against traversal, null bytes, and reserved device names (INV-15).
 * VI: Xác thực an toàn đường dẫn chống duyệt cây thư mục, null-byte và tên thiết bị dành riêng (INV-15).
 */
export function isSafePath(pathStr) {
    if (typeof pathStr !== 'string')
        return false;
    if (pathStr.includes('\0'))
        return false;
    if (pathStr.includes('..'))
        return false;
    if (pathStr.includes('/') || pathStr.includes('\\'))
        return false;
    const baseName = pathStr.split('.')[0].toUpperCase();
    if (WINDOWS_RESERVED_DEVICE_NAMES.has(baseName))
        return false;
    return true;
}
/**
 * EN: Deeply validates execution request arguments and structure.
 * VI: Xác thực sâu các tham số và cấu trúc của yêu cầu thực thi.
 */
export function validateExecutionRequest(request, parametersSchema) {
    if (!request || typeof request !== 'object') {
        return { valid: false, errors: Object.freeze(['MALFORMED_EXECUTION_REQUEST']) };
    }
    const errors = [];
    // 1. Tool Name
    const toolName = request.toolName || request.actionName;
    if (!toolName || typeof toolName !== 'string' || toolName.includes('\0') || PROTOTYPE_POLLUTION_REGEX.test(toolName)) {
        errors.push('INVALID_TOOL_NAME: Tool name is missing or contains forbidden characters.');
    }
    // 2. User & Session Scope (INV-5)
    const userId = request.actor?.userId || request.userId;
    const sessionId = request.actor?.sessionId || request.sessionId;
    if (!userId || typeof userId !== 'string' || DISALLOWED_USERS.has(userId.trim().toLowerCase()) || userId.includes('\0') || PROTOTYPE_POLLUTION_REGEX.test(userId)) {
        errors.push('Unauthenticated or invalid user scope');
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.includes('\0') || PROTOTYPE_POLLUTION_REGEX.test(sessionId)) {
        errors.push('INVALID_SESSION_SCOPE');
    }
    const executionScope = request.executionScope;
    if (executionScope && (DISALLOWED_USERS.has(executionScope.toLowerCase()) || executionScope === 'anon' || executionScope === 'anonymous')) {
        errors.push('Unauthenticated or invalid execution scope');
    }
    // 3. Execution Fingerprint Validation
    if (!request.executionFingerprint || typeof request.executionFingerprint !== 'string' || request.executionFingerprint.trim().length === 0) {
        errors.push('Missing or invalid executionFingerprint');
    }
    // 4. Parameter Validation & Deep Prototype Pollution Check
    const args = request.args || request.parameters || {};
    if (typeof args !== 'object' || Array.isArray(args)) {
        errors.push('MALFORMED_ARGUMENTS: Parameters must be an object.');
    }
    else {
        if (hasExecutionPrototypePollution(args)) {
            errors.push('Forbidden parameter key: prototype pollution vector detected');
        }
        // Check parameter keys and values for null bytes, prototype pollution, and secrets
        for (const [key, val] of Object.entries(args)) {
            if (key.includes('\0') || PROTOTYPE_POLLUTION_REGEX.test(key)) {
                errors.push(`Forbidden parameter key: "${key}"`);
            }
            if (typeof val === 'string') {
                if (val.includes('\0')) {
                    errors.push(`Null byte detected in parameter "${key}"`);
                }
                if (containsSecret(val)) {
                    errors.push(`Potential secret or credential pattern detected in parameter "${key}"`);
                }
                if (key.toLowerCase().includes('path') || key.toLowerCase().includes('file')) {
                    if (!isSafePath(val)) {
                        errors.push(`UNSAFE_FILE_PATH_IN_${key}`);
                    }
                }
            }
            else if (val && typeof val === 'object') {
                if (hasExecutionPrototypePollution(val)) {
                    errors.push(`Forbidden parameter key: prototype pollution vector detected in nested object`);
                }
            }
        }
    }
    // 5. Schema-based parameter validation if schema provided
    if (parametersSchema && Array.isArray(parametersSchema)) {
        for (const param of parametersSchema) {
            const val = args[param.name];
            if (param.required && (val === undefined || val === null)) {
                errors.push(`Missing required parameter: ${param.name}`);
                continue;
            }
            if (val !== undefined && val !== null) {
                if (param.type === 'number' && (typeof val !== 'number' || isNaN(val))) {
                    errors.push(`Invalid parameter ${param.name}: expected number, got ${typeof val}`);
                }
                else if (param.type === 'string' && typeof val !== 'string') {
                    errors.push(`Invalid parameter ${param.name}: expected string, got ${typeof val}`);
                }
                else if (param.type === 'boolean' && typeof val !== 'boolean') {
                    errors.push(`Invalid parameter ${param.name}: expected boolean, got ${typeof val}`);
                }
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors: Object.freeze(errors),
    };
}
/**
 * EN: Class wrapper for execution validator.
 * VI: Lớp bọc cho bộ xác thực thực thi.
 */
export class ExecutionValidator {
    validate(request, parametersSchema) {
        return validateExecutionRequest(request, parametersSchema);
    }
}
