// src/core/network/networkStates.ts
// BOWCON V4.0 — MILESTONE 1.3.21: AUTHORITATIVE NETWORK STATES
//
// EN:
// Canonical network connection, adapter, heartbeat, and backpressure lifecycle states.
//
// VI:
// Các trạng thái vòng đời kết nối mạng, adapter, nhịp tim và áp lực ngược có thẩm quyền.

/**
 * EN: Authoritative network connection states.
 * VI: Các trạng thái kết nối mạng có thẩm quyền.
 */
export type NetworkConnectionState =
  | 'CREATED'
  | 'CONNECTING'
  | 'OPEN'
  | 'ACTIVE'
  | 'IDLE'
  | 'DRAINING'
  | 'CLOSING'
  | 'CLOSED'
  | 'RECONNECTING'
  | 'SUSPENDED'
  | 'FAILED';

export const ALL_NETWORK_CONNECTION_STATES: ReadonlySet<NetworkConnectionState> = Object.freeze(
  new Set<NetworkConnectionState>([
    'CREATED',
    'CONNECTING',
    'OPEN',
    'ACTIVE',
    'IDLE',
    'DRAINING',
    'CLOSING',
    'CLOSED',
    'RECONNECTING',
    'SUSPENDED',
    'FAILED',
  ]),
);

/**
 * EN: Authoritative network adapter lifecycle states.
 * VI: Các trạng thái vòng đời bộ điều hợp mạng có thẩm quyền.
 */
export type NetworkAdapterState =
  | 'INITIALIZING'
  | 'READY'
  | 'PAUSED'
  | 'STOPPED'
  | 'FAILED';

export const ALL_NETWORK_ADAPTER_STATES: ReadonlySet<NetworkAdapterState> = Object.freeze(
  new Set<NetworkAdapterState>([
    'INITIALIZING',
    'READY',
    'PAUSED',
    'STOPPED',
    'FAILED',
  ]),
);

/**
 * EN: Authoritative heartbeat lifecycle states.
 * VI: Các trạng thái vòng đời nhịp tim mạng có thẩm quyền.
 */
export type NetworkHeartbeatState =
  | 'CREATED'
  | 'SENT'
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'TIMED_OUT'
  | 'FAILED';

export const ALL_NETWORK_HEARTBEAT_STATES: ReadonlySet<NetworkHeartbeatState> = Object.freeze(
  new Set<NetworkHeartbeatState>([
    'CREATED',
    'SENT',
    'RECEIVED',
    'ACKNOWLEDGED',
    'TIMED_OUT',
    'FAILED',
  ]),
);

/**
 * EN: Authoritative network backpressure states.
 * VI: Các trạng thái áp lực ngược mạng có thẩm quyền.
 */
export type NetworkBackpressureState =
  | 'NORMAL'
  | 'ELEVATED'
  | 'HIGH'
  | 'SATURATED'
  | 'BLOCKED';

export const ALL_NETWORK_BACKPRESSURE_STATES: ReadonlySet<NetworkBackpressureState> = Object.freeze(
  new Set<NetworkBackpressureState>([
    'NORMAL',
    'ELEVATED',
    'HIGH',
    'SATURATED',
    'BLOCKED',
  ]),
);

/**
 * EN: Checks if a network connection is in an active/operational state capable of transferring frames.
 * VI: Kiểm tra xem kết nối mạng có ở trạng thái hoạt động có thể truyền frame hay không.
 */
export function isNetworkConnectionActive(state: NetworkConnectionState): boolean {
  return state === 'OPEN' || state === 'ACTIVE' || state === 'IDLE';
}

/**
 * EN: Checks if a network connection is in a terminal state.
 * VI: Kiểm tra xem kết nối mạng có ở trạng thái kết thúc hay không.
 */
export function isNetworkConnectionTerminal(state: NetworkConnectionState): boolean {
  return state === 'CLOSED' || state === 'FAILED';
}

/**
 * EN: Checks if a network adapter is ready to service connections.
 * VI: Kiểm tra xem bộ điều hợp mạng đã sẵn sàng phục vụ kết nối hay chưa.
 */
export function isNetworkAdapterReady(state: NetworkAdapterState): boolean {
  return state === 'READY';
}
