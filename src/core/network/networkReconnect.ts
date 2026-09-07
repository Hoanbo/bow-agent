// src/core/network/networkReconnect.ts
// BOWCON V4.0 — MILESTONE 1.3.21: NETWORK RECONNECT RUNTIME
//
// EN:
// Authoritative network reconnection and session resume model.
// CRITICAL INVARIANT: RECONNECT ≠ NEW_BRAIN.
// Reconnection preserves Brain identity, 7-tuple scope, sequences, and bindings.
// It strictly forbids resetting sequence to zero, spawning secondary brains,
// auto-executing interrupted actions, or bypassing RecoveryService.
//
// VI:
// Mô hình kết nối lại mạng và tiếp tục phiên có thẩm quyền.
// BẢO ĐẢM CỐT TỬ: RECONNECT ≠ NEW_BRAIN.
// Kết nối lại bảo toàn định danh Não bộ, phạm vi bộ 7, số chuỗi và các ràng buộc.
// Tuyệt đối cấm đặt lại chuỗi về 0, sinh não bộ thứ cấp, tự ý chạy lại thao tác gián đoạn,
// hoặc bỏ qua RecoveryService.

import type { NetworkConnectionSnapshot } from './networkConnection.js';
import type { ScopedNetworkIdentity } from './networkTypes.js';
import { fnv1aHex } from './networkFingerprint.js';
import {
  validateScopedNetworkIdentity,
  deepFreeze,
} from './networkValidator.js';
import { updateNetworkConnectionSnapshot } from './networkConnection.js';

export interface NetworkReconnectRequest {
  readonly reconnectId: string;
  readonly previousConnectionId: string;
  readonly scope: ScopedNetworkIdentity;
  readonly lastAcknowledgedSequence: number;
  readonly timestamp: number;
  readonly fingerprint: string;
}

export interface NetworkReconnectResult {
  readonly success: boolean;
  readonly connection?: Readonly<NetworkConnectionSnapshot>;
  readonly resumedSequence: number;
  readonly status: 'RECONNECTED' | 'RECONNECT_REJECTED';
  readonly reason?: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Creates an immutable reconnection request.
 * VI: Khởi tạo một yêu cầu kết nối lại bất biến.
 */
export function createNetworkReconnectRequest(params: {
  readonly previousConnectionId: string;
  readonly scope: ScopedNetworkIdentity;
  readonly lastAcknowledgedSequence: number;
  readonly timestamp?: number;
}): Readonly<NetworkReconnectRequest> {
  const validScope = validateScopedNetworkIdentity(params.scope);
  const ts = params.timestamp ?? 0;
  const fp = fnv1aHex(
    `NET_RECONNECT_REQ::${params.previousConnectionId}::${validScope.scopeKey}::${params.lastAcknowledgedSequence}::${ts}`,
  );

  const req: NetworkReconnectRequest = {
    reconnectId: `rec_${fp}`,
    previousConnectionId: params.previousConnectionId,
    scope: validScope,
    lastAcknowledgedSequence: params.lastAcknowledgedSequence,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(req);
}

/**
 * EN: Evaluates a reconnect request against previous connection snapshot.
 * Reconnect cannot reset sequence to 0 or mutate scope boundaries.
 *
 * VI: Đánh giá yêu cầu kết nối lại so với snapshot kết nối trước đó.
 * Kết nối lại không thể đặt lại chuỗi về 0 hoặc biến đổi ranh giới phạm vi.
 */
export function evaluateNetworkReconnect(
  previous: Readonly<NetworkConnectionSnapshot>,
  request: Readonly<NetworkReconnectRequest>,
): Readonly<NetworkReconnectResult> {
  // 1. Connection ID validation
  if (previous.networkConnectionId !== request.previousConnectionId) {
    const reason = `Connection ID mismatch: previous "${previous.networkConnectionId}" != requested "${request.previousConnectionId}".`;
    return deepFreeze({
      success: false,
      resumedSequence: previous.lastSentSequence,
      status: 'RECONNECT_REJECTED',
      reason,
      timestamp: request.timestamp,
      fingerprint: fnv1aHex(`RECONNECT_REJECTED::${reason}`),
    });
  }

  // 2. 7-tuple Scope boundary match
  const requestedScopeKey = `${request.scope.userId}::${request.scope.sessionId}::${request.scope.brainId}::${request.scope.surfaceId}::${request.scope.transportId}::${request.scope.gatewayId}::${request.scope.networkAdapterId}`;
  if (previous.scopeKey !== requestedScopeKey) {
    const reason = `Scope key mismatch during reconnect: previous "${previous.scopeKey}" != requested "${requestedScopeKey}".`;
    return deepFreeze({
      success: false,
      resumedSequence: previous.lastSentSequence,
      status: 'RECONNECT_REJECTED',
      reason,
      timestamp: request.timestamp,
      fingerprint: fnv1aHex(`RECONNECT_REJECTED::${reason}`),
    });
  }

  // 3. Sequence rollback check: incoming ACK cannot exceed lastSentSequence
  if (request.lastAcknowledgedSequence > previous.lastSentSequence) {
    const reason = `Invalid sequence progression during reconnect: ack sequence ${request.lastAcknowledgedSequence} > last sent ${previous.lastSentSequence}.`;
    return deepFreeze({
      success: false,
      resumedSequence: previous.lastSentSequence,
      status: 'RECONNECT_REJECTED',
      reason,
      timestamp: request.timestamp,
      fingerprint: fnv1aHex(`RECONNECT_REJECTED::${reason}`),
    });
  }

  // 4. Update snapshot to ACTIVE, preserving sequence and incrementing reconnectCount
  const updatedSnapshot = updateNetworkConnectionSnapshot(previous, {
    state: 'ACTIVE',
    reconnectCount: previous.reconnectCount + 1,
    timestamp: request.timestamp,
  });

  return deepFreeze({
    success: true,
    connection: updatedSnapshot,
    resumedSequence: previous.lastSentSequence,
    status: 'RECONNECTED',
    timestamp: request.timestamp,
    fingerprint: fnv1aHex(`RECONNECTED::${updatedSnapshot.networkConnectionId}::${previous.lastSentSequence}`),
  });
}
