// src/core/synchronization/syncResult.ts
// BOWCON V4.0 — MILESTONE 1.3.18: SYNCHRONIZATION RESULTS & FAILURE FACTORIES
//
// EN:
// Canonical factories for deeply immutable audit records and secret-scrubbed failure descriptors.
//
// VI:
// Nhà máy chuẩn mực cho các bản ghi kiểm toán bất biến sâu và các bộ mô tả lỗi đã lọc sạch bí mật.
import { redactEventSecrets } from './eventValidator.js';
import { fnv1aHex } from './eventFingerprint.js';
import { deepFreeze } from './eventEnvelope.js';
/**
 * EN: Creates an immutable audit record for synchronization events.
 * VI: Tạo một bản ghi kiểm toán bất biến cho các sự kiện đồng bộ hóa.
 */
export function createSyncRecord(params) {
    const ts = params.timestamp ?? 0;
    const canonical = [
        `syncRecord`,
        `brain:${params.brainId}`,
        `user:${params.userId}`,
        `session:${params.sessionId}`,
        `seq:${params.sequence}`,
        `action:${params.action}`,
        `surface:${params.surfaceId ?? 'none'}`,
        `evt:${params.eventId ?? 'none'}`,
    ].join('|');
    const fingerprint = `rec_${fnv1aHex(canonical)}`;
    const syncId = `sync_${fingerprint.replace('rec_', '')}`;
    const record = {
        syncId,
        brainId: params.brainId,
        userId: params.userId,
        sessionId: params.sessionId,
        sequence: params.sequence,
        action: params.action,
        surfaceId: params.surfaceId,
        eventId: params.eventId,
        timestamp: ts,
        fingerprint,
    };
    return deepFreeze(record);
}
/**
 * EN: Creates an immutable, secret-scrubbed synchronization failure descriptor.
 * VI: Tạo một bộ mô tả lỗi đồng bộ hóa bất biến, đã được lọc sạch bí mật.
 */
export function createSyncFailureDescriptor(params) {
    const sanitizedMessage = redactEventSecrets(params.message);
    const ts = params.timestamp ?? 0;
    const canonical = [
        `syncFailure`,
        `code:${params.code}`,
        `brain:${params.brainId}`,
        `user:${params.userId}`,
        `session:${params.sessionId}`,
        `seq:${params.sequence ?? 0}`,
        `msg:${sanitizedMessage}`,
    ].join('|');
    const fingerprint = `fail_${fnv1aHex(canonical)}`;
    const failure = {
        code: params.code,
        message: sanitizedMessage,
        brainId: params.brainId,
        userId: params.userId,
        sessionId: params.sessionId,
        sequence: params.sequence,
        surfaceId: params.surfaceId,
        eventId: params.eventId,
        timestamp: ts,
        fingerprint,
    };
    return deepFreeze(failure);
}
