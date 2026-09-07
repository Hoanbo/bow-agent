// src/core/remote/remoteResult.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE OPERATION RESULT MODEL
//
// EN:
// Authoritative remote operation result models.
// CRITICAL INVARIANT: Remote acceptance or delivery does NOT mean task execution success!
// Task verification belongs exclusively to VerificationService.
//
// VI:
// Mô hình kết quả thao tác từ xa có thẩm quyền.
// BẢO ĐẢM CỐT LÕI: Chấp nhận hay phân phối từ xa KHÔNG PHẢI là thành công thực thi tác vụ!
// Xác minh tác vụ thuộc thẩm quyền độc quyền của VerificationService.
import { fnv1aHex } from './remoteFingerprint.js';
import { deepFreeze, redactRemoteSecrets } from './remoteValidator.js';
/**
 * EN: Creates an immutable RemoteOperationResult.
 * VI: Khởi tạo một RemoteOperationResult bất biến.
 */
export function createRemoteOperationResult(params) {
    const ts = params.timestamp ?? 0;
    const safeMessage = params.message ? redactRemoteSecrets(params.message) : undefined;
    const fp = fnv1aHex(`${params.status}::${params.success}::${params.remoteSessionId ?? ''}::${params.failureCode ?? ''}::${safeMessage ?? ''}`);
    const result = {
        resultId: `rres_${fp}`,
        remoteSessionId: params.remoteSessionId,
        status: params.status,
        success: params.success,
        failureCode: params.failureCode,
        message: safeMessage,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(result);
}
