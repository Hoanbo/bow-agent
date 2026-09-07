// src/core/transport/transportConnection.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT CONNECTION MODEL
//
// EN:
// Scoped, immutable transport connection lifecycle record and state transition functions.
//
// VI:
// Bản ghi vòng đời kết nối truyền tải bất biến theo phạm vi và các hàm chuyển đổi trạng thái.
import { createConnectionIdentity } from './transportIdentity.js';
import { assertValidConnectionTransition } from './transportTransitions.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';
/**
 * EN: Creates an immutable TransportConnectionRecord.
 * VI: Khởi tạo một TransportConnectionRecord bất biến.
 */
export function createTransportConnection(params, initialState = 'DISCONNECTED', timestamp = 0) {
    const ident = createConnectionIdentity(params);
    const record = {
        connectionId: ident.connectionId,
        scopeKey: ident.scopeKey,
        userId: ident.userId,
        sessionId: ident.sessionId,
        brainId: ident.brainId,
        surfaceId: ident.surfaceId,
        transportId: ident.transportId,
        state: initialState,
        createdAt: timestamp,
        updatedAt: timestamp,
        fingerprint: ident.fingerprint,
    };
    return deepFreeze(record);
}
/**
 * EN: Transitions connection state following strict transition matrix.
 * VI: Chuyển đổi trạng thái kết nối tuân theo ma trận chuyển đổi nghiêm ngặt.
 */
export function transitionConnection(conn, newState, reason, timestamp = 0) {
    assertValidConnectionTransition(conn.state, newState);
    const safeReason = reason ? redactTransportSecrets(reason) : undefined;
    const nextRecord = {
        ...conn,
        state: newState,
        reason: safeReason,
        updatedAt: timestamp,
    };
    return deepFreeze(nextRecord);
}
