// src/core/network/networkConnection.ts
// BOWCON V4.0 — MILESTONE 1.3.21: IMMUTABLE NETWORK CONNECTION MODEL
//
// EN:
// Authoritative network connection lifecycle model and state snapshots.
// Tracks 7-tuple scope, sequences, adapter type, health status, and state transitions.
//
// VI:
// Mô hình vòng đời kết nối mạng và snapshot trạng thái có thẩm quyền.
// Theo dõi phạm vi bộ 7, số thứ tự chuỗi, loại adapter, tình trạng sức khỏe và chuyển đổi trạng thái.
import { computeNetworkConnectionFingerprint, fnv1aHex, } from './networkFingerprint.js';
import { validateScopedNetworkIdentity, deepFreeze, } from './networkValidator.js';
import { assertValidNetworkConnectionTransition } from './networkTransitions.js';
/**
 * EN: Creates an immutable NetworkConnectionSnapshot.
 * VI: Khởi tạo một NetworkConnectionSnapshot bất biến.
 */
export function createNetworkConnectionSnapshot(params) {
    const validScope = validateScopedNetworkIdentity(params.scope);
    const fp = computeNetworkConnectionFingerprint({
        scope: validScope,
        adapterType: params.adapterType,
    });
    const connectionId = `net_${fp}`;
    const state = params.initialState ?? 'CREATED';
    const initialSeq = params.initialSequence ?? 0;
    const ts = params.timestamp ?? 0;
    const snapshotFp = fnv1aHex(`${connectionId}::${validScope.scopeKey}::${params.adapterType}::${state}::${initialSeq}`);
    const snapshot = {
        networkConnectionId: connectionId,
        scope: validScope,
        scopeKey: validScope.scopeKey,
        adapterType: params.adapterType,
        state,
        lastSentSequence: initialSeq,
        lastReceivedSequence: initialSeq,
        pendingFrameCount: 0,
        health: 'HEALTHY',
        reconnectCount: 0,
        createdAt: ts,
        updatedAt: ts,
        fingerprint: snapshotFp,
    };
    return deepFreeze(snapshot);
}
/**
 * EN: Transitions a connection snapshot to a new state and updates metrics.
 * VI: Chuyển đổi một snapshot kết nối sang trạng thái mới và cập nhật các chỉ số.
 */
export function updateNetworkConnectionSnapshot(current, updates) {
    const nextState = updates.state ?? current.state;
    if (updates.state && updates.state !== current.state) {
        assertValidNetworkConnectionTransition(current.state, nextState);
    }
    const sentSeq = updates.lastSentSequence ?? current.lastSentSequence;
    const recvSeq = updates.lastReceivedSequence ?? current.lastReceivedSequence;
    const pendingCount = updates.pendingFrameCount ?? current.pendingFrameCount;
    const health = updates.health ?? current.health;
    const reconnectCount = updates.reconnectCount ?? current.reconnectCount;
    const ts = updates.timestamp ?? current.updatedAt;
    const snapshotFp = fnv1aHex(`${current.networkConnectionId}::${current.scopeKey}::${current.adapterType}::${nextState}::${sentSeq}::${recvSeq}::${reconnectCount}`);
    const updated = {
        networkConnectionId: current.networkConnectionId,
        scope: current.scope,
        scopeKey: current.scopeKey,
        adapterType: current.adapterType,
        state: nextState,
        lastSentSequence: sentSeq,
        lastReceivedSequence: recvSeq,
        pendingFrameCount: Math.max(0, pendingCount),
        health,
        reconnectCount,
        createdAt: current.createdAt,
        updatedAt: ts,
        fingerprint: snapshotFp,
    };
    return deepFreeze(updated);
}
