// src/core/synchronization/syncCheckpoint.ts
// BOWCON V4.0 — MILESTONE 1.3.18: SYNCHRONIZATION CHECKPOINT ENGINE
//
// EN:
// Authoritative creation and validation of immutable synchronization checkpoints.
// Captures point-in-time sequence, latest event fingerprints, and surface acknowledgement topology.
//
// VI:
// Khởi tạo và kiểm tra có thẩm quyền các checkpoint đồng bộ hóa bất biến.
// Ghi lại số thứ tự tại thời điểm, fingerprint sự kiện mới nhất và cấu trúc liên kết xác nhận của bề mặt.
import { validateSyncScope, validateEventIdentifier } from './eventValidator.js';
import { computeSyncCheckpointFingerprint } from './eventFingerprint.js';
import { deepFreeze } from './eventEnvelope.js';
/**
 * EN: Creates an immutable synchronization checkpoint.
 * VI: Tạo một checkpoint đồng bộ hóa bất biến.
 */
export function createSyncCheckpoint(params) {
    const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);
    if (typeof params.sequence !== 'number' ||
        isNaN(params.sequence) ||
        !Number.isInteger(params.sequence) ||
        params.sequence < 0) {
        throw new Error(`[SYNCHRONIZATION_CHECKPOINT_ERROR] Invalid checkpoint sequence ${params.sequence}. Must be non-negative integer.`);
    }
    const latestEventId = validateEventIdentifier('latestEventId', params.latestEventId);
    const latestEventFingerprint = validateEventIdentifier('latestEventFingerprint', params.latestEventFingerprint);
    let continuityId;
    if (params.continuityId !== undefined) {
        continuityId = validateEventIdentifier('continuityId', params.continuityId);
    }
    const activeSurfaces = Object.freeze([...params.activeSurfaces].sort());
    const acknowledgedSurfaces = Object.freeze([...params.acknowledgedSurfaces].sort());
    const metadata = params.metadata ? { ...params.metadata } : {};
    const fingerprint = computeSyncCheckpointFingerprint({
        brainId: scope.brainId,
        userId: scope.userId,
        sessionId: scope.sessionId,
        sequence: params.sequence,
        latestEventId,
        latestEventFingerprint,
        activeSurfaces,
        acknowledgedSurfaces,
    });
    const checkpoint = {
        brainId: scope.brainId,
        userId: scope.userId,
        sessionId: scope.sessionId,
        sequence: params.sequence,
        latestEventId,
        latestEventFingerprint,
        continuityId,
        activeSurfaces,
        acknowledgedSurfaces,
        metadata,
        fingerprint,
        timestamp: params.timestamp ?? 0,
    };
    return deepFreeze(checkpoint);
}
