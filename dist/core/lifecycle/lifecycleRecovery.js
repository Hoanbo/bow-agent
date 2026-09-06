// src/core/lifecycle/lifecycleRecovery.ts
// BOWCON V4.0 — MILESTONE 1.3.13: DATA-ONLY RECOVERY DESCRIPTOR
//
// EN:
// Defines recovery metadata without performing active retries (INV-STATE-14).
// Pure data model determining whether a failure may be recovered and at what boundary.
//
// VI:
// Định nghĩa metadata phục hồi mà không tự thực hiện retry (INV-STATE-14).
// Mô hình thuần dữ liệu xác định xem một sự cố có thể được phục hồi hay không và tại ranh giới nào.
import { computeRecoveryFingerprint } from './lifecycleFingerprint.js';
import { redactLifecycleSecrets } from './lifecycleValidator.js';
/**
 * EN: Creates an immutable RecoveryMetadata descriptor.
 * VI: Tạo một bộ mô tả RecoveryMetadata bất biến.
 */
export function createRecoveryMetadata(params) {
    const { userId, sessionId, recoverable, failedState, recoveryState, attemptNumber = 1, maxAttempts = 3, retryReason, previousFingerprint = 'NONE', } = params;
    const retryAllowed = Boolean(recoverable && attemptNumber <= maxAttempts);
    const recoveryFingerprint = computeRecoveryFingerprint(userId, sessionId, failedState, recoveryState, attemptNumber);
    return Object.freeze({
        recoverable: Boolean(recoverable),
        retryAllowed,
        retryReason: retryReason ? redactLifecycleSecrets(retryReason) : undefined,
        failedState,
        recoveryState,
        attemptNumber,
        maxAttempts,
        previousFingerprint,
        recoveryFingerprint,
    });
}
