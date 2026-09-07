// src/core/network/networkAudit.ts
// BOWCON V4.0 — MILESTONE 1.3.21: IMMUTABLE NETWORK AUDIT LOGGER
//
// EN:
// Authoritative network audit record model and factory.
// Enforces automatic secret scrubbing: tokens, passwords, and credentials never appear in audits.
//
// VI:
// Mô hình và nhà máy bản ghi kiểm toán mạng có thẩm quyền.
// Thực thi tự động thanh lọc bí mật: token, mật khẩu và thông tin xác thực không bao giờ xuất hiện trong kiểm toán.
import { computeNetworkAuditFingerprint } from './networkFingerprint.js';
import { redactNetworkSecrets, deepFreeze } from './networkValidator.js';
/**
 * EN: Creates an immutable, secret-scrubbed NetworkAuditRecord.
 * VI: Khởi tạo một NetworkAuditRecord bất biến, đã được thanh lọc bí mật.
 */
export function createNetworkAuditRecord(params) {
    const ts = params.timestamp ?? 0;
    const scrubbedDetails = params.details ? redactNetworkSecrets(params.details) : undefined;
    const fp = computeNetworkAuditFingerprint({
        eventType: params.eventType,
        networkConnectionId: params.networkConnectionId,
        sequence: params.sequence,
        outcome: params.outcome,
        timestamp: ts,
    });
    const audit = {
        auditId: `naud_${fp}`,
        eventType: params.eventType,
        networkConnectionId: params.networkConnectionId,
        adapterType: params.adapterType,
        sequence: params.sequence,
        outcome: params.outcome,
        failureCode: params.failureCode,
        details: scrubbedDetails,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(audit);
}
