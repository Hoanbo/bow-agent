// src/core/network/networkStates.ts
// BOWCON V4.0 — MILESTONE 1.3.21: AUTHORITATIVE NETWORK STATES
//
// EN:
// Canonical network connection, adapter, heartbeat, and backpressure lifecycle states.
//
// VI:
// Các trạng thái vòng đời kết nối mạng, adapter, nhịp tim và áp lực ngược có thẩm quyền.
export const ALL_NETWORK_CONNECTION_STATES = Object.freeze(new Set([
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
]));
export const ALL_NETWORK_ADAPTER_STATES = Object.freeze(new Set([
    'INITIALIZING',
    'READY',
    'PAUSED',
    'STOPPED',
    'FAILED',
]));
export const ALL_NETWORK_HEARTBEAT_STATES = Object.freeze(new Set([
    'CREATED',
    'SENT',
    'RECEIVED',
    'ACKNOWLEDGED',
    'TIMED_OUT',
    'FAILED',
]));
export const ALL_NETWORK_BACKPRESSURE_STATES = Object.freeze(new Set([
    'NORMAL',
    'ELEVATED',
    'HIGH',
    'SATURATED',
    'BLOCKED',
]));
/**
 * EN: Checks if a network connection is in an active/operational state capable of transferring frames.
 * VI: Kiểm tra xem kết nối mạng có ở trạng thái hoạt động có thể truyền frame hay không.
 */
export function isNetworkConnectionActive(state) {
    return state === 'OPEN' || state === 'ACTIVE' || state === 'IDLE';
}
/**
 * EN: Checks if a network connection is in a terminal state.
 * VI: Kiểm tra xem kết nối mạng có ở trạng thái kết thúc hay không.
 */
export function isNetworkConnectionTerminal(state) {
    return state === 'CLOSED' || state === 'FAILED';
}
/**
 * EN: Checks if a network adapter is ready to service connections.
 * VI: Kiểm tra xem bộ điều hợp mạng đã sẵn sàng phục vụ kết nối hay chưa.
 */
export function isNetworkAdapterReady(state) {
    return state === 'READY';
}
