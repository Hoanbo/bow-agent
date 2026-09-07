// src/core/remote/remoteTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.20: SECURE REMOTE GATEWAY TRANSITION MATRICES
//
// EN:
// Authoritative state transition matrices and validator assertions for
// Remote Session, Remote Peer, and Handshake lifecycles. All invalid transitions fail closed.
//
// VI:
// Ma trận chuyển đổi trạng thái có thẩm quyền và các hàm xác nhận cho
// vòng đời Phiên từ xa, Máy khách từ xa và Bắt tay. Mọi chuyển đổi không hợp lệ đều thất bại đóng an toàn.

import type {
  RemoteSessionState,
  RemotePeerState,
  RemoteHandshakeState,
} from './remoteStates.js';

/**
 * EN: Valid state transition map for remote sessions.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho các phiên làm việc từ xa.
 */
export const VALID_REMOTE_SESSION_TRANSITIONS: Readonly<
  Record<RemoteSessionState, ReadonlySet<RemoteSessionState>>
> = Object.freeze({
  CREATED: Object.freeze(new Set<RemoteSessionState>(['NEGOTIATING', 'FAILED', 'REJECTED'])),
  NEGOTIATING: Object.freeze(
    new Set<RemoteSessionState>(['AUTHENTICATING', 'FAILED', 'REJECTED', 'EXPIRED']),
  ),
  AUTHENTICATING: Object.freeze(
    new Set<RemoteSessionState>(['AUTHENTICATED', 'FAILED', 'REJECTED', 'EXPIRED']),
  ),
  AUTHENTICATED: Object.freeze(
    new Set<RemoteSessionState>(['AUTHORIZATION_PENDING', 'AUTHORIZED', 'FAILED', 'REJECTED']),
  ),
  AUTHORIZATION_PENDING: Object.freeze(
    new Set<RemoteSessionState>(['AUTHORIZED', 'REJECTED', 'FAILED']),
  ),
  AUTHORIZED: Object.freeze(
    new Set<RemoteSessionState>(['ESTABLISHED', 'FAILED', 'REJECTED']),
  ),
  ESTABLISHED: Object.freeze(
    new Set<RemoteSessionState>(['ACTIVE', 'IDLE', 'SUSPENDED', 'CLOSING', 'FAILED']),
  ),
  ACTIVE: Object.freeze(
    new Set<RemoteSessionState>(['IDLE', 'SUSPENDED', 'RECONNECTING', 'CLOSING', 'FAILED']),
  ),
  IDLE: Object.freeze(
    new Set<RemoteSessionState>(['ACTIVE', 'SUSPENDED', 'RECONNECTING', 'CLOSING', 'FAILED']),
  ),
  SUSPENDED: Object.freeze(
    new Set<RemoteSessionState>(['ACTIVE', 'RECONNECTING', 'EXPIRED', 'CLOSING', 'FAILED']),
  ),
  RECONNECTING: Object.freeze(
    new Set<RemoteSessionState>(['ACTIVE', 'ESTABLISHED', 'EXPIRED', 'FAILED', 'CLOSED']),
  ),
  CLOSING: Object.freeze(new Set<RemoteSessionState>(['CLOSED', 'FAILED'])),
  EXPIRED: Object.freeze(new Set<RemoteSessionState>([])), // Terminal
  REJECTED: Object.freeze(new Set<RemoteSessionState>([])), // Terminal
  FAILED: Object.freeze(new Set<RemoteSessionState>([])), // Terminal
  CLOSED: Object.freeze(new Set<RemoteSessionState>(['CREATED'])), // Can re-initialize
});

/**
 * EN: Checks if a remote session transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi phiên từ xa có hợp lệ hay không.
 */
