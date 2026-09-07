// src/core/network/networkTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.21: REAL NETWORK ADAPTER & CONNECTION RUNTIME CONTRACTS
//
// EN:
// Authoritative network taxonomy, contracts, connection models, framing interfaces,
// and network runtime boundaries.
//
// VI:
// Phân loại mạng có thẩm quyền, các hợp đồng, mô hình kết nối, giao diện đóng gói frame,
// và ranh giới runtime mạng.
export const ALL_NETWORK_ADAPTER_TYPES = Object.freeze(new Set(['IN_MEMORY', 'LOCAL', 'LAN', 'REMOTE']));
export const ALL_NETWORK_DIRECTIONS = Object.freeze(new Set(['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL']));
export const ALL_NETWORK_PROTOCOL_MODES = Object.freeze(new Set(['FRAMED_MESSAGE', 'STREAM', 'REQUEST_RESPONSE']));
export const ALL_NETWORK_EVENT_TYPES = Object.freeze(new Set([
    'CONNECTION_REQUESTED',
    'CONNECTION_ACCEPTED',
    'CONNECTION_REJECTED',
    'CONNECTION_OPENED',
    'CONNECTION_CLOSED',
    'CONNECTION_FAILED',
    'FRAME_RECEIVED',
    'FRAME_SENT',
    'MESSAGE_DECODED',
    'MESSAGE_ENCODE_FAILED',
    'HEARTBEAT_SENT',
    'HEARTBEAT_RECEIVED',
    'HEARTBEAT_TIMEOUT',
    'RECONNECT_REQUESTED',
    'RECONNECT_ACCEPTED',
    'RECONNECT_REJECTED',
    'NETWORK_BACKPRESSURE',
    'NETWORK_RECOVERED',
    'NETWORK_ERROR',
]));
