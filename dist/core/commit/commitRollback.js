// src/core/commit/commitRollback.ts
// BOWCON V4.0 — MILESTONE 1.3.15: ROLLBACK METADATA DESCRIPTOR
//
// EN:
// Constructs deterministic, descriptive rollback metadata.
// Enforces: Rollback metadata cannot directly execute recovery or mutate durable state.
//
// VI:
// Xây dựng metadata rollback tất định mang tính mô tả.
// Thực thi: Metadata rollback không được trực tiếp thực thi phục hồi hoặc đột biến trạng thái bền vững.
import { computeRollbackFingerprint } from './commitFingerprint.js';
import { redactCommitSecrets } from './commitValidator.js';
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
 * EN: Creates an immutable RollbackMetadata descriptor.
 * VI: Tạo một bộ mô tả RollbackMetadata bất biến.
 */
export function createRollbackMetadata(params) {
    const sanitizedReason = redactCommitSecrets(params.reason);
    const fingerprint = computeRollbackFingerprint(params.commitId, params.verificationId, sanitizedReason);
    const metadata = {
        rollbackId: fingerprint,
        commitId: params.commitId,
        verificationId: params.verificationId,
        affectedState: params.affectedState,
        reason: sanitizedReason,
        eligible: params.eligible ?? true,
        status: params.status || 'ROLLBACK_PENDING',
        fingerprint,
        createdAt: params.timestamp || '2026-09-07T00:00:00.000Z',
    };
    return deepFreeze(metadata);
}
