// src/core/synchronization/eventEnvelope.ts
// BOWCON V4.0 — MILESTONE 1.3.18: BRAIN EVENT ENVELOPE FACTORY
//
// EN:
// Canonical factory for immutable BrainEvent envelopes with deep recursive freezing,
// scope validation, secret screening, and deterministic fingerprinting.
//
// VI:
// Nhà máy chuẩn mực cho các phong bì BrainEvent bất biến với đóng băng đệ quy sâu,
// kiểm tra phạm vi, quét lọc bí mật và sinh fingerprint tất định.

import type { BrainEvent, CreateBrainEventParams } from './eventTypes.js';
import { ALL_BRAIN_EVENT_TYPES, ALL_EVENT_SOURCES } from './eventTypes.js';
import {
  validateSyncScope,
  validateEventIdentifier,
  containsEventSecret,
} from './eventValidator.js';
import {
  computeEventFingerprint,
  computeEventIdentity,
} from './eventFingerprint.js';

/**
 * EN: Deeply freezes an object, its nested objects, and arrays.
 * VI: Đóng băng sâu một đối tượng, các đối tượng lồng nhau và mảng.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
      if (!Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
  }
  return obj;
}

/**
 * EN: Creates an authoritative, deeply immutable BrainEvent envelope.
 * VI: Tạo một phong bì BrainEvent có thẩm quyền, bất biến sâu.
 */
export function createBrainEventEnvelope(params: CreateBrainEventParams): BrainEvent {
  // 1. Validate scope
  const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);

  // 1b. Validate eventType and source
  if (!ALL_BRAIN_EVENT_TYPES.has(params.eventType)) {
    throw new Error(`[SYNCHRONIZATION_ENVELOPE_ERROR] Invalid eventType: "${params.eventType}".`);
  }
  if (!ALL_EVENT_SOURCES.has(params.source)) {
    throw new Error(`[SYNCHRONIZATION_ENVELOPE_ERROR] Invalid source: "${params.source}".`);
  }

  // 2. Validate correlation and causation identifiers
  const correlationId = validateEventIdentifier('correlationId', params.correlationId);
  const causationId = validateEventIdentifier('causationId', params.causationId);

  // 3. Validate sequence
  if (
    typeof params.sequence !== 'number' ||
    isNaN(params.sequence) ||
    !Number.isInteger(params.sequence) ||
    params.sequence <= 0
  ) {
    throw new Error(
      `[SYNCHRONIZATION_ENVELOPE_ERROR] Invalid sequence ${params.sequence}. Sequence must be a positive integer.`,
    );
  }

  const previousSequence =
    params.previousSequence !== undefined
      ? params.previousSequence
      : params.sequence > 1
        ? params.sequence - 1
        : 0;

  if (
    typeof previousSequence !== 'number' ||
    isNaN(previousSequence) ||
    !Number.isInteger(previousSequence) ||
    previousSequence < 0
  ) {
    throw new Error(
      `[SYNCHRONIZATION_ENVELOPE_ERROR] Invalid previousSequence ${previousSequence}. Must be non-negative integer.`,
    );
  }

  if (previousSequence >= params.sequence) {
    throw new Error(
      `[SYNCHRONIZATION_ENVELOPE_ERROR] previousSequence (${previousSequence}) must be strictly less than sequence (${params.sequence}).`,
    );
  }

  // 4. Validate target surface ID if provided
  let targetSurfaceId: string | undefined;
  if (params.targetSurfaceId !== undefined) {
    targetSurfaceId = validateEventIdentifier('targetSurfaceId', params.targetSurfaceId);
  }

  // 5. Check for secrets in identifiers
  if (containsEventSecret(correlationId) || containsEventSecret(causationId)) {
    throw new Error(
      '[SYNCHRONIZATION_SECURITY_ERROR] Event correlation or causation identifier contains sensitive credentials.',
    );
  }

  // 6. Defensive payload copy
  const payload = params.payload ? { ...params.payload } : {};
  const governanceMetadata = params.governanceMetadata
    ? { ...params.governanceMetadata }
    : undefined;

  // 7. Compute deterministic fingerprint and eventId
  const fpParams = {
    brainId: scope.brainId,
    userId: scope.userId,
    sessionId: scope.sessionId,
    sequence: params.sequence,
    previousSequence,
    eventType: params.eventType,
    correlationId,
    causationId,
    source: params.source,
    payload,
    riskLevel: params.riskLevel,
    targetSurfaceId,
  };

  const fingerprint = computeEventFingerprint(fpParams);
  const eventId = computeEventIdentity(fpParams);

  const event: BrainEvent = {
    brainId: scope.brainId,
    userId: scope.userId,
    sessionId: scope.sessionId,
    eventId,
    eventType: params.eventType,
    sequence: params.sequence,
    previousSequence,
    correlationId,
    causationId,
    source: params.source,
    targetSurfaceId,
    lifecycleState: params.lifecycleState,
    riskLevel: params.riskLevel,
    governanceMetadata,
    payload,
    timestamp: params.timestamp ?? 0,
    fingerprint,
  };

  return deepFreeze(event);
}
