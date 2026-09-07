// src/core/remote/remoteAudit.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE AUDIT RECORD FACTORY
//
// EN:
// Authoritative remote audit records for tracing protocol operations, handshakes,
// sessions, and peer connections without credential leakage.
//
// VI:
// Bản ghi kiểm tra từ xa có thẩm quyền để theo dõi các thao tác giao thức, bắt tay,
// phiên và kết nối máy khách mà không làm rò rỉ thông tin xác thực.
import { computeRemoteAuditFingerprint } from './remoteFingerprint.js';
import { deepFreeze, redactRemoteSecrets } from './remoteValidator.js';
/**
 * EN: Creates an immutable, secret-scrubbed RemoteAuditRecord.
 * VI: Khởi tạo một RemoteAuditRecord bất biến và đã được lọc sạch bí mật.
 */
export function createRemoteAuditRecord(params) {
    const ts = params.timestamp ?? 0;
    const safeDetails = params.details ? redactRemoteSecrets(params.details) : undefined;
    const fp = computeRemoteAuditFingerprint({
        eventType: params.eventType,
        gatewayId: params.gatewayId,
        peerId: params.peerId,
        remoteSessionId: params.remoteSessionId,
        outcome: params.outcome,
        details: safeDetails,
    });
    const record = {
        auditId: `raudit_${fp}`,
        eventType: params.eventType,
        gatewayId: params.gatewayId,
        peerId: params.peerId,
        remoteSessionId: params.remoteSessionId,
        outcome: params.outcome,
        details: safeDetails,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(record);
}
