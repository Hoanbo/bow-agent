// src/core/transport/transportSession.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT SESSION ABSTRACTION
//
// EN:
// Authoritative TransportSession tracking connection lifecycle, sequences,
// pending message metadata, backpressure state, and session health.
// Deeply immutable at public boundaries.
//
// VI:
// Khái niệm TransportSession có thẩm quyền theo dõi vòng đời kết nối, chuỗi số thứ tự,
// metadata thông điệp chờ xử lý, trạng thái áp lực ngược và sức khỏe phiên.
// Bất biến sâu tại ranh giới công khai.
import { computeTransportSessionId } from './transportIdentity.js';
import { computeSessionFingerprint } from './transportFingerprint.js';
import { deepFreeze } from './transportValidator.js';
/**
 * EN: Creates an immutable TransportSessionSnapshot.
 * VI: Khởi tạo một TransportSessionSnapshot bất biến.
 */
export function createTransportSessionSnapshot(params) {
    const initialSeq = params.initialSequence ?? 0;
    const sessionId = computeTransportSessionId(params.connection.connectionId, params.connection.scopeKey, initialSeq);
    const fp = computeSessionFingerprint({
        connectionId: params.connection.connectionId,
        scopeKey: params.connection.scopeKey,
        initialSequence: initialSeq,
    });
    const snapshot = {
        sessionId,
        connectionId: params.connection.connectionId,
        scopeKey: params.connection.scopeKey,
        userId: params.connection.userId,
        brainSessionId: params.connection.sessionId,
        brainId: params.connection.brainId,
        surfaceId: params.connection.surfaceId,
        transportId: params.connection.transportId,
        connectionState: params.connection.state,
        lastAcceptedSequence: initialSeq,
        lastAcknowledgedSequence: initialSeq,
        pendingCount: 0,
        backpressureState: 'NORMAL',
        reconnectCount: 0,
        lastHeartbeatSequence: 0,
        disconnectReason: params.connection.reason,
        fingerprint: fp,
        updatedAt: params.timestamp ?? 0,
    };
    return deepFreeze(snapshot);
}
/**
 * EN: Updates a session snapshot with new sequence, pending count, or health metrics.
 * VI: Cập nhật snapshot phiên với số thứ tự mới, số lượng chờ xử lý hoặc chỉ số sức khỏe.
 */
export function updateTransportSessionSnapshot(current, updates) {
    const next = {
        ...current,
        connectionState: updates.connectionState ?? current.connectionState,
        lastAcceptedSequence: updates.lastAcceptedSequence ?? current.lastAcceptedSequence,
        lastAcknowledgedSequence: updates.lastAcknowledgedSequence ?? current.lastAcknowledgedSequence,
        pendingCount: updates.pendingCount ?? current.pendingCount,
        backpressureState: updates.backpressureState ?? current.backpressureState,
        reconnectCount: updates.reconnectCount ?? current.reconnectCount,
        lastHeartbeatSequence: updates.lastHeartbeatSequence ?? current.lastHeartbeatSequence,
        disconnectReason: updates.disconnectReason ?? current.disconnectReason,
        updatedAt: updates.timestamp ?? current.updatedAt,
    };
    return deepFreeze(next);
}
