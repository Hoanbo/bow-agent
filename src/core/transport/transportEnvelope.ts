// src/core/transport/transportEnvelope.ts
// BOWCON V4.0 — MILESTONE 1.3.19: CANONICAL MESSAGE ENVELOPE FACTORY
//
// EN:
// Canonical immutable BrainTransportMessage envelope construction,
// validation, defensive cloning, deterministic fingerprint calculation, and deep freezing.
//
// VI:
// Khởi tạo phong bì BrainTransportMessage bất biến chuẩn mực,
// xác thực, nhân bản phòng thủ, tính toán fingerprint tất định, và đóng băng sâu.

import type {
  BrainTransportMessage,
  CreateTransportMessageParams,
} from './transportTypes.js';
import {
  ALL_TRANSPORT_MESSAGE_TYPES,
  ALL_TRANSPORT_DIRECTIONS,
} from './transportTypes.js';
import {
  validateTransportScope,
  validateTransportIdentifier,
  validateMessageResourceBounds,
  deepFreeze,
} from './transportValidator.js';
import { computeMessageFingerprint } from './transportFingerprint.js';

/**
 * EN: Constructs a deeply immutable, validated BrainTransportMessage envelope.
 * VI: Khởi tạo một phong bì BrainTransportMessage được xác thực và bất biến sâu.
 */
export function createTransportMessageEnvelope(
  params: CreateTransportMessageParams,
): Readonly<BrainTransportMessage> {
  // 1. Validate multi-tenant 5-tuple scope
  const scope = validateTransportScope({
    userId: params.userId,
    sessionId: params.sessionId,
    brainId: params.brainId,
    surfaceId: params.surfaceId,
    transportId: params.transportId,
  });

  // 2. Validate connectionId
  const connectionId = validateTransportIdentifier('connectionId', params.connectionId);

  // 3. Validate correlation & causation identifiers
  const correlationId = validateTransportIdentifier('correlationId', params.correlationId);
  const causationId = validateTransportIdentifier('causationId', params.causationId);
  const eventId = params.eventId
    ? validateTransportIdentifier('eventId', params.eventId)
    : undefined;

  // 4. Validate message taxonomy and direction
  if (!ALL_TRANSPORT_MESSAGE_TYPES.has(params.messageType)) {
    throw new Error(
      `[TRANSPORT_VALIDATION_ERROR] Unsupported message type: "${String(params.messageType)}".`,
    );
  }
  if (!ALL_TRANSPORT_DIRECTIONS.has(params.direction)) {
    throw new Error(
      `[TRANSPORT_VALIDATION_ERROR] Unsupported transport direction: "${String(params.direction)}".`,
    );
  }

  // 5. Validate sequence
  if (
    typeof params.sequence !== 'number' ||
    isNaN(params.sequence) ||
    !Number.isInteger(params.sequence) ||
    params.sequence <= 0
  ) {
    throw new Error(
      `[TRANSPORT_SEQUENCE_ERROR] Message sequence must be a positive integer, got: ${params.sequence}.`,
    );
  }

  // 6. Validate payload resource boundaries
  validateMessageResourceBounds(params.payload);
  if (params.governanceMetadata) {
    validateMessageResourceBounds(params.governanceMetadata);
  }
  if (params.lifecycleMetadata) {
    validateMessageResourceBounds(params.lifecycleMetadata);
  }

  // 7. Clone payload and metadata defensively
  const safePayload: Record<string, unknown> = params.payload
    ? JSON.parse(JSON.stringify(params.payload))
    : {};
  const safeGov: Record<string, unknown> | undefined = params.governanceMetadata
    ? JSON.parse(JSON.stringify(params.governanceMetadata))
    : undefined;
  const safeLife: Record<string, unknown> | undefined = params.lifecycleMetadata
    ? JSON.parse(JSON.stringify(params.lifecycleMetadata))
    : undefined;

  // 8. Deterministic fingerprint
  const fingerprint = computeMessageFingerprint({
    brainId: scope.brainId,
    userId: scope.userId,
    sessionId: scope.sessionId,
    surfaceId: scope.surfaceId,
    transportId: scope.transportId,
    connectionId,
    correlationId,
    causationId,
    eventId,
    messageType: params.messageType,
    direction: params.direction,
    sequence: params.sequence,
    payload: safePayload,
  });

  const messageId = `msg_${fingerprint}`;

  // 9. Assemble envelope
  const envelope: BrainTransportMessage = {
    messageId,
    brainId: scope.brainId,
    userId: scope.userId,
    sessionId: scope.sessionId,
    surfaceId: scope.surfaceId,
    transportId: scope.transportId,
    connectionId,
    correlationId,
    causationId,
    eventId,
    messageType: params.messageType,
    direction: params.direction,
    sequence: params.sequence,
    payload: safePayload,
    riskLevel: params.riskLevel,
    governanceMetadata: safeGov,
    lifecycleMetadata: safeLife,
    timestamp: params.timestamp ?? 0,
    fingerprint,
  };

  return deepFreeze(envelope);
}
