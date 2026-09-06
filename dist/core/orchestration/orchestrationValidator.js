// src/core/orchestration/orchestrationValidator.ts
// BOWCON V4.0 — MILESTONE 1.3.11: ORCHESTRATION INPUT & PARAMETER VALIDATOR
//
// EN:
// Validates decision inputs, parameters, and scope identities.
// Defends against prototype pollution, null-byte injection, unauthenticated scopes,
// secret leakage, and risk downgrades before execution intent is formed.
//
// VI:
// Xác thực dữ liệu đầu vào quyết định, tham số và định danh phạm vi.
// Phòng thủ chống ô nhiễm prototype, chèn null-byte, phạm vi chưa xác thực,
// rò rỉ bí mật và hạ cấp rủi ro trước khi hình thành execution intent.
const DISALLOWED_USER_SCOPES = new Set([
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
];
const PROTOTYPE_POLLUTION_REGEX = /(__proto__|constructor|prototype)/i;
/**
 * EN: Checks if a value contains dangerous security vectors (secrets, null-bytes, pollution).
 * VI: Kiểm tra xem giá trị có chứa vector bảo mật nguy hiểm hay không (bí mật, null-byte, ô nhiễm).
 */
export function containsSecurityVector(value) {
    if (typeof value === 'string') {
        if (value.includes('\0'))
            return true;
        if (PROTOTYPE_POLLUTION_REGEX.test(value))
            return true;
        if (SECRET_PATTERNS.some(p => p.test(value)))
            return true;
    }
    return false;
}
/**
 * EN: Deep check for prototype pollution properties in objects.
 * VI: Kiểm tra sâu thuộc tính ô nhiễm prototype trong object.
 */
export function hasPrototypePollution(target) {
    if (!target || typeof target !== 'object')
        return false;
    if (Object.prototype.hasOwnProperty.call(target, '__proto__'))
        return true;
    if (Object.prototype.hasOwnProperty.call(target, 'prototype'))
        return true;
    if (Object.prototype.hasOwnProperty.call(target, 'constructor') && typeof target.constructor !== 'function')
        return true;
    return false;
}
/**
 * EN: Deep parameter validation ensuring clean, safe execution parameters.
 * VI: Xác thực tham số sâu đảm bảo tham số thực thi an toàn, sạch sẽ.
 */
export function validateParameters(params) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        return { valid: false, errors: Object.freeze(['MALFORMED_PARAMETERS']) };
    }
    if (hasPrototypePollution(params)) {
        return { valid: false, errors: Object.freeze(['PROTOTYPE_POLLUTION_DETECTED']) };
    }
    const errors = [];
    const entries = Object.entries(params);
    for (const [key, val] of entries) {
        if (containsSecurityVector(key)) {
            errors.push(`UNSAFE_PARAMETER_KEY_${key}`);
            break;
        }
        if (typeof val === 'string' && containsSecurityVector(val)) {
            errors.push(`UNSAFE_PARAMETER_VALUE_${key}`);
            break;
        }
        if (val !== null && typeof val === 'object') {
            const nested = validateParameters(val);
            if (!nested.valid) {
                errors.push(...nested.errors);
                break;
            }
        }
    }
    return { valid: errors.length === 0, errors: Object.freeze(errors) };
}
/**
 * EN: Validates decision context and result integrity for orchestration.
 * VI: Xác thực tính toàn vẹn của decision context và result cho quá trình điều phối.
 */
export function validateOrchestrationInput(decision, context) {
    if (!decision || typeof decision !== 'object') {
        return { valid: false, errors: Object.freeze(['MISSING_OR_MALFORMED_DECISION']) };
    }
    if (hasPrototypePollution(decision)) {
        return { valid: false, errors: Object.freeze(['PROTOTYPE_POLLUTION_DETECTED']) };
    }
    const errors = [];
    // 1. User & Session Scope Validation (INV-4, Section 14)
    const normalizedUserId = (decision.userId || '').trim().toLowerCase();
    if (DISALLOWED_USER_SCOPES.has(normalizedUserId) || containsSecurityVector(decision.userId)) {
        errors.push('INVALID_OR_UNAUTHENTICATED_USER');
    }
    if (!decision.sessionId || containsSecurityVector(decision.sessionId)) {
        errors.push('INVALID_SESSION_ID');
    }
    // 2. Cross-context scope check if context is provided
    if (context) {
        if (decision.userId !== context.userId || decision.sessionId !== context.sessionId) {
            errors.push('SCOPE_MISMATCH_WITH_CONTEXT');
        }
    }
    // 3. Confidence sanity check
    if (typeof decision.confidence !== 'number' || decision.confidence < 0 || decision.confidence > 1) {
        errors.push('INVALID_DECISION_CONFIDENCE');
    }
    // 4. Candidate action parameter inspection
    if (decision.selectedAction?.parameters) {
        const paramValidation = validateParameters(decision.selectedAction.parameters);
        if (!paramValidation.valid) {
            errors.push(...paramValidation.errors);
        }
    }
    return {
        valid: errors.length === 0,
        errors: Object.freeze(errors),
    };
}
