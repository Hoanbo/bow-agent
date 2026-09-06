// src/core/lifecycle/lifecycleFailure.ts
// BOWCON V4.0 — MILESTONE 1.3.13: DETERMINISTIC FAILURE CLASSIFICATION
//
// EN:
// Produces immutable, sanitized failure metadata.
// Enforces INV-STATE-04 (Secret isolation) and INV-STATE-13 (Failure isolation).
//
// VI:
// Tạo metadata lỗi bất biến, đã được khử trùng.
// Thực thi INV-STATE-04 (Cô lập bí mật) và INV-STATE-13 (Cô lập sự cố).

import type { FailureCategory, FailureMetadata, LifecycleStage, LifecycleState } from './lifecycleTypes.js';
import { computeFailureFingerprint } from './lifecycleFingerprint.js';
import { redactLifecycleSecrets, validateSafeMetadata } from './lifecycleValidator.js';

export interface CreateFailureParams {
  readonly userId: string;
  readonly sessionId: string;
  readonly category: FailureCategory;
  readonly message: string;
  readonly recoverable?: boolean;
  readonly stage: LifecycleStage;
  readonly state: LifecycleState;
  readonly timestamp?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Creates an immutable, sanitized FailureMetadata descriptor.
 * VI: Tạo một bộ mô tả FailureMetadata bất biến và đã được khử trùng.
 */
export function createFailureMetadata(params: CreateFailureParams): FailureMetadata {
  const {
    userId,
    sessionId,
    category,
    message,
    recoverable = false,
    stage,
    state,
    timestamp = 0,
    details = {},
  } = params;

  // Validate details metadata safety
  const metaValidation = validateSafeMetadata(details);
  if (!metaValidation.valid) {
    throw new Error(metaValidation.error);
  }

  const sanitizedMessage = redactLifecycleSecrets(message || 'Unknown failure occurred.');
  const fingerprint = computeFailureFingerprint(userId, sessionId, category, stage, state);

  const sanitizedDetails: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (typeof v === 'string') {
      sanitizedDetails[k] = redactLifecycleSecrets(v);
    } else {
      sanitizedDetails[k] = v;
    }
  }

  return Object.freeze({
    category,
    message: sanitizedMessage,
    recoverable: Boolean(recoverable),
    stage,
    state,
    fingerprint,
    timestamp,
    details: Object.freeze(sanitizedDetails),
  });
}
