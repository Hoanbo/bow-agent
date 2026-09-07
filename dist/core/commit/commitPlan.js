// src/core/commit/commitPlan.ts
// BOWCON V4.0 — MILESTONE 1.3.15: IMMUTABLE COMMIT PLAN BUILDER
//
// EN:
// Builds deterministic, immutable commit execution plans specifying atomic operations, risk, and pre-commit snapshot.
//
// VI:
// Xây dựng kế hoạch thực thi commit tất định, bất biến chỉ rõ các thao tác nguyên tử, mức rủi ro và snapshot trước commit.
import { computeCommitFingerprint } from './commitFingerprint.js';
import { validateCommitScope } from './commitValidator.js';
/**
 * EN: Deeply freezes an object and its properties.
 * VI: Đóng băng sâu một đối tượng và các thuộc tính của nó.
 */
function deepFreeze(obj) {
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
 * EN: Creates an immutable CommitPlan.
 * VI: Tạo một CommitPlan bất biến.
 */
export function createCommitPlan(params) {
    validateCommitScope(params.userId, params.sessionId);
    const opsHash = params.operations
        .map(op => `${op.operationId}:${op.type}:${op.targetDomain}`)
        .join('|');
    const fingerprint = computeCommitFingerprint(params.userId, params.sessionId, params.verificationId, opsHash, params.riskLevel, params.requestId);
    const plan = {
        planId: fingerprint,
        userId: params.userId,
        sessionId: params.sessionId,
        verificationId: params.verificationId,
        operations: Object.freeze(params.operations.map(op => deepFreeze({ ...op }))),
        riskLevel: params.riskLevel,
        governanceRequired: Boolean(params.governanceRequired || params.riskLevel === 'HIGH' || params.riskLevel === 'CRITICAL'),
        approvalRequired: Boolean(params.approvalRequired || params.riskLevel === 'HIGH' || params.riskLevel === 'CRITICAL'),
        preCommitSnapshot: params.preCommitSnapshot,
        fingerprint,
    };
    return deepFreeze(plan);
}
