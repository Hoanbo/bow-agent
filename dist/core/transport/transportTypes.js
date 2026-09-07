// src/core/transport/transportTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.19: BRAIN MESSAGE TRANSPORT & REMOTE CONNECTIVITY CONTRACTS
//
// EN:
// Authoritative transport message taxonomy, transport directions, typed failure codes,
// canonical message envelope contract, and transport adapter contracts.
//
// VI:
// Phân loại thông điệp truyền tải có thẩm quyền, hướng truyền tải, mã lỗi định kiểu,
// hợp đồng phong bì thông điệp chuẩn mực, và các hợp đồng adapter truyền tải.
export const ALL_TRANSPORT_MESSAGE_TYPES = Object.freeze(new Set([
    'REQUEST',
    'RESPONSE',
    'EVENT',
    'ACK',
    'NACK',
    'HEARTBEAT',
    'HEARTBEAT_ACK',
    'CONNECT',
    'CONNECT_ACK',
    'DISCONNECT',
    'RECONNECT',
    'RESUME',
    'RESUME_ACK',
    'ERROR',
    'FLOW_CONTROL',
    'DELIVERY_STATUS',
]));
export const ALL_TRANSPORT_DIRECTIONS = Object.freeze(new Set(['BRAIN_TO_SURFACE', 'SURFACE_TO_BRAIN']));
