// src/core/transport/transportTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT STATE TRANSITION MATRICES
//
// EN:
// Authoritative state transition matrices and validator assertions for
// connection lifecycle and message delivery lifecycle.
//
// VI:
// Ma trận chuyển đổi trạng thái có thẩm quyền và các hàm xác nhận cho
// vòng đời kết nối và vòng đời phân phối thông điệp.

import type { TransportConnectionState, TransportDeliveryState } from './transportStates.js';

/**
 * EN: Valid state transition map for transport connections.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho các kết nối truyền tải.
 */
export const VALID_CONNECTION_TRANSITIONS: Readonly<
  Record<TransportConnectionState, ReadonlySet<TransportConnectionState>>
> = Object.freeze({
  DISCONNECTED: Object.freeze(new Set<TransportConnectionState>(['CONNECTING', 'BLOCKED'])),
  CONNECTING: Object.freeze(new Set<TransportConnectionState>(['CONNECTED', 'FAILED', 'BLOCKED'])),
  CONNECTED: Object.freeze(
    new Set<TransportConnectionState>(['DEGRADED', 'RECONNECTING', 'CLOSING', 'FAILED', 'BLOCKED']),
  ),
  DEGRADED: Object.freeze(
    new Set<TransportConnectionState>(['CONNECTED', 'RECONNECTING', 'CLOSING', 'FAILED', 'BLOCKED']),
  ),
  RECONNECTING: Object.freeze(
    new Set<TransportConnectionState>(['RESUMING', 'FAILED', 'BLOCKED', 'DISCONNECTED']),
  ),
  RESUMING: Object.freeze(new Set<TransportConnectionState>(['CONNECTED', 'FAILED', 'BLOCKED'])),
  CLOSING: Object.freeze(new Set<TransportConnectionState>(['CLOSED', 'FAILED'])),
  CLOSED: Object.freeze(new Set<TransportConnectionState>(['CONNECTING', 'DISCONNECTED'])),
  FAILED: Object.freeze(new Set<TransportConnectionState>(['CONNECTING', 'DISCONNECTED'])),
  BLOCKED: Object.freeze(new Set<TransportConnectionState>([])), // Strictly terminal
});

/**
 * EN: Checks if a connection transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi kết nối có hợp lệ hay không.
 */
export function isValidConnectionTransition(
  from: TransportConnectionState,
  to: TransportConnectionState,
): boolean {
  if (from === to) return true;
  const allowed = VALID_CONNECTION_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid connection transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi kết nối hợp lệ hoặc ném lỗi mô tả.
 */
export function assertValidConnectionTransition(
  from: TransportConnectionState,
  to: TransportConnectionState,
): void {
  if (!isValidConnectionTransition(from, to)) {
    throw new Error(
      `[TransportTransitions] Invalid connection transition from '${from}' to '${to}'.`,
    );
  }
}

/**
 * EN: Valid state transition map for message delivery lifecycle.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho vòng đời phân phối thông điệp.
 */
export const VALID_DELIVERY_TRANSITIONS: Readonly<
  Record<TransportDeliveryState, ReadonlySet<TransportDeliveryState>>
> = Object.freeze({
  CREATED: Object.freeze(
    new Set<TransportDeliveryState>(['VALIDATED', 'REJECTED', 'FAILED']),
  ),
  VALIDATED: Object.freeze(
    new Set<TransportDeliveryState>([
      'QUEUED',
      'DISPATCHABLE',
      'DUPLICATE',
      'CONFLICTED',
      'REJECTED',
      'FAILED',
    ]),
  ),
  QUEUED: Object.freeze(
    new Set<TransportDeliveryState>([
      'DISPATCHABLE',
      'TIMED_OUT',
      'STALE',
      'SUPERSEDED',
      'REJECTED',
      'FAILED',
    ]),
  ),
  DISPATCHABLE: Object.freeze(
    new Set<TransportDeliveryState>([
      'SENT',
      'TIMED_OUT',
      'STALE',
      'SUPERSEDED',
      'REJECTED',
      'FAILED',
    ]),
  ),
  SENT: Object.freeze(
    new Set<TransportDeliveryState>([
      'DELIVERED',
      'ACKNOWLEDGED',
      'TIMED_OUT',
      'STALE',
      'REJECTED',
      'FAILED',
    ]),
  ),
  DELIVERED: Object.freeze(
    new Set<TransportDeliveryState>([
      'ACKNOWLEDGED',
      'TIMED_OUT',
      'REJECTED',
      'FAILED',
    ]),
  ),
  ACKNOWLEDGED: Object.freeze(new Set<TransportDeliveryState>([])),
  REJECTED: Object.freeze(new Set<TransportDeliveryState>([])),
  TIMED_OUT: Object.freeze(new Set<TransportDeliveryState>([])),
  STALE: Object.freeze(new Set<TransportDeliveryState>([])),
  DUPLICATE: Object.freeze(new Set<TransportDeliveryState>([])),
  CONFLICTED: Object.freeze(new Set<TransportDeliveryState>([])),
  FAILED: Object.freeze(new Set<TransportDeliveryState>([])),
  SUPERSEDED: Object.freeze(new Set<TransportDeliveryState>([])),
});

/**
 * EN: Checks if a delivery transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi phân phối có hợp lệ hay không.
 */
export function isValidDeliveryTransition(
  from: TransportDeliveryState,
  to: TransportDeliveryState,
): boolean {
  if (from === to) return true;
  const allowed = VALID_DELIVERY_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid delivery transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi phân phối hợp lệ hoặc ném lỗi mô tả.
 */
export function assertValidDeliveryTransition(
  from: TransportDeliveryState,
  to: TransportDeliveryState,
): void {
  if (!isValidDeliveryTransition(from, to)) {
    throw new Error(
      `[TransportTransitions] Invalid delivery transition from '${from}' to '${to}'.`,
    );
  }
}
