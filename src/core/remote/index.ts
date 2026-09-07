// src/core/remote/index.ts
// BOWCON V4.0 — MILESTONE 1.3.20: SECURE REMOTE GATEWAY BARREL EXPORTS

export * from './remoteTypes.js';
export * from './remoteStates.js';
export * from './remoteTransitions.js';
export {
  computeGatewayFingerprint,
  computePeerFingerprint,
  computeHandshakeFingerprint,
  computeRemoteSessionFingerprint,
  computeRemoteAuthFingerprint,
  computeRemoteRequestFingerprint,
  computeRemoteResponseFingerprint,
  computeRemoteAuditFingerprint,
} from './remoteFingerprint.js';
export {
  MAX_REMOTE_PAYLOAD_BYTES,
  MAX_REMOTE_METADATA_DEPTH,
  MAX_REMOTE_CORRELATION_LENGTH,
  MAX_REMOTE_QUEUE_DEPTH,
  validateRemoteIdentifier,
  validateRemoteScope,
  containsRemoteSecret,
  redactRemoteSecrets,
  validateRemoteMetadataDepth,
  validateRemotePayloadBounds,
  assertRemoteRiskPreservation,
} from './remoteValidator.js';
export * from './remoteIdentity.js';
export * from './remoteProtocol.js';
export * from './remoteHandshake.js';
export * from './remoteAuthentication.js';
export * from './remoteAuthorization.js';
export * from './remoteCapabilities.js';
export * from './remoteSession.js';
export * from './remoteReplay.js';
export * from './remoteSequence.js';
export * from './remoteRateLimit.js';
export * from './remoteGateway.js';
export * from './remoteFailure.js';
export * from './remoteAudit.js';
export * from './remoteResult.js';
