// src/core/network/networkBackpressure.ts
// BOWCON V4.0 — MILESTONE 1.3.21: NETWORK BACKPRESSURE RUNTIME
//
// EN:
// Authoritative network backpressure and flow control model.
// Classifies queue depth into NORMAL, ELEVATED, HIGH, SATURATED, BLOCKED.
// Propagates backpressure to transport and gateway. Fails closed on saturation;
// zero silent message loss.
//
// VI:
// Mô hình kiểm soát luồng và áp lực ngược (backpressure) mạng có thẩm quyền.
// Phân loại độ sâu hàng đợi thành NORMAL, ELEVATED, HIGH, SATURATED, BLOCKED.
// Lan truyền áp lực ngược tới transport và gateway. Thất bại đóng khi bão hòa;
// không bao giờ âm thầm hủy bỏ thông điệp.

import type { NetworkBackpressureMetrics } from './networkTypes.js';
import type { NetworkBackpressureState } from './networkStates.js';
import { fnv1aHex } from './networkFingerprint.js';
import { deepFreeze } from './networkValidator.js';

export const DEFAULT_MAX_NETWORK_CAPACITY = 1000;

/**
 * EN: Classifies backpressure pressure state given pending frames and capacity limit.
 * VI: Phân loại trạng thái áp lực ngược dựa trên số khung chờ và giới hạn dung lượng.
 */
export function classifyNetworkBackpressure(
  pendingFrames: number,
  maxCapacity: number = DEFAULT_MAX_NETWORK_CAPACITY,
): NetworkBackpressureState {
  if (maxCapacity <= 0 || pendingFrames >= maxCapacity) {
    return 'BLOCKED';
  }
  const ratio = pendingFrames / maxCapacity;
  if (ratio >= 0.9) return 'SATURATED';
  if (ratio >= 0.75) return 'HIGH';
  if (ratio >= 0.5) return 'ELEVATED';
  return 'NORMAL';
}

/**
 * EN: Computes an immutable NetworkBackpressureMetrics snapshot.
 * VI: Tính toán snapshot chỉ số áp lực ngược NetworkBackpressureMetrics bất biến.
 */
export function computeNetworkBackpressure(params: {
  readonly pendingFrames: number;
  readonly maxCapacity?: number;
}): Readonly<NetworkBackpressureMetrics> {
  const max = params.maxCapacity ?? DEFAULT_MAX_NETWORK_CAPACITY;
  const pending = Math.max(0, params.pendingFrames);
  const pressureLevel = classifyNetworkBackpressure(pending, max);
  const remaining = Math.max(0, max - pending);
  const fp = fnv1aHex(`${pending}::${max}::${pressureLevel}`);

  const metrics: NetworkBackpressureMetrics = {
    pendingFrames: pending,
    maxCapacity: max,
    pressureLevel,
    remainingCapacity: remaining,
    fingerprint: fp,
  };

  return deepFreeze(metrics);
}

/**
 * EN: Determines whether the network layer can accept a new frame without dropping.
 * VI: Xác định xem tầng mạng có thể tiếp nhận khung mới mà không bị drop hay không.
 */
export function canAcceptNetworkFrame(metrics: NetworkBackpressureMetrics): boolean {
  return metrics.pressureLevel !== 'BLOCKED' && metrics.pressureLevel !== 'SATURATED';
}
