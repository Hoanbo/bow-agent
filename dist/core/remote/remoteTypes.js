// src/core/remote/remoteTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.20: SECURE REMOTE GATEWAY & PROTOCOL CONTRACTS
//
// EN:
// Authoritative remote gateway taxonomy, contracts, capability models,
// protocol message envelopes, and gateway interfaces.
//
// VI:
// Phân loại cổng từ xa có thẩm quyền, các hợp đồng, mô hình quyền năng (capability),
// phong bì thông điệp giao thức và các giao diện gateway.
export const CURRENT_REMOTE_PROTOCOL_VERSION = '1.0.0';
export const SUPPORTED_REMOTE_PROTOCOL_VERSIONS = Object.freeze(new Set(['1.0.0']));
export const ALL_ALLOWED_CAPABILITIES = Object.freeze(new Set([
    'RECEIVE_EVENTS',
    'SEND_ACK',
    'SEND_NACK',
    'REQUEST_CONTINUITY',
    'REQUEST_RECONNECT',
    'OBSERVE_STATUS',
    'REQUEST_PROTOCOL_INFO',
]));
export const ALL_FORBIDDEN_CAPABILITIES = Object.freeze(new Set([
    'EXECUTE_TOOL',
    'MUTATE_BRAIN',
    'BYPASS_PDP',
    'BYPASS_APPROVAL',
    'MUTATE_COMMIT',
    'FORCE_RECOVERY',
    'CHANGE_GOVERNANCE',
]));
