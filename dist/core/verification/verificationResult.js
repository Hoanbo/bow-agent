// src/core/verification/verificationResult.ts
// BOWCON V4.0 — MILESTONE 1.3.14: VERIFICATION RESULT BUILDER & IMMUTABILITY
//
// EN:
// Factory module creating deeply immutable, production-safe VerificationResult objects.
// Guarantees zero mutation of verification outcomes, failure descriptors, and postcondition audits.
//
// VI:
// Module nhà máy tạo các đối tượng VerificationResult bất biến sâu, an toàn sản xuất.
// Bảo đảm không đột biến đối với kết quả xác minh, bộ mô tả lỗi và kiểm toán postcondition.
/**
 * EN: Deeply freezes an object and all its nested properties.
 * VI: Đóng băng sâu một đối tượng và toàn bộ các thuộc tính lồng nhau của nó.
 */
export function deepFreeze(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = obj[name];
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}
/**
 * EN: Creates a deeply frozen, authoritative VerificationResult.
 * VI: Tạo một VerificationResult bất biến sâu, có thẩm quyền.
 */
export function createVerificationResult(params) {
    const result = {
        verificationId: params.verificationId,
        userId: params.userId,
        sessionId: params.sessionId,
        toolName: params.toolName,
        actionName: params.actionName,
        status: params.status,
        confidence: params.confidence,
        riskLevel: params.riskLevel,
        executionSucceeded: params.executionSucceeded,
        taskSucceeded: params.taskSucceeded,
        postconditionResults: Object.freeze([...(params.postconditionResults || [])]),
        evidence: Object.freeze([...(params.evidence || [])]),
        summary: Object.freeze({ ...params.summary }),
        failure: params.failure ? Object.freeze({ ...params.failure }) : undefined,
        recommendation: params.recommendation,
        fingerprint: params.fingerprint,
        verifiedAt: params.verifiedAt,
    };
    return deepFreeze(result);
}
