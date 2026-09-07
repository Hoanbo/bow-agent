// src/core/transport/index.ts
// BOWCON V4.0 — MILESTONE 1.3.19: BRAIN TRANSPORT SUBSYSTEM BARREL EXPORTS

export * from './transportTypes.js';
export * from './transportStates.js';
export * from './transportTransitions.js';
export {
  computeMessageFingerprint,
  computeConnectionFingerprint,
  computeSessionFingerprint,
  computeAckFingerprint,
  computeHeartbeatFingerprint,
  computeResumeFingerprint,
  computeTransportCheckpointFingerprint,
} from './transportFingerprint.js';
export {
  MAX_TRANSPORT_MESSAGE_BYTES,
  MAX_METADATA_DEPTH,
  MAX_CORRELATION_LENGTH,
  MAX_QUEUE_DEPTH,
  validateTransportIdentifier,
  validateTransportScope,
  containsTransportSecret,
  redactTransportSecrets,
  validateMetadataDepth,
  validateMessageResourceBounds,
  assertTransportRiskPreservation,
  assertTransportSequenceMonotonicity,
} from './transportValidator.js';
export * from './transportEnvelope.js';
export * from './transportIdentity.js';
export * from './transportConnection.js';
export * from './transportSession.js';
export * from './transportOrdering.js';
export * from './transportReplay.js';
export * from './transportDelivery.js';
export * from './transportAck.js';
export * from './transportHeartbeat.js';
export * from './transportReconnect.js';
export * from './transportBackpressure.js';
export * from './transportFailure.js';
export * from './transportCheckpoint.js';
export * from './transportResult.js';
export * from './transportService.js';
