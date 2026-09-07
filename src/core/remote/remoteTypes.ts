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

import type { PlanRiskLevel } from '../planning/planningTypes.js';

export type { PlanRiskLevel };

/**
 * EN: Authoritative remote gateway identity record.
 * VI: Bản ghi định danh cổng từ xa có thẩm quyền.
 */
export interface RemoteGatewayIdentity {
  readonly gatewayId: string;
  readonly name: string;
  readonly version: string;
  readonly supportedProtocols: readonly string[];
  readonly fingerprint: string;
}

/**
 * EN: Remote peer identity representing an external presentation/embodiment surface client.
 * VI: Định danh máy khách từ xa đại diện cho một bề mặt hiện diện/thể hiện bên ngoài.
 */
export interface RemotePeerIdentity {
  readonly peerId: string;
  readonly surfaceId: string;
  readonly surfaceType: 'MOBILE' | 'ROBOT' | 'DESKTOP' | 'WEB' | 'VOICE' | 'GENERIC';
  readonly clientVersion: string;
  readonly fingerprint: string;
}

/**
 * EN: Supported remote protocol version string.
 * VI: Chuỗi phiên bản giao thức từ xa được hỗ trợ.
 */
export type RemoteProtocolVersion = '1.0.0';

export const CURRENT_REMOTE_PROTOCOL_VERSION: RemoteProtocolVersion = '1.0.0';
export const SUPPORTED_REMOTE_PROTOCOL_VERSIONS: ReadonlySet<string> = Object.freeze(
  new Set<string>(['1.0.0']),
);

/**
 * EN: Authoritative remote peer capabilities.
 * VI: Các quyền năng máy khách từ xa có thẩm quyền.
 */
export type AllowedRemoteCapability =
  | 'RECEIVE_EVENTS'
  | 'SEND_ACK'
  | 'SEND_NACK'
  | 'REQUEST_CONTINUITY'
  | 'REQUEST_RECONNECT'
  | 'OBSERVE_STATUS'
  | 'REQUEST_PROTOCOL_INFO';

export type ForbiddenRemoteCapability =
  | 'EXECUTE_TOOL'
  | 'MUTATE_BRAIN'
  | 'BYPASS_PDP'
  | 'BYPASS_APPROVAL'
  | 'MUTATE_COMMIT'
  | 'FORCE_RECOVERY'
  | 'CHANGE_GOVERNANCE';

export type RemoteCapability = AllowedRemoteCapability | ForbiddenRemoteCapability;

export const ALL_ALLOWED_CAPABILITIES: ReadonlySet<AllowedRemoteCapability> = Object.freeze(
  new Set<AllowedRemoteCapability>([
    'RECEIVE_EVENTS',
    'SEND_ACK',
    'SEND_NACK',
    'REQUEST_CONTINUITY',
    'REQUEST_RECONNECT',
    'OBSERVE_STATUS',
    'REQUEST_PROTOCOL_INFO',
  ]),
);

export const ALL_FORBIDDEN_CAPABILITIES: ReadonlySet<ForbiddenRemoteCapability> = Object.freeze(
  new Set<ForbiddenRemoteCapability>([
    'EXECUTE_TOOL',
    'MUTATE_BRAIN',
    'BYPASS_PDP',
    'BYPASS_APPROVAL',
    'MUTATE_COMMIT',
    'FORCE_RECOVERY',
    'CHANGE_GOVERNANCE',
  ]),
);

/**
 * EN: 6-tuple multi-tenant scoped remote identity parameters.
 * VI: Các tham số định danh từ xa theo phạm vi bộ 6 đa người dùng.
 */
export interface ScopedRemoteIdentity {
  readonly userId: string;
  readonly sessionId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly transportId: string;
  readonly gatewayId: string;
}

/**
 * EN: Handshake request parameters sent by remote peer.
 * VI: Tham số yêu cầu bắt tay được gửi bởi máy khách từ xa.
 */
