// src/core/transport/transportConnection.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT CONNECTION MODEL
//
// EN:
// Scoped, immutable transport connection lifecycle record and state transition functions.
//
// VI:
// Bản ghi vòng đời kết nối truyền tải bất biến theo phạm vi và các hàm chuyển đổi trạng thái.

import type { TransportConnectionState } from './transportStates.js';
import type { ScopedTransportIdentity, ConnectionIdentityRecord } from './transportIdentity.js';
import { createConnectionIdentity } from './transportIdentity.js';
import { assertValidConnectionTransition } from './transportTransitions.js';
import { deepFreeze, redactTransportSecrets } from './transportValidator.js';

export interface TransportConnectionRecord {
  readonly connectionId: string;
  readonly scopeKey: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly transportId: string;
  readonly state: TransportConnectionState;
  readonly reason?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable TransportConnectionRecord.
 * VI: Khởi tạo một TransportConnectionRecord bất biến.
 */
export function createTransportConnection(
  params: ScopedTransportIdentity,
  initialState: TransportConnectionState = 'DISCONNECTED',
  timestamp = 0,
): Readonly<TransportConnectionRecord> {
  const ident: ConnectionIdentityRecord = createConnectionIdentity(params);

  const record: TransportConnectionRecord = {
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
export function transitionConnection(
  conn: Readonly<TransportConnectionRecord>,
  newState: TransportConnectionState,
  reason?: string,
  timestamp = 0,
): Readonly<TransportConnectionRecord> {
  assertValidConnectionTransition(conn.state, newState);

  const safeReason = reason ? redactTransportSecrets(reason) : undefined;

  const nextRecord: TransportConnectionRecord = {
    ...conn,
    state: newState,
    reason: safeReason,
    updatedAt: timestamp,
  };

  return deepFreeze(nextRecord);
}
