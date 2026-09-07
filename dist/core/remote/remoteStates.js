// src/core/remote/remoteStates.ts
// BOWCON V4.0 — MILESTONE 1.3.20: SECURE REMOTE GATEWAY STATE TAXONOMY
//
// EN:
// Authoritative lifecycle state sets and predicates for Gateway, Peer,
// Handshake, Remote Session, Authentication, Authorization, and Rate Limiting.
//
// VI:
// Các tập hợp trạng thái vòng đời có thẩm quyền và các vị từ cho Cổng, Máy khách,
// Bắt tay, Phiên từ xa, Xác thực, Phân quyền và Giới hạn lưu lượng.
export const ALL_GATEWAY_STATES = Object.freeze(new Set(['INITIALIZING', 'READY', 'DEGRADED', 'CLOSING', 'CLOSED']));
export const ALL_PEER_STATES = Object.freeze(new Set([
    'UNREGISTERED',
    'REGISTERED',
    'HANDSHAKING',
    'AUTHENTICATED',
    'AUTHORIZED',
    'ACTIVE',
    'SUSPENDED',
    'DISCONNECTED',
    'BLOCKED',
]));
export const ALL_HANDSHAKE_STATES = Object.freeze(new Set([
    'INITIATED',
    'NEGOTIATING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'FAILED',
]));
export const ALL_SESSION_STATES = Object.freeze(new Set([
    'CREATED',
    'NEGOTIATING',
    'AUTHENTICATING',
    'AUTHENTICATED',
    'AUTHORIZATION_PENDING',
    'AUTHORIZED',
    'ESTABLISHED',
    'ACTIVE',
    'IDLE',
    'SUSPENDED',
    'RECONNECTING',
    'EXPIRED',
    'REJECTED',
    'FAILED',
    'CLOSING',
    'CLOSED',
]));
export const ALL_AUTH_STATES = Object.freeze(new Set([
    'AUTHENTICATION_REQUIRED',
    'AUTHENTICATING',
    'AUTHENTICATED',
    'AUTHENTICATION_EXPIRED',
    'AUTHENTICATION_INVALID',
    'AUTHENTICATION_REJECTED',
]));
export const ALL_AUTHORIZATION_STATES = Object.freeze(new Set([
    'AUTHORIZATION_PENDING',
    'AUTHORIZED',
    'AUTHORIZATION_DENIED',
    'AUTHORIZATION_EXPIRED',
    'AUTHORIZATION_REVOKED',
]));
export const ALL_RATE_LIMIT_STATES = Object.freeze(new Set(['NORMAL', 'ELEVATED', 'HIGH', 'SATURATED', 'BLOCKED']));
/**
 * EN: Checks if a remote session is active and can process messages.
 * VI: Kiểm tra xem phiên làm việc từ xa có đang hoạt động và có thể xử lý thông điệp hay không.
 */
export function isRemoteSessionActive(state) {
    return state === 'ESTABLISHED' || state === 'ACTIVE' || state === 'IDLE';
}
/**
 * EN: Checks if a remote session state is terminal.
 * VI: Kiểm tra xem trạng thái phiên làm việc từ xa có phải là trạng thái kết thúc hay không.
 */
export function isRemoteSessionTerminal(state) {
    return (state === 'EXPIRED' ||
        state === 'REJECTED' ||
        state === 'FAILED' ||
        state === 'CLOSED');
}
/**
 * EN: Checks if a peer is in a valid connected state.
 * VI: Kiểm tra xem máy khách có đang ở trạng thái kết nối hợp lệ hay không.
 */
export function isRemotePeerConnected(state) {
    return (state === 'AUTHENTICATED' ||
        state === 'AUTHORIZED' ||
        state === 'ACTIVE');
}
/**
 * EN: Checks if a handshake state is terminal.
 * VI: Kiểm tra xem trạng thái bắt tay có phải là kết thúc hay không.
 */
export function isRemoteHandshakeTerminal(state) {
    return state === 'ACCEPTED' || state === 'REJECTED' || state === 'EXPIRED' || state === 'FAILED';
}
