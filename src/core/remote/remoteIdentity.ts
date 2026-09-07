// src/core/remote/remoteIdentity.ts
// BOWCON V4.0 — MILESTONE 1.3.20: DETERMINISTIC REMOTE IDENTITY FACTORIES
//
// EN:
// Deterministic identity generation for Remote Gateway, Remote Peer, and Remote Session.
// Zero randomness, zero timestamps in primary identity.
//
// VI:
// Khởi tạo định danh tất định cho Cổng từ xa, Máy khách từ xa và Phiên từ xa.
// Không ngẫu nhiên, không dùng timestamp trong định danh chính.

import type {
  RemoteGatewayIdentity,
  RemotePeerIdentity,
  RemoteSessionIdentity,
  ScopedRemoteIdentity,
} from './remoteTypes.js';
import {
  computeGatewayFingerprint,
  computePeerFingerprint,
  computeRemoteSessionFingerprint,
} from './remoteFingerprint.js';
import {
  validateRemoteIdentifier,
  validateRemoteScope,
  deepFreeze,
} from './remoteValidator.js';

/**
 * EN: Constructs a deterministic RemoteGatewayIdentity.
 * VI: Khởi tạo một RemoteGatewayIdentity tất định.
 */
export function createRemoteGatewayIdentity(params: {
  readonly name: string;
  readonly version: string;
  readonly supportedProtocols: readonly string[];
}): Readonly<RemoteGatewayIdentity> {
  const name = validateRemoteIdentifier('name', params.name);
  const version = validateRemoteIdentifier('version', params.version);
  const protocols = Object.freeze([...params.supportedProtocols]);

  const fp = computeGatewayFingerprint({
    name,
    version,
    supportedProtocols: protocols,
  });

  const identity: RemoteGatewayIdentity = {
    gatewayId: `gw_${fp}`,
    name,
    version,
    supportedProtocols: protocols,
    fingerprint: fp,
  };

  return deepFreeze(identity);
}

/**
 * EN: Constructs a deterministic RemotePeerIdentity.
 * VI: Khởi tạo một RemotePeerIdentity tất định.
 */
export function createRemotePeerIdentity(params: {
  readonly surfaceId: string;
  readonly surfaceType: 'MOBILE' | 'ROBOT' | 'DESKTOP' | 'WEB' | 'VOICE' | 'GENERIC';
  readonly clientVersion: string;
}): Readonly<RemotePeerIdentity> {
  const surfaceId = validateRemoteIdentifier('surfaceId', params.surfaceId);
  const clientVersion = validateRemoteIdentifier('clientVersion', params.clientVersion);

  const fp = computePeerFingerprint({
    surfaceId,
    surfaceType: params.surfaceType,
    clientVersion,
  });

  const identity: RemotePeerIdentity = {
    peerId: `peer_${fp}`,
    surfaceId,
    surfaceType: params.surfaceType,
    clientVersion,
    fingerprint: fp,
  };

  return deepFreeze(identity);
}

/**
 * EN: Constructs a deterministic RemoteSessionIdentity.
 * VI: Khởi tạo một RemoteSessionIdentity tất định.
 */
export function createRemoteSessionIdentity(params: {
  readonly gatewayId: string;
  readonly peerId: string;
  readonly scope: ScopedRemoteIdentity;
  readonly initialSequence?: number;
}): Readonly<RemoteSessionIdentity> {
  const validScope = validateRemoteScope(params.scope);
  const gatewayId = validateRemoteIdentifier('gatewayId', params.gatewayId);
  const peerId = validateRemoteIdentifier('peerId', params.peerId);

  const fp = computeRemoteSessionFingerprint({
    gatewayId,
    peerId,
    scopeKey: validScope.scopeKey,
    initialSequence: params.initialSequence ?? 0,
  });

  const identity: RemoteSessionIdentity = {
    remoteSessionId: `rsess_${fp}`,
    gatewayId,
    peerId,
    scopeKey: validScope.scopeKey,
    fingerprint: fp,
  };

  return deepFreeze(identity);
}

/**
 * EN: Asserts that an incoming scope key strictly matches the expected scope key. Fails closed.
 * VI: Khẳng định khóa phạm vi đến phải khớp chính xác với khóa phạm vi dự kiến. Thất bại đóng an toàn.
 */
export function assertRemoteScopeMatches(
  expectedScopeKey: string,
  actualScopeKey: string,
): void {
  if (expectedScopeKey !== actualScopeKey) {
    throw new Error(
      `[REMOTE_SCOPE_ERROR] Scope mismatch! Expected "${expectedScopeKey}", but received "${actualScopeKey}".`,
    );
  }
}
