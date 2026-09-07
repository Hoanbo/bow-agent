// src/core/transport/transportAck.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT ACKNOWLEDGEMENT & NACK MODEL
//
// EN:
// Canonical acknowledgement (ACK) and negative-acknowledgement (NACK) records.
// Explicit ACK classifications: RECEIVED, VALIDATED, PROCESSED, REJECTED.
// Strict architectural boundary: ACK != task success. TASK_SUCCEEDED is forbidden in transport ACK.
//
// VI:
// Các bản ghi xác nhận (ACK) và từ chối xác nhận (NACK) chuẩn mực.
// Phân loại ACK tường minh: RECEIVED, VALIDATED, PROCESSED, REJECTED.
// Ranh giới kiến trúc nghiêm ngặt: ACK KHÔNG PHẢI là thành công tác vụ. Cấm dùng TASK_SUCCEEDED trong ACK.
import { computeAckFingerprint } from './transportFingerprint.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';
export const ALL_ACK_CLASSIFICATIONS = Object.freeze(new Set(['RECEIVED', 'VALIDATED', 'PROCESSED', 'REJECTED']));
/**
 * EN: Creates an immutable TransportAckRecord.
 * VI: Khởi tạo một TransportAckRecord bất biến.
 */
export function createTransportAck(params) {
    if (!ALL_ACK_CLASSIFICATIONS.has(params.classification)) {
        throw new Error(`[TRANSPORT_ACK_ERROR] Invalid ACK classification: "${String(params.classification)}". TASK_SUCCEEDED is strictly forbidden.`);
    }
    const ts = params.timestamp ?? 0;
    const safeDetails = params.details ? redactTransportSecrets(params.details) : undefined;
    const fp = computeAckFingerprint({
        messageId: params.message.messageId,
        connectionId: params.message.connectionId,
        surfaceId: params.message.surfaceId,
        sequence: params.message.sequence,
        correlationId: params.message.correlationId,
        ackType: params.classification,
    });
    const record = {
        ackId: `ack_${fp}`,
        messageId: params.message.messageId,
        connectionId: params.message.connectionId,
        surfaceId: params.message.surfaceId,
        sequence: params.message.sequence,
        correlationId: params.message.correlationId,
        classification: params.classification,
        details: safeDetails,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(record);
}
/**
 * EN: Creates an immutable TransportNackRecord for rejected / failed deliveries.
 * VI: Khởi tạo một TransportNackRecord bất biến cho các phân phối bị từ chối / thất bại.
 */
export function createTransportNack(params) {
    const ts = params.timestamp ?? 0;
    const safeReason = redactTransportSecrets(params.reason);
    const fp = computeAckFingerprint({
        messageId: params.message.messageId,
        connectionId: params.message.connectionId,
        surfaceId: params.message.surfaceId,
        sequence: params.message.sequence,
        correlationId: params.message.correlationId,
        ackType: `NACK_${params.failureCode}`,
    });
    const record = {
        nackId: `nack_${fp}`,
        messageId: params.message.messageId,
        connectionId: params.message.connectionId,
        surfaceId: params.message.surfaceId,
        sequence: params.message.sequence,
        correlationId: params.message.correlationId,
        failureCode: params.failureCode,
        reason: safeReason,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(record);
}
