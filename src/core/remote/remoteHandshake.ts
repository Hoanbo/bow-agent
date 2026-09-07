// src/core/remote/remoteHandshake.ts
// BOWCON V4.0 — MILESTONE 1.3.20: PURE-DATA HANDSHAKE NEGOTIATION
//
// EN:
// Authoritative remote handshake construction and validation.
// Pure data negotiation: zero tool execution, zero PDP calls, zero cognitive mutation,
// zero network invocation. Fails closed on version mismatch or forbidden capabilities.
//
// VI:
// Khởi tạo và xác thực bắt tay từ xa có thẩm quyền.
// Đàm phán thuần dữ liệu: không thực thi công cụ, không gọi PDP, không biến đổi nhận thức,
// không gọi mạng. Thất bại đóng an toàn khi sai phiên bản hoặc yêu cầu quyền năng bị cấm.

import type {
  RemoteHandshake,
  RemoteHandshakeResult,
  RemoteGatewayIdentity,
  ScopedRemoteIdentity,
  RemoteCapability,
  AllowedRemoteCapability,
  PlanRiskLevel,
} from './remoteTypes.js';
import {
  computeHandshakeFingerprint,
  fnv1aHex,
} from './remoteFingerprint.js';
import {
  validateRemoteScope,
  validateRemoteIdentifier,
  validateRemotePayloadBounds,
  deepFreeze,
  redactRemoteSecrets,
} from './remoteValidator.js';
import { isProtocolVersionSupported } from './remoteProtocol.js';
import { ALL_FORBIDDEN_CAPABILITIES, ALL_ALLOWED_CAPABILITIES } from './remoteTypes.js';
import { createRemoteSessionIdentity } from './remoteIdentity.js';

export interface CreateRemoteHandshakeParams {
  readonly gatewayId: string;
  readonly peerId: string;
  readonly scope: ScopedRemoteIdentity;
  readonly protocolVersion: string;
  readonly requestedCapabilities: readonly RemoteCapability[];
  readonly riskLevel: PlanRiskLevel;
  readonly authToken?: string;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly continuityMetadata?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
}

/**
 * EN: Creates an immutable, validated RemoteHandshake request.
 * VI: Khởi tạo một yêu cầu RemoteHandshake bất biến, đã được xác thực.
 */
export function createRemoteHandshake(
  params: CreateRemoteHandshakeParams,
): Readonly<RemoteHandshake> {
  const validScope = validateRemoteScope(params.scope);
  const gatewayId = validateRemoteIdentifier('gatewayId', params.gatewayId);
  const peerId = validateRemoteIdentifier('peerId', params.peerId);
  const protocolVersion = validateRemoteIdentifier('protocolVersion', params.protocolVersion);

  if (params.governanceMetadata) {
    validateRemotePayloadBounds(params.governanceMetadata);
  }
  if (params.continuityMetadata) {
    validateRemotePayloadBounds(params.continuityMetadata);
  }

  const ts = params.timestamp ?? 0;
  const fp = computeHandshakeFingerprint({
    gatewayId,
    peerId,
    scopeKey: validScope.scopeKey,
    protocolVersion,
    requestedCapabilities: params.requestedCapabilities,
    riskLevel: params.riskLevel,
  });

  const handshake: RemoteHandshake = {
    handshakeId: `hnd_${fp}`,
    gatewayId,
    peerId,
    scope: {
      userId: validScope.userId,
      sessionId: validScope.sessionId,
      brainId: validScope.brainId,
      surfaceId: validScope.surfaceId,
      transportId: validScope.transportId,
      gatewayId: validScope.gatewayId,
    },
    protocolVersion,
    requestedCapabilities: Object.freeze([...params.requestedCapabilities]),
    riskLevel: params.riskLevel,
    authToken: params.authToken ? redactRemoteSecrets(params.authToken) : undefined,
    governanceMetadata: params.governanceMetadata ? deepFreeze(params.governanceMetadata) : undefined,
    continuityMetadata: params.continuityMetadata ? deepFreeze(params.continuityMetadata) : undefined,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(handshake);
}

/**
 * EN: Evaluates a handshake against gateway identity and security policies.
 * Strictly rejects any forbidden cognitive/execution capabilities.
 *
 * VI: Đánh giá bắt tay so với danh tính cổng và chính sách bảo mật.
 * Nghiêm ngặt từ chối mọi quyền năng nhận thức/thực thi bị cấm.
 */
export function evaluateRemoteHandshake(
  handshake: Readonly<RemoteHandshake>,
  gateway: Readonly<RemoteGatewayIdentity>,
  timestamp = 0,
): Readonly<RemoteHandshakeResult> {
  // 1. Gateway ID match
  if (handshake.gatewayId !== gateway.gatewayId) {
    const reason = `Gateway identity mismatch: expected "${gateway.gatewayId}", received "${handshake.gatewayId}".`;
    const fp = fnv1aHex(`${handshake.handshakeId}::FAILED::${reason}`);
    return deepFreeze({
      handshakeId: handshake.handshakeId,
      success: false,
      failureCode: 'GATEWAY_UNAVAILABLE',
      failureReason: reason,
      timestamp,
      fingerprint: fp,
    });
  }

  // 2. Protocol version compatibility
  if (!isProtocolVersionSupported(handshake.protocolVersion)) {
    const reason = `Protocol version "${handshake.protocolVersion}" is not supported by gateway.`;
    const fp = fnv1aHex(`${handshake.handshakeId}::PROTOCOL_MISMATCH::${reason}`);
    return deepFreeze({
      handshakeId: handshake.handshakeId,
      success: false,
      failureCode: 'PROTOCOL_MISMATCH',
      failureReason: reason,
      timestamp,
      fingerprint: fp,
    });
  }

  // 3. Capability safety check: NO FORBIDDEN CAPABILITIES ALLOWED
  for (const cap of handshake.requestedCapabilities) {
    if (ALL_FORBIDDEN_CAPABILITIES.has(cap as any)) {
      const reason = `Forbidden capability requested: "${cap}". Cognitive and execution authority is strictly prohibited on remote peers.`;
      const fp = fnv1aHex(`${handshake.handshakeId}::CAPABILITY_ESCALATION::${reason}`);
      return deepFreeze({
        handshakeId: handshake.handshakeId,
        success: false,
        failureCode: 'CAPABILITY_ESCALATION',
        failureReason: reason,
        timestamp,
        fingerprint: fp,
      });
    }
  }

  // 4. Filter allowed capabilities
  const grantedCapabilities: AllowedRemoteCapability[] = [];
  for (const cap of handshake.requestedCapabilities) {
    if (ALL_ALLOWED_CAPABILITIES.has(cap as AllowedRemoteCapability)) {
      grantedCapabilities.push(cap as AllowedRemoteCapability);
    }
  }

  // 5. Generate remote session ID
  const sessionIdent = createRemoteSessionIdentity({
    gatewayId: gateway.gatewayId,
    peerId: handshake.peerId,
    scope: handshake.scope,
    initialSequence: 0,
  });
  const remoteSessionId = sessionIdent.remoteSessionId;

  const successFp = fnv1aHex(`${handshake.handshakeId}::SUCCESS::${remoteSessionId}`);

  return deepFreeze({
    handshakeId: handshake.handshakeId,
    success: true,
    remoteSessionId,
    negotiatedProtocolVersion: handshake.protocolVersion,
    grantedCapabilities: Object.freeze(grantedCapabilities),
    timestamp,
    fingerprint: successFp,
  });
}
