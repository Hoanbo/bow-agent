// src/core/network/networkResult.ts
// BOWCON V4.0 — MILESTONE 1.3.21: DEFENSIVE IMMUTABLE NETWORK RESULT FACTORY
//
// EN:
// Authoritative network operation result factory.
// CRITICAL INVARIANTS:
// - DELIVERED ≠ TASK_SUCCESS
// - ACKNOWLEDGED ≠ TASK_SUCCESS
// - HEARTBEAT_ALIVE ≠ TASK_SUCCESS
// - NETWORK_CONNECTED ≠ TASK_EXECUTED
// Network results never indicate task execution or cognitive success.
//
// VI:
// Nhà máy kết quả thao tác mạng bất biến có tính phòng thủ có thẩm quyền.
// CÁC BẢO ĐẢM CỐT TỬ:
// - ĐÃ CHUYỂN PHÁT ≠ TÁC VỤ THÀNH CÔNG
// - ĐÃ ACK ≠ TÁC VỤ THÀNH CÔNG
// - NHỊP TIM CÒN SỐNG ≠ TÁC VỤ THÀNH CÔNG
// - KẾT NỐI MẠNG ≠ TÁC VỤ ĐÃ THỰC THI
// Kết quả mạng không bao giờ chỉ thị việc thực thi tác vụ hay thành công nhận thức.

import type { NetworkOperationResult, NetworkFailureDescriptor } from './networkTypes.js';
import { fnv1aHex } from './networkFingerprint.js';
import { deepFreeze } from './networkValidator.js';

export interface CreateNetworkOperationResultParams {
  readonly success: boolean;
  readonly status: 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'RATE_LIMITED';
  readonly networkConnectionId?: string;
  readonly frameId?: string;
  readonly error?: Readonly<NetworkFailureDescriptor>;
  readonly timestamp?: number;
}

/**
 * EN: Creates an immutable NetworkOperationResult.
 * VI: Khởi tạo một NetworkOperationResult bất biến.
 */
export function createNetworkOperationResult(
  params: CreateNetworkOperationResultParams,
): Readonly<NetworkOperationResult> {
  const ts = params.timestamp ?? 0;
  const fp = fnv1aHex(
    `NET_RES::${params.status}::${params.networkConnectionId ?? 'NONE'}::${params.frameId ?? 'NONE'}::${params.success}::${ts}`,
  );

  const result: NetworkOperationResult = {
    operationId: `nres_${fp}`,
    success: params.success,
    networkConnectionId: params.networkConnectionId,
    frameId: params.frameId,
    status: params.status,
    error: params.error,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(result);
}
