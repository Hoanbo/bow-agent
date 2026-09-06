// src/core/lifecycle/lifecycleCheckpoint.ts
// BOWCON V4.0 — MILESTONE 1.3.13: IMMUTABLE LIFECYCLE CHECKPOINT SNAPSHOTS
//
// EN:
// Generates immutable, deterministic lifecycle checkpoints without mutating memory.
// Enforces INV-STATE-02 (Snapshot immutability) and INV-STATE-15 (Zero side-effects).
//
// VI:
// Tạo các snapshot checkpoint vòng đời bất biến, tất định mà không làm biến đổi bộ nhớ.
// Thực thi INV-STATE-02 (Bất biến snapshot) và INV-STATE-15 (Không tác dụng phụ bên ngoài).

import type { LifecycleCheckpoint, LifecycleStage, LifecycleState } from './lifecycleTypes.js';
import { computeCheckpointFingerprint } from './lifecycleFingerprint.js';
import { validateScope, validateSafeMetadata, redactLifecycleSecrets } from './lifecycleValidator.js';

export interface CreateCheckpointParams {
  readonly userId: string;
  readonly sessionId: string;
  readonly state: LifecycleState;
  readonly stage: LifecycleStage;
  readonly sequence: number;
  readonly correlationId?: string;
  readonly decisionId?: string;
  readonly executionId?: string;
  readonly timestamp?: number;
  readonly safeMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Creates an immutable point-in-time LifecycleCheckpoint snapshot.
 * VI: Tạo một snapshot LifecycleCheckpoint bất biến tại một thời điểm.
 */
export function createLifecycleCheckpoint(params: CreateCheckpointParams): LifecycleCheckpoint {
  const {
    userId,
    sessionId,
    state,
    stage,
    sequence,
    correlationId,
    decisionId,
    executionId,
    timestamp = 0,
    safeMetadata = {},
  } = params;

  // 1. Validate User & Session Scope (INV-STATE-03)
  const scopeValidation = validateScope(userId, sessionId);
  if (!scopeValidation.valid) {
    throw new Error(scopeValidation.error);
  }

  // 2. Validate Metadata Safety (INV-STATE-04, Prototype pollution, path safety)
  const metaValidation = validateSafeMetadata(safeMetadata);
  if (!metaValidation.valid) {
    throw new Error(metaValidation.error);
  }

  const fingerprint = computeCheckpointFingerprint(userId, sessionId, state, sequence, correlationId);

  // Defensive copy & secret scrubbing of metadata
  const sanitizedMetadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(safeMetadata)) {
    if (typeof v === 'string') {
      sanitizedMetadata[k] = redactLifecycleSecrets(v);
    } else {
      sanitizedMetadata[k] = v;
    }
  }

  return Object.freeze({
    checkpointId: `chk_${fingerprint.replace(/^checkpoint_/, '')}`,
    userId,
    sessionId,
    state,
    stage,
    sequence,
    correlationId,
    decisionId,
    executionId,
    fingerprint,
    timestamp,
    safeMetadata: Object.freeze(sanitizedMetadata),
  });
}
