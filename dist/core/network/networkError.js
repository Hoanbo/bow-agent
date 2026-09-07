// src/core/network/networkError.ts
// BOWCON V4.0 — MILESTONE 1.3.21: TYPED NETWORK FAILURE FACTORY
//
// EN:
// Authoritative typed network failure factory.
// Enforces automatic secret scrubbing across all error messages, details, and fingerprints.
//
// VI:
// Nhà máy sinh lỗi mạng định kiểu có thẩm quyền.
// Thực thi tự động thanh lọc bí mật trên toàn bộ thông điệp lỗi, chi tiết và chữ ký băm.
import { computeNetworkFailureFingerprint } from './networkFingerprint.js';
import { redactNetworkSecrets, deepFreeze } from './networkValidator.js';
/**
 * EN: Creates an immutable, secret-scrubbed NetworkFailureDescriptor.
 * VI: Khởi tạo một NetworkFailureDescriptor bất biến, đã được thanh lọc bí mật.
 */
export function createNetworkFailureDescriptor(params) {
    const scrubbedMessage = redactNetworkSecrets(params.message);
    const scrubbedDetails = params.details ? redactNetworkSecrets(params.details) : undefined;
    const ts = params.timestamp ?? 0;
    const fp = computeNetworkFailureFingerprint({
        code: params.code,
        message: scrubbedMessage,
        networkConnectionId: params.networkConnectionId,
        timestamp: ts,
    });
    const failure = {
        failureId: `fail_${fp}`,
        code: params.code,
        message: scrubbedMessage,
        networkConnectionId: params.networkConnectionId,
        frameId: params.frameId,
        sequence: params.sequence,
        details: scrubbedDetails,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(failure);
}
