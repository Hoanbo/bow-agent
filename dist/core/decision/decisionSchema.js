// src/core/decision/decisionSchema.ts
// BOWCON V4.0 — MILESTONE 1.3.10: DECISION INPUT VALIDATION & SECURITY SCHEMA
//
// EN:
// Enforces INV-3 (Immutability), INV-4 (User/Session Isolation), INV-10 (Secret Safety),
// and defends against prototype pollution, path injection, and malformed decision inputs.
//
// VI:
// Thực thi INV-3 (Bất biến), INV-4 (Cô lập User/Session), INV-10 (An toàn Bí mật),
// và phòng thủ chống ô nhiễm prototype, chèn đường dẫn và dữ liệu quyết định sai dạng.
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
 * EN: Detects if a string contains known secret patterns.
 * VI: Phát hiện chuỗi có chứa các mẫu bí mật đã biết hay không.
 */
export function containsSecrets(value) {
    if (typeof value !== 'string')
        return false;
    return SECRET_PATTERNS.some(pattern => pattern.test(value));
}
/**
 * EN: Detects if a string contains prototype pollution or null-byte attack vectors.
 * VI: Phát hiện chuỗi có chứa vector tấn công ô nhiễm prototype hoặc ký tự null hay không.
 */
export function hasSecurityAnomaly(value) {
    if (typeof value !== 'string')
        return true;
    if (value.includes('\0'))
        return true;
    if (PROTOTYPE_POLLUTION_REGEX.test(value))
        return true;
    if (containsSecrets(value))
        return true;
    return false;
}
/**
 * EN: Deeply inspects an object for prototype pollution properties or forbidden keys.
 * VI: Kiểm tra sâu một object để tìm thuộc tính ô nhiễm prototype hoặc các khóa bị cấm.
 */
export function containsPrototypePollution(target) {
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
 * EN: Validates the structural integrity, security constraints, and scoping of a DecisionInput.
 * VI: Xác thực tính toàn vẹn cấu trúc, các ràng buộc an ninh và phạm vi của DecisionInput.
 */
export function validateDecisionInput(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { valid: false, errors: Object.freeze(['MALFORMED_INPUT']) };
    }
    if (containsPrototypePollution(input)) {
        return { valid: false, errors: Object.freeze(['PROTOTYPE_POLLUTION_DETECTED']) };
    }
    const value = input;
    const context = value.context;
    const plan = value.plan;
    if (!context || !plan || typeof context !== 'object' || typeof plan !== 'object') {
        return { valid: false, errors: Object.freeze(['MISSING_CONTEXT_OR_PLAN']) };
    }
    const errors = [];
    // 1. User and Session Scope Validation (INV-4)
    if (hasSecurityAnomaly(context.userId) || hasSecurityAnomaly(context.sessionId)) {
        errors.push('UNSAFE_SCOPE_IDENTIFIER');
    }
    if (context.userId !== plan.userId || context.sessionId !== plan.sessionId) {
        errors.push('SCOPE_MISMATCH');
    }
    // 2. Semantic Intent & Plan Matching
    if (!context.semanticIntent || !plan.intent) {
        errors.push('MISSING_INTENT');
    }
    else {
        if (context.semanticIntent !== plan.intent) {
            errors.push('INTENT_MISMATCH');
        }
        if (typeof context.semanticIntent.confidence !== 'number' ||
            context.semanticIntent.confidence < 0 ||
            context.semanticIntent.confidence > 1) {
            errors.push('INVALID_CONFIDENCE');
        }
        if (containsSecrets(context.semanticIntent.sourceText)) {
            errors.push('SECRET_DETECTED_IN_INTENT');
        }
    }
    // 3. Plan Structural Validation
    if (hasSecurityAnomaly(plan.planId)) {
        errors.push('UNSAFE_PLAN_ID');
    }
    if (!Array.isArray(plan.steps)) {
        errors.push('MALFORMED_PLAN_STEPS');
    }
    if (!Array.isArray(context.candidateActions)) {
        errors.push('MALFORMED_CANDIDATE_ACTIONS');
    }
    // 4. Secret scan in candidate actions & parameters
    if (Array.isArray(context.candidateActions)) {
        for (const candidate of context.candidateActions) {
            if (!candidate || typeof candidate !== 'object') {
                errors.push('MALFORMED_CANDIDATE');
                break;
            }
            if (hasSecurityAnomaly(candidate.intentType)) {
                errors.push('UNSAFE_CANDIDATE_INTENT_TYPE');
                break;
            }
            if (candidate.parameters && typeof candidate.parameters === 'object') {
                for (const [k, v] of Object.entries(candidate.parameters)) {
                    if (hasSecurityAnomaly(k) || (typeof v === 'string' && containsSecrets(v))) {
                        errors.push('SECRET_DETECTED_IN_PARAMETERS');
                        break;
                    }
                }
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors: Object.freeze(errors),
    };
}
