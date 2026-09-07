// src/core/network/networkTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.21: AUTHORITATIVE NETWORK TRANSITIONS
//
// EN:
// Authoritative state transition matrices for network connections, adapters, and heartbeats.
// All invalid transitions fail closed. No implicit transitions or silent state recovery.
//
// VI:
// Ma trận chuyển đổi trạng thái có thẩm quyền cho kết nối mạng, adapter và nhịp tim.
// Mọi chuyển đổi không hợp lệ đều thất bại đóng. Không chuyển đổi ngầm hay phục hồi trạng thái âm thầm.

import type {
  NetworkConnectionState,
  NetworkAdapterState,
  NetworkHeartbeatState,
} from './networkStates.js';

export const VALID_NETWORK_CONNECTION_TRANSITIONS: ReadonlyMap<
  NetworkConnectionState,
  ReadonlySet<NetworkConnectionState>
> = new Map([
  ['CREATED', new Set(['CONNECTING', 'CLOSED', 'FAILED'])],
  ['CONNECTING', new Set(['OPEN', 'CLOSED', 'FAILED'])],
  ['OPEN', new Set(['ACTIVE', 'IDLE', 'DRAINING', 'CLOSING', 'CLOSED', 'RECONNECTING', 'FAILED'])],
  ['ACTIVE', new Set(['IDLE', 'DRAINING', 'CLOSING', 'CLOSED', 'RECONNECTING', 'SUSPENDED', 'FAILED'])],
  ['IDLE', new Set(['ACTIVE', 'DRAINING', 'CLOSING', 'CLOSED', 'RECONNECTING', 'SUSPENDED', 'FAILED'])],
  ['DRAINING', new Set(['CLOSING', 'CLOSED', 'FAILED'])],
  ['CLOSING', new Set(['CLOSED', 'FAILED'])],
  ['RECONNECTING', new Set(['OPEN', 'ACTIVE', 'CLOSED', 'FAILED'])],
  ['SUSPENDED', new Set(['ACTIVE', 'IDLE', 'RECONNECTING', 'CLOSING', 'CLOSED', 'FAILED'])],
  ['CLOSED', new Set()],
  ['FAILED', new Set()],
]);

export const VALID_NETWORK_ADAPTER_TRANSITIONS: ReadonlyMap<
  NetworkAdapterState,
  ReadonlySet<NetworkAdapterState>
> = new Map([
  ['INITIALIZING', new Set(['READY', 'STOPPED', 'FAILED'])],
  ['READY', new Set(['PAUSED', 'STOPPED', 'FAILED'])],
  ['PAUSED', new Set(['READY', 'STOPPED', 'FAILED'])],
  ['STOPPED', new Set()],
  ['FAILED', new Set()],
]);

export const VALID_NETWORK_HEARTBEAT_TRANSITIONS: ReadonlyMap<
  NetworkHeartbeatState,
  ReadonlySet<NetworkHeartbeatState>
> = new Map([
  ['CREATED', new Set(['SENT', 'FAILED'])],
  ['SENT', new Set(['RECEIVED', 'TIMED_OUT', 'FAILED'])],
  ['RECEIVED', new Set(['ACKNOWLEDGED', 'FAILED'])],
  ['ACKNOWLEDGED', new Set()],
  ['TIMED_OUT', new Set()],
  ['FAILED', new Set()],
]);

/**
 * EN: Checks if a network connection state transition is valid.
 * VI: Kiểm tra xem chuyển đổi trạng thái kết nối mạng có hợp lệ hay không.
 */
export function isValidNetworkConnectionTransition(
  from: NetworkConnectionState,
  to: NetworkConnectionState,
): boolean {
  const allowed = VALID_NETWORK_CONNECTION_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid network connection transition or throws fail-closed error.
 * VI: Khẳng định chuyển đổi kết nối mạng hợp lệ hoặc ném lỗi thất bại đóng.
 */
export function assertValidNetworkConnectionTransition(
  from: NetworkConnectionState,
  to: NetworkConnectionState,
): void {
  if (!isValidNetworkConnectionTransition(from, to)) {
    throw new Error(
      `[NETWORK_TRANSITION_VIOLATION] Invalid connection transition from "${from}" to "${to}". State machine fails closed.`,
    );
  }
}

/**
 * EN: Checks if a network adapter state transition is valid.
 * VI: Kiểm tra xem chuyển đổi trạng thái bộ điều hợp mạng có hợp lệ hay không.
 */
export function isValidNetworkAdapterTransition(
  from: NetworkAdapterState,
  to: NetworkAdapterState,
): boolean {
  const allowed = VALID_NETWORK_ADAPTER_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid network adapter transition or throws fail-closed error.
 * VI: Khẳng định chuyển đổi bộ điều hợp mạng hợp lệ hoặc ném lỗi thất bại đóng.
 */
export function assertValidNetworkAdapterTransition(
  from: NetworkAdapterState,
  to: NetworkAdapterState,
): void {
  if (!isValidNetworkAdapterTransition(from, to)) {
    throw new Error(
      `[NETWORK_TRANSITION_VIOLATION] Invalid adapter transition from "${from}" to "${to}". State machine fails closed.`,
    );
  }
}

/**
 * EN: Checks if a heartbeat state transition is valid.
 * VI: Kiểm tra xem chuyển đổi trạng thái nhịp tim có hợp lệ hay không.
 */
export function isValidNetworkHeartbeatTransition(
  from: NetworkHeartbeatState,
  to: NetworkHeartbeatState,
): boolean {
  const allowed = VALID_NETWORK_HEARTBEAT_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid heartbeat transition or throws fail-closed error.
 * VI: Khẳng định chuyển đổi nhịp tim hợp lệ hoặc ném lỗi thất bại đóng.
 */
export function assertValidNetworkHeartbeatTransition(
  from: NetworkHeartbeatState,
  to: NetworkHeartbeatState,
): void {
  if (!isValidNetworkHeartbeatTransition(from, to)) {
    throw new Error(
      `[NETWORK_TRANSITION_VIOLATION] Invalid heartbeat transition from "${from}" to "${to}". State machine fails closed.`,
    );
  }
}