export interface RemoteHandshake {
  readonly handshakeId: string;
  readonly gatewayId: string;
  readonly peerId: string;
  readonly scope: ScopedRemoteIdentity;
  readonly protocolVersion: string;
  readonly requestedCapabilities: readonly RemoteCapability[];
  readonly riskLevel: PlanRiskLevel;
  readonly authToken?: string;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly continuityMetadata?: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Result of handshake negotiation between remote gateway and peer.
 * VI: Kết quả đàm phán bắt tay giữa gateway từ xa và máy khách.
 */
export interface RemoteHandshakeResult {
  readonly handshakeId: string;
  readonly success: boolean;
  readonly remoteSessionId?: string;
  readonly negotiatedProtocolVersion?: string;
  readonly grantedCapabilities?: readonly AllowedRemoteCapability[];
  readonly failureCode?: RemoteFailureCode;
  readonly failureReason?: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Remote session identity record.
 * VI: Bản ghi định danh phiên làm việc từ xa.
 */
export interface RemoteSessionIdentity {
  readonly remoteSessionId: string;
  readonly gatewayId: string;
  readonly peerId: string;
  readonly scopeKey: string;
  readonly fingerprint: string;
}

/**
 * EN: Remote authorization context.
 * VI: Ngữ cảnh phân quyền từ xa.
 */
export interface RemoteAuthorizationContext {
  readonly authContextId: string;
  readonly peerId: string;
  readonly remoteSessionId: string;
  readonly scopeKey: string;
  readonly isAuthorized: boolean;
  readonly authorizedCapabilities: readonly AllowedRemoteCapability[];
  readonly riskLevel: PlanRiskLevel;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Remote protocol request message.
 * VI: Thông điệp yêu cầu theo giao thức từ xa.
 */
export interface RemoteRequest {
  readonly requestId: string;
  readonly remoteSessionId: string;
  readonly sequence: number;
  readonly action: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly riskLevel?: PlanRiskLevel;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Remote protocol response message.
 * VI: Thông điệp phản hồi theo giao thức từ xa.
 */
export interface RemoteResponse {
  readonly responseId: string;
  readonly requestId: string;
  readonly remoteSessionId: string;
  readonly status: 'SUCCESS' | 'FAILURE' | 'REJECTED' | 'RATE_LIMITED';
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly error?: string;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Generic protocol message wrapper.
 * VI: Phong bì bao gói thông điệp giao thức chung.
 */
export interface RemoteProtocolMessage {
  readonly messageId: string;
  readonly remoteSessionId: string;
  readonly protocolVersion: string;
  readonly messageCategory: 'HANDSHAKE' | 'REQUEST' | 'RESPONSE' | 'HEARTBEAT' | 'DISCONNECT' | 'RECONNECT';
  readonly sequence: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly fingerprint: string;
}

/**
 * EN: Typed failure codes for remote gateway operations.
 * VI: Mã lỗi định kiểu cho các hoạt động của cổng từ xa.
 */
export type RemoteFailureCode =
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'PROTOCOL_MISMATCH'
  | 'PROTOCOL_INVALID'
  | 'SESSION_INVALID'
  | 'SESSION_EXPIRED'
  | 'SESSION_SCOPE_MISMATCH'
  | 'REPLAY_DETECTED'
  | 'MUTATED_REPLAY'
  | 'SEQUENCE_INVALID'
  | 'SEQUENCE_GAP'
  | 'STALE_SEQUENCE'
  | 'CAPABILITY_DENIED'
  | 'CAPABILITY_ESCALATION'
  | 'SCOPE_MISMATCH'
  | 'RISK_DOWNGRADE'
  | 'PAYLOAD_TOO_LARGE'
  | 'NESTING_TOO_DEEP'
  | 'RATE_LIMITED'
  | 'GATEWAY_UNAVAILABLE'
  | 'HANDSHAKE_REJECTED'
  | 'PEER_REJECTED'
  | 'MALFORMED_MESSAGE'
  | 'SECRET_DETECTED';

/**
 * EN: Remote gateway contract interface.
 * VI: Giao diện hợp đồng cổng từ xa.
 */
export interface RemoteGatewayContract {
  readonly gatewayId: string;
  registerPeer(peer: RemotePeerIdentity): Promise<{ success: boolean; error?: string }>;
  handleHandshake(handshake: RemoteHandshake): Promise<RemoteHandshakeResult>;
  handleRequest(request: RemoteRequest): Promise<RemoteResponse>;
}
