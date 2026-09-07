import type { RemoteSessionState, RemotePeerState, RemoteHandshakeState } from './remoteStates.js';
/**
 * EN: Valid state transition map for remote sessions.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho các phiên làm việc từ xa.
 */
export declare const VALID_REMOTE_SESSION_TRANSITIONS: Readonly<Record<RemoteSessionState, ReadonlySet<RemoteSessionState>>>;
/**
 * EN: Checks if a remote session transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi phiên từ xa có hợp lệ hay không.
 */
export declare function isValidRemoteTransition(from: RemoteSessionState, to: RemoteSessionState): boolean;
/**
 * EN: Asserts valid remote session transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi phiên từ xa hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertValidRemoteTransition(from: RemoteSessionState, to: RemoteSessionState): void;
/**
 * EN: Valid state transition map for remote peers.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho máy khách từ xa.
 */
export declare const VALID_REMOTE_PEER_TRANSITIONS: Readonly<Record<RemotePeerState, ReadonlySet<RemotePeerState>>>;
/**
 * EN: Checks if a remote peer transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi máy khách từ xa có hợp lệ hay không.
 */
export declare function isValidRemotePeerTransition(from: RemotePeerState, to: RemotePeerState): boolean;
/**
 * EN: Asserts valid remote peer transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi máy khách từ xa hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertValidRemotePeerTransition(from: RemotePeerState, to: RemotePeerState): void;
/**
 * EN: Valid state transition map for remote handshakes.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho bắt tay từ xa.
 */
export declare const VALID_REMOTE_HANDSHAKE_TRANSITIONS: Readonly<Record<RemoteHandshakeState, ReadonlySet<RemoteHandshakeState>>>;
/**
 * EN: Checks if a remote handshake transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi bắt tay từ xa có hợp lệ hay không.
 */
export declare function isValidRemoteHandshakeTransition(from: RemoteHandshakeState, to: RemoteHandshakeState): boolean;
/**
 * EN: Asserts valid remote handshake transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi bắt tay từ xa hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertValidRemoteHandshakeTransition(from: RemoteHandshakeState, to: RemoteHandshakeState): void;