export function isValidRemoteTransition(
  from: RemoteSessionState,
  to: RemoteSessionState,
): boolean {
  if (from === to) return true;
  const allowed = VALID_REMOTE_SESSION_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid remote session transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi phiên từ xa hợp lệ hoặc ném lỗi mô tả.
 */
export function assertValidRemoteTransition(
  from: RemoteSessionState,
  to: RemoteSessionState,
): void {
  if (!isValidRemoteTransition(from, to)) {
    throw new Error(
      `[RemoteTransitions] Invalid remote session transition from '${from}' to '${to}'.`,
    );
  }
}

/**
 * EN: Valid state transition map for remote peers.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho máy khách từ xa.
 */
export const VALID_REMOTE_PEER_TRANSITIONS: Readonly<
  Record<RemotePeerState, ReadonlySet<RemotePeerState>>
> = Object.freeze({
  UNREGISTERED: Object.freeze(new Set<RemotePeerState>(['REGISTERED', 'BLOCKED'])),
  REGISTERED: Object.freeze(new Set<RemotePeerState>(['HANDSHAKING', 'DISCONNECTED', 'BLOCKED'])),
  HANDSHAKING: Object.freeze(
    new Set<RemotePeerState>(['AUTHENTICATED', 'DISCONNECTED', 'BLOCKED']),
  ),
  AUTHENTICATED: Object.freeze(
    new Set<RemotePeerState>(['AUTHORIZED', 'DISCONNECTED', 'BLOCKED']),
  ),
  AUTHORIZED: Object.freeze(new Set<RemotePeerState>(['ACTIVE', 'DISCONNECTED', 'BLOCKED'])),
  ACTIVE: Object.freeze(
    new Set<RemotePeerState>(['SUSPENDED', 'DISCONNECTED', 'BLOCKED']),
  ),
  SUSPENDED: Object.freeze(
    new Set<RemotePeerState>(['ACTIVE', 'DISCONNECTED', 'BLOCKED']),
  ),
  DISCONNECTED: Object.freeze(
    new Set<RemotePeerState>(['HANDSHAKING', 'REGISTERED', 'BLOCKED']),
  ),
  BLOCKED: Object.freeze(new Set<RemotePeerState>([])), // Strictly terminal
});

/**
 * EN: Checks if a remote peer transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi máy khách từ xa có hợp lệ hay không.
 */
export function isValidRemotePeerTransition(
  from: RemotePeerState,
  to: RemotePeerState,
): boolean {
  if (from === to) return true;
  const allowed = VALID_REMOTE_PEER_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid remote peer transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi máy khách từ xa hợp lệ hoặc ném lỗi mô tả.
 */
export function assertValidRemotePeerTransition(
  from: RemotePeerState,
  to: RemotePeerState,
): void {
  if (!isValidRemotePeerTransition(from, to)) {
    throw new Error(
      `[RemoteTransitions] Invalid remote peer transition from '${from}' to '${to}'.`,
    );
  }
}

/**
 * EN: Valid state transition map for remote handshakes.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho bắt tay từ xa.
 */
export const VALID_REMOTE_HANDSHAKE_TRANSITIONS: Readonly<
  Record<RemoteHandshakeState, ReadonlySet<RemoteHandshakeState>>
> = Object.freeze({
  INITIATED: Object.freeze(
    new Set<RemoteHandshakeState>(['NEGOTIATING', 'REJECTED', 'FAILED']),
  ),
  NEGOTIATING: Object.freeze(
    new Set<RemoteHandshakeState>(['ACCEPTED', 'REJECTED', 'EXPIRED', 'FAILED']),
  ),
  ACCEPTED: Object.freeze(new Set<RemoteHandshakeState>([])),
  REJECTED: Object.freeze(new Set<RemoteHandshakeState>([])),
  EXPIRED: Object.freeze(new Set<RemoteHandshakeState>([])),
  FAILED: Object.freeze(new Set<RemoteHandshakeState>([])),
});

/**
 * EN: Checks if a remote handshake transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi bắt tay từ xa có hợp lệ hay không.
 */
export function isValidRemoteHandshakeTransition(
  from: RemoteHandshakeState,
  to: RemoteHandshakeState,
): boolean {
  if (from === to) return true;
  const allowed = VALID_REMOTE_HANDSHAKE_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * EN: Asserts valid remote handshake transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi bắt tay từ xa hợp lệ hoặc ném lỗi mô tả.
 */
export function assertValidRemoteHandshakeTransition(
  from: RemoteHandshakeState,
  to: RemoteHandshakeState,
): void {
  if (!isValidRemoteHandshakeTransition(from, to)) {
    throw new Error(
      `[RemoteTransitions] Invalid remote handshake transition from '${from}' to '${to}'.`,
    );
  }
}
