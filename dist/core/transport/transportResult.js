// src/core/transport/transportResult.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT AUDIT RECORD & RESULT MODEL
//
// EN:
// Authoritative transport audit records for tracing message movement, connections,
// acknowledgements, and failure events across boundaries without leaking secrets.
//
// VI:
// Bản ghi kiểm tra truyền tải có thẩm quyền để theo dõi chuyển động thông điệp, kết nối,
// xác nhận và các sự kiện thất bại qua các ranh giới mà không làm rò rỉ bí mật.
import { fnv1aHex } from './transportFingerprint.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';
/**
 * EN: Creates an immutable, secret-scrubbed TransportAuditRecord.
 * VI: Khởi tạo một TransportAuditRecord bất biến và đã được lọc sạch bí mật.
 */
export function createTransportAuditRecord(params) {
    const ts = params.timestamp ?? 0;
    const safeDetails = params.details ? redactTransportSecrets(params.details) : undefined;
    const fp = fnv1aHex(`${params.connectionId}::${params.action}::${params.outcome}::${params.messageId ?? ''}::${safeDetails ?? ''}`);
    const record = {
        auditId: `taudit_${fp}`,
        connectionId: params.connectionId,
        messageId: params.messageId,
        action: params.action,
        outcome: params.outcome,
        details: safeDetails,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(record);
}
