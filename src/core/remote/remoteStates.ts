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

/**
 * EN: Gateway operational states.
 * VI: Các trạng thái hoạt động của Cổng.
 */
export type RemoteGatewayState = 'INITIALIZING' | 'READY' | 'DEGRADED' | 'CLOSING' | 'CLOSED';

export const ALL_GATEWAY_STATES: ReadonlySet<RemoteGatewayState> = Object.freeze(
  new Set<RemoteGatewayState>(['INITIALIZING', 'READY', 'DEGRADED', 'CLOSING', 'CLOSED']),
);

/**
 * EN: Remote peer connection and registration states.
 * VI: Các trạng thái đăng ký và kết nối máy khách từ xa.
 */
export type RemotePeerState =
  | 'UNREGISTERED'
  | 'REGISTERED'
  | 'HANDSHAKING'
  | 'AUTHENTICATED'
  | 'AUTHORIZED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISCONNECTED'
  | 'BLOCKED';

export const ALL_PEER_STATES: ReadonlySet<RemotePeerState> = Object.freeze(
  new Set<RemotePeerState>([
    'UNREGISTERED',
    'REGISTERED',
    'HANDSHAKING',
    'AUTHENTICATED',
    'AUTHORIZED',
    'ACTIVE',
    'SUSPENDED',
    'DISCONNECTED',
    'BLOCKED',
  ]),
);

/**
 * EN: Handshake negotiation states.
 * VI: Các trạng thái đàm phán bắt tay.
 */
export type RemoteHandshakeState =
  | 'INITIATED'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED';

export const ALL_HANDSHAKE_STATES: ReadonlySet<RemoteHandshakeState> = Object.freeze(
  new Set<RemoteHandshakeState>([
    'INITIATED',
    'NEGOTIATING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'FAILED',
  ]),
);

/**
 * EN: Remote communication session lifecycle states.
 * VI: Các trạng thái vòng đời phiên giao tiếp từ xa.
 */
export type RemoteSessionState =
  | 'CREATED'
  | 'NEGOTIATING'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'AUTHORIZATION_PENDING'
  | 'AUTHORIZED'
  | 'ESTABLISHED'
  | 'ACTIVE'
  | 'IDLE'
  | 'SUSPENDED'
  | 'RECONNECTING'
  | 'EXPIRED'
  | 'REJECTED'
  | 'FAILED'
  | 'CLOSING'
  | 'CLOSED';

export const ALL_SESSION_STATES: ReadonlySet<RemoteSessionState> = Object.freeze(
  new Set<RemoteSessionState>([
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
  ]),
);

/**
 * EN: Remote authentication evaluation states.
 * VI: Các trạng thái đánh giá xác thực từ xa.
 */
export type RemoteAuthenticationState =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'AUTHENTICATION_EXPIRED'
  | 'AUTHENTICATION_INVALID'
  | 'AUTHENTICATION_REJECTED';

export const ALL_AUTH_STATES: ReadonlySet<RemoteAuthenticationState> = Object.freeze(
  new Set<RemoteAuthenticationState>([
    'AUTHENTICATION_REQUIRED',
    'AUTHENTICATING',
    'AUTHENTICATED',
    'AUTHENTICATION_EXPIRED',
    'AUTHENTICATION_INVALID',
    'AUTHENTICATION_REJECTED',
  ]),
);

/**
 * EN: Remote authorization evaluation states.
 * VI: Các trạng thái đánh giá phân quyền từ xa.
 */
export type RemoteAuthorizationState =
  | 'AUTHORIZATION_PENDING'
  | 'AUTHORIZED'
  | 'AUTHORIZATION_DENIED'
  | 'AUTHORIZATION_EXPIRED'
  | 'AUTHORIZATION_REVOKED';

export const ALL_AUTHORIZATION_STATES: ReadonlySet<RemoteAuthorizationState> = Object.freeze(
  new Set<RemoteAuthorizationState>([
    'AUTHORIZATION_PENDING',
    'AUTHORIZED',
    'AUTHORIZATION_DENIED',
    'AUTHORIZATION_EXPIRED',
    'AUTHORIZATION_REVOKED',
  ]),
);

/**
 * EN: Remote rate limiting and quota pressure states.
 * VI: Các trạng thái áp lực hạn mức và giới hạn tốc độ từ xa.
 */
export type RemoteRateLimitState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'SATURATED' | 'BLOCKED';

export const ALL_RATE_LIMIT_STATES: ReadonlySet<RemoteRateLimitState> = Object.freeze(
  new Set<RemoteRateLimitState>(['NORMAL', 'ELEVATED', 'HIGH', 'SATURATED', 'BLOCKED']),
);

/**
 * EN: Checks if a remote session is active and can process messages.
 * VI: Kiểm tra xem phiên làm việc từ xa có đang hoạt động và có thể xử lý thông điệp hay không.
 */
export function isRemoteSessionActive(state: RemoteSessionState): boolean {
  return state === 'ESTABLISHED' || state === 'ACTIVE' || state === 'IDLE';
}

/**
 * EN: Checks if a remote session state is terminal.
 * VI: Kiểm tra xem trạng thái phiên làm việc từ xa có phải là trạng thái kết thúc hay không.
 */
export function isRemoteSessionTerminal(state: RemoteSessionState): boolean {
  return (
    state === 'EXPIRED' ||
    state === 'REJECTED' ||
    state === 'FAILED' ||
    state === 'CLOSED'
  );
}

/**
 * EN: Checks if a peer is in a valid connected state.
 * VI: Kiểm tra xem máy khách có đang ở trạng thái kết nối hợp lệ hay không.
 */
export function isRemotePeerConnected(state: RemotePeerState): boolean {
  return (
    state === 'AUTHENTICATED' ||
    state === 'AUTHORIZED' ||
    state === 'ACTIVE'
  );
}

/**
 * EN: Checks if a handshake state is terminal.
 * VI: Kiểm tra xem trạng thái bắt tay có phải là kết thúc hay không.
 */
export function isRemoteHandshakeTerminal(state: RemoteHandshakeState): boolean {
  return state === 'ACCEPTED' || state === 'REJECTED' || state === 'EXPIRED' || state === 'FAILED';
}
