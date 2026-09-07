// src/core/remote/remoteSession.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE SESSION MODEL
//
// EN:
// Authoritative remote session lifecycle model.
// Tracks gateway, peer, 6-tuple scope, protocol version, auth state, granted capabilities,
// monotonic sequences, and health metrics.
// CRITICAL INVARIANT: A remote session is a communication session only;
// it MUST NOT replace or become the authoritative Brain session.
//
// VI:
// Mô hình vòng đời phiên từ xa có thẩm quyền.
// BẢO ĐẢM CỐT LÕI: Phiên từ xa chỉ là phiên giao tiếp; nó KHÔNG THAY THẾ phiên Não bộ.
import { createRemoteSessionIdentity } from './remoteIdentity.js';
import { fnv1aHex } from './remoteFingerprint.js';
import { deepFreeze } from './remoteValidator.js';
/**
 * EN: Creates an immutable RemoteSessionSnapshot.
 * VI: Khởi tạo một RemoteSessionSnapshot bất biến.
 */
export function createRemoteSessionSnapshot(params) {
    const ident = createRemoteSessionIdentity({
        gatewayId: params.gatewayId,
        peerId: params.peerId,
        scope: params.scope,
        initialSequence: params.initialSequence ?? 0,
    });
    const ts = params.timestamp ?? 0;
    const initialSeq = params.initialSequence ?? 0;
    const state = params.initialState ?? 'CREATED';
    const authState = params.authState ?? 'AUTHENTICATED';
    const fp = fnv1aHex(`${ident.remoteSessionId}::${state}::${initialSeq}::${params.capabilities.join(',')}`);
    const snapshot = {
        remoteSessionId: ident.remoteSessionId,
        gatewayId: params.gatewayId,
        peerId: params.peerId,
        scopeKey: ident.scopeKey,
        userId: params.scope.userId,
        brainSessionId: params.scope.sessionId,
        brainId: params.scope.brainId,
        surfaceId: params.scope.surfaceId,
        transportId: params.scope.transportId,
        protocolVersion: params.protocolVersion,
        sessionState: state,
        authState,
        authContext: params.authContext,
        capabilities: Object.freeze([...params.capabilities]),
        lastSequence: initialSeq,
        lastAcknowledgedSequence: initialSeq,
        pendingCount: 0,
        health: 'HEALTHY',
        reconnectCount: 0,
        createdAt: ts,
        updatedAt: ts,
        fingerprint: fp,
    };
    return deepFreeze(snapshot);
}
/**
 * EN: Updates an immutable remote session snapshot with new sequence, state, or metrics.
 * VI: Cập nhật một remote session snapshot bất biến với trạng thái, số thứ tự hoặc chỉ số mới.
 */
export function updateRemoteSessionSnapshot(current, updates) {
    const ts = updates.timestamp ?? current.updatedAt;
    const state = updates.sessionState ?? current.sessionState;
    const seq = updates.lastSequence ?? current.lastSequence;
    const fp = fnv1aHex(`${current.remoteSessionId}::${state}::${seq}::${ts}`);
    const next = {
        ...current,
        sessionState: state,
        authState: updates.authState ?? current.authState,
        authContext: updates.authContext ?? current.authContext,
        lastSequence: seq,
        lastAcknowledgedSequence: updates.lastAcknowledgedSequence ?? current.lastAcknowledgedSequence,
        pendingCount: updates.pendingCount ?? current.pendingCount,
        health: updates.health ?? current.health,
        reconnectCount: updates.reconnectCount ?? current.reconnectCount,
        updatedAt: ts,
        fingerprint: fp,
    };
    return deepFreeze(next);
}
